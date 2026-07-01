import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BusinessRepository } from '../../common/database/repositories/business.repository';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { SearchService } from '../search/search.service';
import { AuditService } from '../audit/audit.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { BusinessStatus } from '@saas/types';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';
import { PaginatedResult } from '../../common/database/pagination';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly businessRepo: BusinessRepository,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly searchService: SearchService,
    private readonly auditService: AuditService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  async create(tenantId: string, ownerId: string, data: any) {
    const slug = this.generateSlug(data.name);
    const business = await this.businessRepo.create(tenantId, {
      ownerId,
      slug,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      email: data.email,
      website: data.website,
      operatingHours: data.operatingHours,
      status: BusinessStatus.PENDING_VERIFICATION,
    });

    await this.searchService.indexBusiness(business.id, tenantId);

    await this.auditService.log({
      tenantId,
      userId: ownerId,
      action: 'CREATE_BUSINESS',
      resource: 'BUSINESS',
      resourceId: business.id,
      newData: business,
    });

    return business;
  }

  async findAll(tenantId: string, params: any, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const { page, limit, categoryId, city, status, search } = params;

    // Fall back to Postgres full-text search abstraction
    if (search) {
      return this.searchService.searchBusinesses(
        tenantId,
        search,
        { categoryId, city },
        page,
        limit,
        isPublic,
      );
    }

    const criteria: any = {};
    if (categoryId) criteria.categoryId = categoryId;
    if (city) criteria.city = { contains: city, mode: 'insensitive' };
    if (status) criteria.status = status;

    const limitVal = limit || 20;
    const pageVal = page || 1;
    const skipVal = (pageVal - 1) * limitVal;

    const where = isPublic 
      ? { ...criteria, deletedAt: null }
      : { ...criteria, tenantId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.businessRepo.model.findMany({
        where,
        skip: skipVal,
        take: limitVal,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.businessRepo.model.count({ where }),
    ]);

    const result = PaginatedResult.create(data, total, pageVal, limitVal);

    if (isPublic && result?.data) {
      result.data = result.data.map((biz: any) => {
        const copy = { ...biz };
        delete copy.ownerName;
        delete copy.ownerId;
        return copy;
      });
    }

    return result;
  }

  async findById(tenantId: string, id: string, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return this.findBySlug(tenantId, id, isPublic);
    }

    const cached = await this.redis.get(`business:${id}`);
    if (cached) {
      if (isPublic) {
        const copy = { ...cached } as any;
        delete copy.ownerName;
        delete copy.ownerId;
        return copy;
      }
      return cached;
    }

    const business = isPublic
      ? await this.businessRepo.model.findFirst({
          where: { id, deletedAt: null },
          include: {
            category: true,
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        })
      : await this.businessRepo.findOne(tenantId, id, {
          include: {
            category: true,
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        });

    if (!business) throw new NotFoundException('Business not found');

    await this.redis.set(`business:${id}`, business, 300);

    if (isPublic) {
      const copy = { ...business };
      delete copy.ownerName;
      delete copy.ownerId;
      return copy;
    }
    return business;
  }

  async findBySlug(tenantId: string, slug: string, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const business = isPublic
      ? await this.businessRepo.model.findFirst({
          where: { slug, deletedAt: null },
          include: {
            category: true,
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        })
      : await this.businessRepo.findBySlug(tenantId, slug, {
          include: {
            category: true,
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        });
    if (!business) throw new NotFoundException('Business not found');

    if (isPublic) {
      const copy = { ...business };
      delete copy.ownerName;
      delete copy.ownerId;
      return copy;
    }
    return business;
  }

  async update(tenantId: string, id: string, ownerId: string, data: any) {
    const business = await this.businessRepo.findOne(tenantId, id);
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== ownerId) throw new ForbiddenException('Not authorized');

    const updated = await this.businessRepo.update(tenantId, id, data);

    await this.redis.del(`business:${id}`);

    await this.auditService.log({
      tenantId,
      userId: ownerId,
      action: 'UPDATE_BUSINESS',
      resource: 'BUSINESS',
      resourceId: id,
      oldData: business,
      newData: updated,
    });

    await this.searchService.indexBusiness(updated.id, tenantId);

    return updated;
  }

  async updateStatus(tenantId: string, id: string, status: BusinessStatus, adminId: string) {
    const updated = await this.businessRepo.updateStatus(tenantId, id, status);
    await this.redis.del(`business:${id}`);

    await this.auditService.log({
      tenantId,
      userId: adminId,
      action: 'UPDATE_BUSINESS_STATUS',
      resource: 'BUSINESS',
      resourceId: id,
      newData: { status },
    });

    await this.searchService.indexBusiness(updated.id, tenantId);

    return updated;
  }

  // Super-admin: list every business across all tenants (any status).
  async adminFindAll(page = 1, limit = 25, search?: string) {
    const pageVal = Math.max(1, Number(page) || 1);
    const limitVal = Math.min(Number(limit) || 25, 100);
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.businessRepo.model.findMany({
        where,
        skip: (pageVal - 1) * limitVal,
        take: limitVal,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.businessRepo.model.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page: pageVal,
        limit: limitVal,
        totalPages: Math.ceil(total / limitVal),
        hasNext: pageVal * limitVal < total,
        hasPrev: pageVal > 1,
      },
    };
  }

  // Super-admin: edit any business's profile (cross-tenant, whitelisted fields).
  async adminUpdate(id: string, adminId: string, data: any) {
    const business = await this.businessRepo.model.findFirst({ where: { id, deletedAt: null } });
    if (!business) throw new NotFoundException('Business not found');

    const ALLOWED = [
      'name', 'description', 'categoryId', 'ownerName', 'phone', 'email', 'website',
      'address', 'city', 'state', 'zipCode', 'district', 'googleMapsUrl', 'socialLinks',
      'tags', 'logo', 'coverImage', 'status', 'isVerified', 'halalStatus',
    ];
    const payload: any = {};
    for (const k of ALLOWED) if (data[k] !== undefined) payload[k] = data[k];

    const updated = await this.businessRepo.model.update({ where: { id }, data: payload });
    await this.redis.del(`business:${id}`);

    await this.auditService.log({
      tenantId: business.tenantId,
      userId: adminId,
      action: 'ADMIN_UPDATE_BUSINESS',
      resource: 'BUSINESS',
      resourceId: id,
      oldData: business,
      newData: updated,
    });

    try {
      await this.searchService.indexBusiness(id, business.tenantId);
    } catch { /* non-fatal */ }

    return updated;
  }

  async getOwnerBusinesses(tenantId: string, ownerId: string) {
    return this.businessRepo.findMany(
      tenantId,
      { ownerId },
      { page: 1, limit: 100 },
      {
        include: { category: { select: { id: true, name: true } } },
      },
    );
  }

  async getNearby(tenantId: string, lat: number, lng: number, radiusKm = 10, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const where: any = isPublic
      ? {
          latitude: { gte: lat - latDelta, lte: lat + latDelta },
          longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
          deletedAt: null,
        }
      : {
          tenantId,
          latitude: { gte: lat - latDelta, lte: lat + latDelta },
          longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
          deletedAt: null,
        };

    const data = await this.businessRepo.model.findMany({
      where,
      take: 50,
      include: { category: { select: { id: true, name: true } } },
    });

    if (isPublic && data) {
      return data.map((biz: any) => {
        const copy = { ...biz };
        delete copy.ownerName;
        delete copy.ownerId;
        return copy;
      });
    }
    return data;
  }

  // ── Business Tags ─────────────────────────────────────────

  async getTags(tenantId: string, businessId: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const tags = await (this.db as any).businessTag.findMany({
      where: { tenantId, businessId },
      select: { tag: true },
      orderBy: { tag: 'asc' },
    });
    return tags.map((t: any) => t.tag);
  }

  async setTags(tenantId: string, businessId: string, ownerId: string, tags: string[]) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const business = await this.businessRepo.findOne(tenantId, businessId);
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== ownerId) throw new ForbiddenException('Not authorized');

    const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];

    // Delete all existing tags then re-insert
    await (this.db as any).businessTag.deleteMany({ where: { tenantId, businessId } });
    if (normalized.length > 0) {
      await (this.db as any).businessTag.createMany({
        data: normalized.map((tag) => ({ tenantId, businessId, tag })),
        skipDuplicates: true,
      });
    }

    await this.redis.del(`business:${businessId}`);
    return normalized;
  }

  async searchByTag(tenantId: string, tag: string, page = 1, limit = 20) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const normalized = tag.trim().toLowerCase();

    const [rows, total] = await Promise.all([
      (this.db as any).businessTag.findMany({
        where: { tenantId, tag: { contains: normalized } },
        include: {
          business: {
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.db as any).businessTag.count({
        where: { tenantId, tag: { contains: normalized } },
      }),
    ]);

    const data = rows.map((r: any) => {
      const biz = { ...r.business };
      delete biz.ownerName;
      delete biz.ownerId;
      return biz;
    });

    return PaginatedResult.create(data, total, page, limit);
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36)
    );
  }
}
