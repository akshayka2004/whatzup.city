import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferRepository } from '../../common/database/repositories/offer.repository';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';

@Injectable()
export class OffersService {
  constructor(
    private readonly offerRepo: OfferRepository,
    private readonly redis: RedisService,
    private readonly auditService: AuditService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  async create(tenantId: string, userId: string, businessId: string, data: any) {
    const offer = await this.offerRepo.create(tenantId, { businessId, ...data });
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

  async findActive(tenantId: string, page = 1, limit = 20) {
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

    return this.offerRepo.findMany(tenantId, criteria, pagination, {
      include: { business: { select: { id: true, name: true, slug: true, logo: true } } },
    });
  }

  async findByBusiness(tenantId: string, businessId: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const pagination = new PaginationParamsDto();
    pagination.page = 1;
    pagination.limit = 100;
    return this.offerRepo.findMany(tenantId, { businessId }, pagination);
  }

  async findById(tenantId: string, id: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const offer = await this.offerRepo.findOne(tenantId, id, {
      include: { business: { select: { id: true, name: true, slug: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async update(tenantId: string, id: string, userId: string, data: any) {
    const existing = await this.offerRepo.findOne(tenantId, id);
    if (!existing) throw new NotFoundException('Offer not found');

    const offer = await this.offerRepo.update(tenantId, id, data);
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
