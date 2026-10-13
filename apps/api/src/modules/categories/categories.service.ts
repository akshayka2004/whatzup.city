import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@saas/database';
import { RedisService } from '../../common/redis/redis.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { SearchService } from '../search/search.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  assertIcon,
  assertParent,
  assertSlug,
  assertTemplate,
  normName,
  sameName,
  slugify,
} from './category-rules';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

export interface CategoryImpact {
  /** Businesses whose primary category is this one (clones with the same slug included). */
  businesses: number;
  /** Businesses that list it as a subcategory. */
  asSubcategory: number;
  children: number;
  pendingVerification: number;
  launchOfferHolders: number;
  sample: { id: string; name: string }[];
}

type Actor = { id: string; tenantId?: string };

const CACHE_PATTERNS = ['categories:*', 'discovery:categories:*', 'trending:categories:*'];

/**
 * Super-admin management of the one master category list (the default tenant).
 *
 * Rows with the same slug in other tenants are legacy per-signup clones. Until the consolidation
 * script retires them, every read/impact/merge here treats "same slug in any tenant" as the same
 * category, so a business on a clone is never missed.
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly tenantResolver: TenantResolverService,
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly search: SearchService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── helpers ───────────────────────────────────────────────────────────

  private masterTenantId() {
    return this.tenantResolver.resolveTenantId('default');
  }

  private async getMaster(id: string) {
    const tenantId = await this.masterTenantId();
    // tenant-scope-ok: master tenant id resolved above
    const cat = await this.db.category.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  /** The master row's id plus every legacy clone of the same slug (any tenant, not deleted). */
  private async idsForSlug(slug: string): Promise<string[]> {
    // tenant-scope-ok: legacy clones are matched by slug across tenants on purpose
    const rows = await this.db.category.findMany({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async clearCaches(businessIds: string[] = []) {
    try {
      await Promise.all(CACHE_PATTERNS.map((p) => this.redis.delPattern(p)));
      for (let i = 0; i < businessIds.length; i += 50) {
        await Promise.all(
          businessIds.slice(i, i + 50).map((id) => this.redis.del(`business:${id}`)),
        );
      }
    } catch (e: any) {
      this.logger.warn(`Category cache clear failed: ${e?.message}`);
    }
  }

  /** Queue a search reindex for each business (names/categories live in the index). */
  private async reindex(businesses: { id: string; tenantId: string }[]) {
    for (const b of businesses.slice(0, 5000)) {
      try {
        await this.search.indexBusiness(b.id, b.tenantId);
      } catch {
        /* the next profile save reindexes */
      }
    }
  }

  private async businessesOn(categoryIds: string[]) {
    // tenant-scope-ok: businesses are matched by category id
    return this.db.business.findMany({
      where: { categoryId: { in: categoryIds }, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        ownerId: true,
        name: true,
        status: true,
        launchOfferClaimedAt: true,
      },
    });
  }

  private async subcategoryUsers(categoryIds: string[]) {
    return this.db.$queryRaw<{ id: string; tenant_id: string }[]>(
      Prisma.sql`SELECT id, tenant_id FROM businesses
                 WHERE deleted_at IS NULL AND subcategory_ids ?| ${categoryIds}::text[]`,
    );
  }

  // ── public read ───────────────────────────────────────────────────────

  async findAll(_tenantId?: string) {
    const tenantId = await this.masterTenantId();
    const key = `categories:${tenantId}`;
    const cached = await this.redis.get(key);
    if (cached) return cached;

    // tenant-scope-ok: master tenant only
    const roots = await this.db.category.findMany({
      where: { tenantId, parentId: null, isActive: true, deletedAt: null },
      include: {
        children: {
          where: { isActive: true, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const enriched = await this.attachListingCounts(roots);
    await this.redis.set(key, enriched, 3600);
    return enriched;
  }

  /**
   * `listingsCount` = live businesses in each category, summed by slug across all tenants so
   * legacy clones are counted until they are retired.
   */
  private async attachListingCounts(categories: any[]): Promise<any[]> {
    const [grouped, allCats] = await Promise.all([
      // tenant-scope-ok: public category listing counts across all businesses
      this.db.business.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null, status: 'APPROVED' },
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

  /** Old `?type=<slug>` links: active, archived, merged (→ target) or gone. */
  async resolveSlug(slug: string) {
    const tenantId = await this.masterTenantId();
    // tenant-scope-ok: master tenant only
    const cat = await this.db.category.findFirst({
      where: { tenantId, slug },
      include: { mergedInto: { select: { slug: true, name: true } } },
    });
    if (!cat) return { status: 'GONE' as const };
    if (cat.mergedInto) {
      return { status: 'MERGED' as const, target: cat.mergedInto };
    }
    if (cat.deletedAt) return { status: 'GONE' as const };
    if (!cat.isActive) return { status: 'ARCHIVED' as const, name: cat.name };
    return { status: 'ACTIVE' as const, slug: cat.slug, name: cat.name };
  }

  // ── admin read ────────────────────────────────────────────────────────

  /** Flat list for the admin screen, archived included, with live counts. */
  async adminList() {
    const tenantId = await this.masterTenantId();
    // tenant-scope-ok: master tenant only
    const rows = await this.db.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counted = await this.attachListingCounts(rows.map((r) => ({ ...r, children: [] })));
    const childCount = new Map<string, number>();
    for (const r of rows)
      if (r.parentId) childCount.set(r.parentId, (childCount.get(r.parentId) || 0) + 1);
    return counted.map((c: any) => ({ ...c, childCount: childCount.get(c.id) || 0 }));
  }

  async impact(id: string): Promise<CategoryImpact> {
    const cat = await this.getMaster(id);
    const ids = await this.idsForSlug(cat.slug);
    const [users, subs, children] = await Promise.all([
      this.businessesOn(ids),
      this.subcategoryUsers(ids),
      // tenant-scope-ok: master children only
      this.db.category.count({ where: { parentId: cat.id, deletedAt: null } }),
    ]);
    return {
      businesses: users.length,
      asSubcategory: subs.length,
      children,
      pendingVerification: users.filter((b) =>
        ['DRAFT', 'PENDING_VERIFICATION', 'UNDER_REVIEW'].includes(b.status as string),
      ).length,
      launchOfferHolders: users.filter((b) => !!b.launchOfferClaimedAt).length,
      sample: users.slice(0, 5).map((b) => ({ id: b.id, name: b.name })),
    };
  }

  // ── writes ────────────────────────────────────────────────────────────

  private async siblingNames(tenantId: string, parentId: string | null, excludeId?: string) {
    // tenant-scope-ok: master tenant only
    const rows = await this.db.category.findMany({
      where: {
        tenantId,
        parentId,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { name: true },
    });
    return rows.map((r) => r.name);
  }

  async create(actor: Actor, dto: CreateCategoryDto) {
    const tenantId = await this.masterTenantId();
    const name = normName(dto.name);
    const slug = (dto.slug ? dto.slug.trim().toLowerCase() : slugify(name)) || '';
    assertSlug(slug);
    assertIcon(dto.icon);
    assertTemplate(dto.template);

    // Archived and merged categories keep their slug reserved, so look at every row.
    // tenant-scope-ok: master tenant only
    const taken = await this.db.category.findFirst({
      where: { tenantId, slug },
      select: { id: true, deletedAt: true },
    });
    if (taken) {
      throw new ConflictException(
        taken.deletedAt
          ? 'That slug belonged to a category that was merged or removed. Choose another.'
          : 'A category with this slug already exists.',
      );
    }

    let parent: { id: string; parentId: string | null; template: string | null } | null = null;
    if (dto.parentId) {
      parent = await this.db.category.findFirst({
        where: { id: dto.parentId, tenantId, deletedAt: null },
        select: { id: true, parentId: true, template: true },
      });
      if (!parent) throw new BadRequestException('Parent category not found.');
      assertParent(null, parent);
    }

    if ((await this.siblingNames(tenantId, parent?.id ?? null)).some((n) => sameName(n, name))) {
      throw new ConflictException('A category with this name already exists here.');
    }

    // Subcategories behave like their parent unless told otherwise.
    const template = dto.template || parent?.template || 'GENERIC';
    const max = await this.db.category.aggregate({
      where: { tenantId, parentId: parent?.id ?? null, deletedAt: null },
      _max: { sortOrder: true },
    });

    const cat = await this.db.category.create({
      data: {
        tenantId,
        name,
        slug,
        nameMl: dto.nameMl?.trim() || null,
        description: dto.description?.trim() || null,
        icon: dto.icon || null,
        parentId: parent?.id ?? null,
        template,
        sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 10,
        isActive: dto.isActive ?? true,
        isSystem: false,
        createdBy: actor.id,
      },
    });
    await this.clearCaches();
    this.audit.log({
      tenantId,
      userId: actor.id,
      action: 'CATEGORY_CREATED',
      resource: 'CATEGORY',
      resourceId: cat.id,
      newData: { name, slug, parentId: cat.parentId, template },
    });
    return cat;
  }

  async update(actor: Actor, id: string, dto: UpdateCategoryDto) {
    const tenantId = await this.masterTenantId();
    const cat = await this.getMaster(id);
    const data: Record<string, any> = {};
    const before: Record<string, any> = {};
    const note = (k: string, v: any) => {
      before[k] = (cat as any)[k];
      data[k] = v;
    };

    if (dto.name !== undefined && normName(dto.name) !== cat.name) {
      const name = normName(dto.name);
      const siblings = await this.siblingNames(tenantId, cat.parentId, cat.id);
      if (siblings.some((n) => sameName(n, name))) {
        throw new ConflictException('A category with this name already exists here.');
      }
      note('name', name);
    }
    if (dto.nameMl !== undefined) note('nameMl', dto.nameMl?.trim() || null);
    if (dto.description !== undefined) note('description', dto.description.trim() || null);
    if (dto.icon !== undefined) {
      assertIcon(dto.icon);
      note('icon', dto.icon || null);
    }
    if (dto.template !== undefined && dto.template !== cat.template) {
      assertTemplate(dto.template);
      note('template', dto.template || null);
    }
    if (dto.sortOrder !== undefined && dto.sortOrder !== cat.sortOrder)
      note('sortOrder', dto.sortOrder);

    if (dto.isActive !== undefined && dto.isActive !== cat.isActive) {
      if (!dto.isActive && cat.isSystem) {
        throw new BadRequestException('This is a built-in category and cannot be archived.');
      }
      note('isActive', dto.isActive);
    }

    // Slug: locked for built-ins and once any business uses the category.
    const oldSlug = cat.slug;
    if (dto.slug !== undefined && dto.slug.trim().toLowerCase() !== cat.slug) {
      const slug = dto.slug.trim().toLowerCase();
      assertSlug(slug);
      if (cat.isSystem) {
        throw new BadRequestException('The slug of a built-in category cannot be changed.');
      }
      const ids = await this.idsForSlug(cat.slug);
      const [users, subs] = await Promise.all([this.businessesOn(ids), this.subcategoryUsers(ids)]);
      if (users.length || subs.length) {
        throw new ConflictException({
          statusCode: 409,
          message: `The slug is locked because ${users.length + subs.length} business(es) use this category. You can still rename it.`,
          code: 'SLUG_LOCKED',
        });
      }
      // tenant-scope-ok: master tenant only
      const clash = await this.db.category.findFirst({
        where: { tenantId, slug },
        select: { id: true },
      });
      if (clash) throw new ConflictException('A category with this slug already exists.');
      note('slug', slug);
    }

    // Re-parent.
    if (dto.parentId !== undefined && (dto.parentId || null) !== cat.parentId) {
      let parent: { id: string; parentId: string | null } | null = null;
      if (dto.parentId) {
        parent = await this.db.category.findFirst({
          where: { id: dto.parentId, tenantId, deletedAt: null },
          select: { id: true, parentId: true },
        });
        if (!parent) throw new BadRequestException('Parent category not found.');
      }
      const childCount = await this.db.category.count({
        where: { parentId: cat.id, deletedAt: null },
      });
      assertParent({ id: cat.id, hasChildren: childCount > 0 }, parent);
      note('parentId', parent?.id ?? null);
    }

    if (Object.keys(data).length === 0) return cat;
    data.updatedBy = actor.id;

    const updated = await this.db.$transaction(async (tx) => {
      const u = await tx.category.update({ where: { id }, data });
      // Keep any legacy clone in step so slug-based reads stay consistent.
      const mirror: Record<string, any> = {};
      for (const k of [
        'name',
        'nameMl',
        'description',
        'icon',
        'template',
        'sortOrder',
        'isActive',
        'slug',
      ]) {
        if (k in data) mirror[k] = data[k];
      }
      if (Object.keys(mirror).length) {
        await tx.category.updateMany({
          where: { slug: oldSlug, tenantId: { not: tenantId }, deletedAt: null },
          data: mirror,
        });
      }
      return u;
    });

    const visible = ['name', 'nameMl', 'icon', 'isActive', 'slug', 'parentId', 'template'].some(
      (k) => k in data,
    );
    let affected: { id: string; tenantId: string }[] = [];
    if (visible) {
      const ids = await this.idsForSlug(updated.slug);
      affected = (await this.businessesOn(ids)).map((b) => ({ id: b.id, tenantId: b.tenantId }));
    }
    await this.clearCaches(affected.map((b) => b.id));
    if (affected.length) void this.reindex(affected);

    this.audit.log({
      tenantId,
      userId: actor.id,
      action: data.isActive === false ? 'CATEGORY_ARCHIVED' : 'CATEGORY_UPDATED',
      resource: 'CATEGORY',
      resourceId: id,
      oldData: before,
      newData: data,
    });
    return updated;
  }

  /** Move businesses, subcategory references and children from `id` to `targetId`, then retire `id`. */
  async merge(actor: Actor, id: string, targetId: string) {
    const tenantId = await this.masterTenantId();
    if (id === targetId)
      throw new BadRequestException('Choose a different category to merge into.');
    const source = await this.getMaster(id);
    const target = await this.getMaster(targetId);
    if (source.isSystem) {
      throw new BadRequestException(
        'A built-in category cannot be merged away. Merge another into it instead.',
      );
    }
    if (!target.isActive) throw new BadRequestException('Merge into an active category.');
    if ((source.parentId === null) !== (target.parentId === null)) {
      throw new BadRequestException('A category can only be merged into one at the same level.');
    }

    const srcIds = await this.idsForSlug(source.slug);
    const moved = await this.businessesOn(srcIds);
    const subUsers = await this.subcategoryUsers(srcIds);

    await this.db.$transaction(async (tx) => {
      await tx.business.updateMany({
        where: { categoryId: { in: srcIds }, deletedAt: null },
        data: { categoryId: target.id },
      });
      await tx.$executeRaw(Prisma.sql`
        UPDATE businesses b
        SET subcategory_ids = COALESCE((
          SELECT jsonb_agg(DISTINCT m.val)
          FROM (
            SELECT CASE WHEN e = ANY(${srcIds}::text[]) THEN ${target.id}::text ELSE e END AS val
            FROM jsonb_array_elements_text(b.subcategory_ids) AS e
          ) m
        ), '[]'::jsonb)
        WHERE b.subcategory_ids ?| ${srcIds}::text[]`);
      // Children follow a merged top-level category.
      await tx.category.updateMany({
        where: { parentId: source.id, deletedAt: null },
        data: { parentId: target.id },
      });
      // Retire the source and every legacy clone; the master row keeps its slug as the redirect.
      await tx.category.updateMany({
        where: { id: { in: srcIds } },
        data: {
          deletedAt: new Date(),
          isActive: false,
          mergedIntoId: target.id,
          updatedBy: actor.id,
        },
      });
    });

    await this.clearCaches(moved.map((b) => b.id));
    void this.reindex(moved.map((b) => ({ id: b.id, tenantId: b.tenantId })));
    void this.notifyOwners(moved, source.name, target.name);

    this.audit.log({
      tenantId,
      userId: actor.id,
      action: 'CATEGORY_MERGED',
      resource: 'CATEGORY',
      resourceId: id,
      metadata: {
        from: { id: source.id, slug: source.slug, name: source.name },
        into: { id: target.id, slug: target.slug, name: target.name },
        businessesMoved: moved.length,
        subcategoryRefsMoved: subUsers.length,
      },
    });
    return {
      success: true,
      businessesMoved: moved.length,
      into: { id: target.id, name: target.name },
    };
  }

  private async notifyOwners(
    businesses: { tenantId: string; ownerId: string | null; name: string }[],
    from: string,
    into: string,
  ) {
    const seen = new Set<string>();
    for (const b of businesses) {
      if (!b.ownerId || seen.has(`${b.ownerId}:${b.name}`)) continue;
      seen.add(`${b.ownerId}:${b.name}`);
      try {
        await this.notifications.send({
          tenantId: b.tenantId,
          userId: b.ownerId,
          title: 'Your business category was updated',
          body: `“${from}” is now part of “${into}”. ${b.name} keeps working as before.`,
          type: 'IN_APP',
          channel: 'BUSINESS',
          metadata: { kind: 'CATEGORY_MERGED' },
        });
      } catch {
        /* a failed notice never fails the merge */
      }
    }
  }

  /** Delete only when nothing references the category. Otherwise 409 with the impact. */
  async remove(actor: Actor, id: string) {
    const tenantId = await this.masterTenantId();
    const cat = await this.getMaster(id);
    if (cat.isSystem) {
      throw new BadRequestException('This is a built-in category and cannot be deleted.');
    }
    const impact = await this.impact(id);
    if (impact.businesses || impact.asSubcategory || impact.children) {
      throw new ConflictException({
        statusCode: 409,
        message:
          'This category is still in use. Archive it to hide it from new sign-ups, or merge it into another category.',
        code: 'CATEGORY_IN_USE',
        details: impact,
      });
    }
    const ids = await this.idsForSlug(cat.slug);
    // Redirects pointing at a deleted row fall back to "gone" (FK is ON DELETE SET NULL).
    await this.db.category.deleteMany({ where: { id: { in: ids } } });
    await this.clearCaches();
    this.audit.log({
      tenantId,
      userId: actor.id,
      action: 'CATEGORY_DELETED',
      resource: 'CATEGORY',
      resourceId: id,
      oldData: { name: cat.name, slug: cat.slug, parentId: cat.parentId },
    });
    return { success: true };
  }

  async reorder(actor: Actor, ids: string[]) {
    const tenantId = await this.masterTenantId();
    // tenant-scope-ok: master tenant only
    const rows = await this.db.category.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    if (rows.length !== ids.length) throw new NotFoundException('Some categories were not found.');
    if (new Set(rows.map((r) => r.parentId ?? 'root')).size > 1) {
      throw new BadRequestException('Reorder categories that share the same parent.');
    }
    await this.db.$transaction(
      ids.map((cid, i) =>
        this.db.category.update({
          where: { id: cid },
          data: { sortOrder: (i + 1) * 10, updatedBy: actor.id },
        }),
      ),
    );
    await this.clearCaches();
    this.audit.log({
      tenantId,
      userId: actor.id,
      action: 'CATEGORY_REORDERED',
      resource: 'CATEGORY',
      resourceId: ids[0],
      metadata: { count: ids.length },
    });
    return { success: true };
  }
}
