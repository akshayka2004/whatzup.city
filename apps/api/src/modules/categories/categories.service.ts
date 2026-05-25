import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CategoryRepository } from '../../common/database/repositories/category.repository';
import { RedisService } from '../../common/redis/redis.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly redis: RedisService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  async findAll(tenantId: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const cached = await this.redis.get(`categories:${tenantId}`);
    if (cached) return cached;

    const categories = await this.categoryRepo.findHierarchical(tenantId);

    await this.redis.set(`categories:${tenantId}`, categories, 3600);
    return categories;
  }

  async create(
    tenantId: string,
    data: { name: string; slug: string; description?: string; icon?: string; parentId?: string },
  ) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.categoryRepo.findBySlug(tenantId, data.slug);
    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    const cat = await this.categoryRepo.create(tenantId, data);
    await this.redis.del(`categories:${tenantId}`);
    return cat;
  }

  async update(id: string, tenantId: string, data: any) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.categoryRepo.findOne(tenantId, id);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (data.slug && data.slug !== existing.slug) {
      const collision = await this.categoryRepo.findBySlug(tenantId, data.slug);
      if (collision) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    const cat = await this.categoryRepo.update(tenantId, id, data);
    await this.redis.del(`categories:${tenantId}`);
    return cat;
  }

  async remove(id: string, tenantId: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.categoryRepo.findOne(tenantId, id);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    await this.categoryRepo.softDelete(tenantId, id);
    await this.redis.del(`categories:${tenantId}`);
    return { success: true };
  }
}
