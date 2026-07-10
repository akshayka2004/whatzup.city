import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CategoryRepository } from '../../common/database/repositories/category.repository';
import { RedisService } from '../../common/redis/redis.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly redis: RedisService,
    private readonly tenantResolver: TenantResolverService,
    private readonly db: DatabaseService,
  ) {}

  async findAll(tenantId: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const cached = await this.redis.get(`categories:${tenantId}`);
    if (cached) return cached;

    const categories = await this.categoryRepo.findHierarchical(tenantId);
    const enriched = await this.attachListingCounts(categories);

    await this.redis.set(`categories:${tenantId}`, enriched, 3600);
    return enriched;
  }

  /**
   * Attach `listingsCount` — the number of live businesses in each category,
   * aggregated by category SLUG across ALL tenants. Categories are cloned
   * per-tenant at signup (same slug, different id) and each business lives in
   * its own tenant, so a per-id/per-tenant `_count` on the default-tenant
   * categories would miss almost every registered business (showing 0).
   */
  private async attachListingCounts(categories: any[]): Promise<any[]> {
    const [grouped, allCats] = await Promise.all([
      this.db.business.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.db.category.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } }),
    ]);

    const idToSlug = new Map<string, string>(allCats.map((c: any) => [c.id, c.slug]));
    const slugCount = new Map<string, number>();
    for (const g of grouped as any[]) {
      const slug = g.categoryId ? idToSlug.get(g.categoryId) : undefined;
      if (!slug) continue;
      slugCount.set(slug, (slugCount.get(slug) || 0) + (g._count?._all || 0));
    }

    const walk = (nodes: any[]): any[] =>
      nodes.map((n) => ({
        ...n,
        listingsCount: slugCount.get(n.slug) || 0,
        children: Array.isArray(n.children) ? walk(n.children) : n.children,
      }));
    return walk(categories);
  }

  private pick(data: any) {
    const out: any = {};
    for (const k of ['name', 'slug', 'description', 'icon', 'parentId', 'sortOrder', 'isActive']) {
      if (data[k] !== undefined) out[k] = k === 'sortOrder' ? Number(data[k]) || 0 : data[k];
    }
    return out;
  }

  async create(tenantId: string, data: any) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.categoryRepo.findBySlug(tenantId, data.slug);
    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    const cat = await this.categoryRepo.create(tenantId, this.pick(data));
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

    const cat = await this.categoryRepo.update(tenantId, id, this.pick(data));
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
