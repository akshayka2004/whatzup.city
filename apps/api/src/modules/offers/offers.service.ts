import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OfferRepository } from '../../common/database/repositories/offer.repository';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { DatabaseService } from '../../common/database/database.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';
import { PaginatedResult } from '../../common/database/pagination';

@Injectable()
export class OffersService {
  constructor(
    private readonly offerRepo: OfferRepository,
    private readonly redis: RedisService,
    private readonly auditService: AuditService,
    private readonly tenantResolver: TenantResolverService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Resolve businessId — accept either business.id OR entity.id (JWT stores
   * entity.id for business users).
   */
  private async resolveBusinessId(tenantId: string, businessOrEntityId: string): Promise<string> {
    const biz = await this.db.business.findFirst({
      where: {
        tenantId,
        OR: [{ id: businessOrEntityId }, { entityId: businessOrEntityId }],
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!biz) throw new BadRequestException('Business not found for offer');
    return biz.id;
  }

  async create(tenantId: string, userId: string, businessId: string, data: any) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const actualBusinessId = await this.resolveBusinessId(tenantId, businessId);

    // Strip unknown Prisma fields — Offer schema has no `tags`, `active`, `INACTIVE` etc.
    const now = new Date();
    const defaultEnd = new Date(Date.now() + 30 * 86_400_000);
    // Only allow valid OfferStatus enum values. 'INACTIVE' (sent by some frontends) is not valid.
    const VALID_STATUSES = new Set(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED']);
    const rawStatus = (data.status || 'ACTIVE').toString().toUpperCase();
    const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'ACTIVE';
    const payload: any = {
      title: data.title,
      description: data.description || '',
      status,
      startDate: data.startDate ? new Date(data.startDate) : now,
      endDate: data.endDate ? new Date(data.endDate) : defaultEnd,
    };
    // discountPercent is Int? — must be integer (Math.round prevents float rejection)
    if (data.discountPercent !== undefined) payload.discountPercent = Math.round(Number(data.discountPercent));
    else if (data.discountPercentage !== undefined) payload.discountPercent = Math.round(Number(data.discountPercentage));
    if (data.discountAmount !== undefined) payload.discountAmount = data.discountAmount;
    if (data.code !== undefined) payload.code = data.code;
    if (data.maxRedemptions !== undefined) payload.maxRedemptions = data.maxRedemptions;
    if (data.terms !== undefined) payload.terms = data.terms;

    const offer = await this.offerRepo.create(tenantId, { businessId: actualBusinessId, ...payload });
    await this.redis.delPattern(`offers:${tenantId}:*`);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CREATE_OFFER',
      resource: 'OFFER',
      resourceId: offer.id,
      newData: offer,
    });

    return offer;
  }

  async findActive(tenantId: string, page = 1, limit = 20, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const pagination = new PaginationParamsDto();
    pagination.page = page;
    pagination.limit = limit;
    pagination.sortBy = 'endDate';
    pagination.sortOrder = SortOrder.ASC;

    const criteria: any = {
      status: 'ACTIVE',
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    };

    if (isPublic) {
      const limitVal = limit || 20;
      const pageVal = page || 1;
      const skipVal = (pageVal - 1) * limitVal;

      const where = { ...criteria, deletedAt: null };

      const [data, total] = await Promise.all([
        this.offerRepo.model.findMany({
          where,
          skip: skipVal,
          take: limitVal,
          orderBy: { endDate: 'asc' },
          include: { business: { select: { id: true, name: true, slug: true, logo: true } } },
        }),
        this.offerRepo.model.count({ where }),
      ]);

      return PaginatedResult.create(data, total, pageVal, limitVal);
    }

    return this.offerRepo.findMany(tenantId, criteria, pagination, {
      include: { business: { select: { id: true, name: true, slug: true, logo: true } } },
    });
  }

  async findByBusiness(tenantId: string, businessId: string, isPublic = false) {
    if (isPublic) {
      // Public path: resolve business.id globally — accept entity.id OR business.id,
      // no tenantId filter needed (businessId is already globally unique UUID).
      const biz = await this.db.business.findFirst({
        where: {
          OR: [{ id: businessId }, { entityId: businessId }],
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!biz) return [];
      return this.offerRepo.model.findMany({
        where: { businessId: biz.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Authenticated (dashboard) path
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const actualBusinessId = await this.resolveBusinessId(tenantId, businessId).catch(() => businessId);
    const pagination = new PaginationParamsDto();
    pagination.page = 1;
    pagination.limit = 100;
    return this.offerRepo.findMany(tenantId, { businessId: actualBusinessId }, pagination);
  }

  async findById(tenantId: string, id: string, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const offer = isPublic
      ? await this.offerRepo.model.findFirst({
          where: { id, deletedAt: null },
          include: { business: { select: { id: true, name: true, slug: true } } },
        })
      : await this.offerRepo.findOne(tenantId, id, {
          include: { business: { select: { id: true, name: true, slug: true } } },
        });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async update(tenantId: string, id: string, userId: string, data: any) {
    const existing = await this.offerRepo.findOne(tenantId, id);
    if (!existing) throw new NotFoundException('Offer not found');

    // Strip unknown Prisma fields (e.g., `tags`, `active`) to prevent errors
    const payload: any = {};
    const VALID_STATUSES = new Set(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED']);
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.status !== undefined) {
      const s = data.status.toString().toUpperCase();
      payload.status = VALID_STATUSES.has(s) ? s : 'ACTIVE';
    }
    if (data.startDate !== undefined) payload.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) payload.endDate = new Date(data.endDate);
    if (data.discountPercent !== undefined) payload.discountPercent = Math.round(Number(data.discountPercent));
    else if (data.discountPercentage !== undefined) payload.discountPercent = Math.round(Number(data.discountPercentage));
    if (data.discountAmount !== undefined) payload.discountAmount = data.discountAmount;
    if (data.code !== undefined) payload.code = data.code;
    if (data.maxRedemptions !== undefined) payload.maxRedemptions = data.maxRedemptions;
    if (data.terms !== undefined) payload.terms = data.terms;

    const offer = await this.offerRepo.update(tenantId, id, payload);
    await this.redis.delPattern(`offers:${tenantId}:*`);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE_OFFER',
      resource: 'OFFER',
      resourceId: id,
      oldData: existing,
      newData: offer,
    });

    return offer;
  }

  async redeem(tenantId: string, id: string, userId: string) {
    const redeemed = await this.offerRepo.incrementRedemptions(tenantId, id);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'REDEEM_OFFER',
      resource: 'OFFER',
      resourceId: id,
    });

    return redeemed;
  }

  async softDelete(tenantId: string, id: string, userId: string) {
    const existing = await this.offerRepo.findOne(tenantId, id);
    if (!existing) throw new NotFoundException('Offer not found');

    await this.offerRepo.softDelete(tenantId, id);
    await this.redis.delPattern(`offers:${tenantId}:*`);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'DELETE_OFFER',
      resource: 'OFFER',
      resourceId: id,
    });
  }
}
