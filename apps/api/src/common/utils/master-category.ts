import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DatabaseService } from '../database/database.service';

/**
 * Categories live in ONE master list (the default tenant). Businesses in every tenant point at
 * these rows directly; signup no longer clones the list per tenant. These helpers are the only
 * way registration/onboarding/brands resolve a category slug.
 */

let cachedMasterId: string | null = null;

export async function masterTenantId(db: DatabaseService): Promise<string> {
  if (cachedMasterId) return cachedMasterId;
  const tenant = await db.tenant.findUnique({ where: { slug: 'default' }, select: { id: true } });
  if (!tenant) throw new NotFoundException('Default tenant configuration not found');
  cachedMasterId = tenant.id;
  return tenant.id;
}

export interface MasterCategory {
  id: string;
  name: string;
  slug: string;
  template: string | null;
}

/**
 * The active category for a slug. A category that was merged into another resolves to its target
 * (old drafts and links keep working). Archived, deleted or unknown slugs are refused: the old
 * "fall back to the first category" silently filed businesses under the wrong category.
 */
export async function resolveMasterCategory(
  db: DatabaseService,
  slug: string,
): Promise<MasterCategory> {
  const tenantId = await masterTenantId(db);
  const select = { id: true, name: true, slug: true, template: true } as const;
  // tenant-scope-ok: master tenant only
  const direct = await db.category.findFirst({
    where: { tenantId, slug, isActive: true, deletedAt: null },
    select,
  });
  if (direct) return direct;

  const merged = await db.category.findFirst({
    where: { tenantId, slug, mergedIntoId: { not: null } },
    select: { mergedInto: { select: { ...select, isActive: true, deletedAt: true } } },
  });
  const target = merged?.mergedInto;
  if (target && target.isActive && !target.deletedAt) {
    return { id: target.id, name: target.name, slug: target.slug, template: target.template };
  }
  throw new BadRequestException('That category is no longer available. Please choose another one.');
}

/** Active master subcategories for the given slugs (unknown or archived ones are dropped). */
export async function resolveMasterSubcategories(
  db: DatabaseService,
  slugs?: string[] | null,
): Promise<{ id: string; slug: string }[]> {
  if (!slugs?.length) return [];
  const tenantId = await masterTenantId(db);
  // tenant-scope-ok: master tenant only
  return db.category.findMany({
    where: { tenantId, slug: { in: slugs }, isActive: true, deletedAt: null },
    select: { id: true, slug: true },
  });
}
