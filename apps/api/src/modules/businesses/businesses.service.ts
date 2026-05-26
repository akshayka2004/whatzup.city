import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BusinessRepository } from '../../common/database/repositories/business.repository';
import { RedisService } from '../../common/redis/redis.service';
import { SearchService } from '../search/search.service';
import { AuditService } from '../audit/audit.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { BusinessStatus } from '@saas/types';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly businessRepo: BusinessRepository,
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
      );
    }

    const criteria: any = {};
    if (categoryId) criteria.categoryId = categoryId;
    if (city) criteria.city = { contains: city, mode: 'insensitive' };
    if (status) criteria.status = status;

    const pagination = new PaginationParamsDto();
    pagination.page = page || 1;
    pagination.limit = limit || 20;
    pagination.sortBy = 'createdAt';
    pagination.sortOrder = SortOrder.DESC;

    const result = await this.businessRepo.findMany(tenantId, criteria, pagination, {
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

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

    const business = await this.businessRepo.findOne(tenantId, id, {
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
    const business = await this.businessRepo.findBySlug(tenantId, slug, {
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

    if (updated.status === BusinessStatus.APPROVED || updated.status === BusinessStatus.PENDING_VERIFICATION) {
      await this.searchService.indexBusiness(updated.id, tenantId);
    }

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

    if (status === BusinessStatus.APPROVED || status === BusinessStatus.PENDING_VERIFICATION) {
      await this.searchService.indexBusiness(updated.id, tenantId);
    } else {
      await this.searchService.removeFromIndex(id, tenantId);
    }

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
    const data = await this.businessRepo.findNearby(tenantId, lat, lng, radiusKm);
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
