// ============================================================
// Category consolidation planner (pure).
//
// Until now every business signup cloned the whole category list into the new
// tenant, so businesses point at ~46 copies of "Restaurants" instead of one. The
// consolidation script repoints them all at the master (default tenant) row and
// retires the copies. This function decides, for every copy, what happens to it.
// It touches no database so it can be unit-tested and the script's dry run can
// print its output for review.
// ============================================================

export interface ConsolidationCategory {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  deletedAt: Date | string | null;
}

export type ConsolidationAction =
  /** repoint references at the existing master row, retire the copy */
  | 'MAP'
  /** the slug only exists as copies and is still used: create it in the master list, then repoint */
  | 'CREATE_MASTER'
  /** copy nobody references: just retire it */
  | 'RETIRE_UNUSED'
  /** cannot be decided automatically; the apply run refuses until this is resolved */
  | 'BLOCKED';

export interface ConsolidationRow {
  categoryId: string;
  tenantId: string;
  slug: string;
  action: ConsolidationAction;
  /** existing master id for MAP */
  masterId: string | null;
  reason?: string;
}

export interface ConsolidationPlan {
  rows: ConsolidationRow[];
  /** master rows to create (one per slug), taken from the first referenced copy */
  createMaster: Array<{
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
  blockers: string[];
}

export function planCategoryConsolidation(input: {
  masterTenantId: string;
  categories: ConsolidationCategory[];
  /** ids referenced by businesses.category_id or businesses.subcategory_ids */
  referencedIds: ReadonlySet<string>;
}): ConsolidationPlan {
  const { masterTenantId, categories, referencedIds } = input;

  const masterLive = new Map<string, ConsolidationCategory>();
  const masterDeleted = new Map<string, ConsolidationCategory>();
  for (const c of categories) {
    if (c.tenantId !== masterTenantId) continue;
    if (c.deletedAt) masterDeleted.set(c.slug, c);
    else masterLive.set(c.slug, c);
  }

  // Deterministic order so a re-run prints the same plan.
  const copies = categories
    .filter((c) => c.tenantId !== masterTenantId && !c.deletedAt)
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.tenantId.localeCompare(b.tenantId));

  const rows: ConsolidationRow[] = [];
  const createMaster = new Map<string, ConsolidationPlan['createMaster'][number]>();
  const blockers: string[] = [];

  for (const c of copies) {
    const used = referencedIds.has(c.id);
    const live = masterLive.get(c.slug);
    const base = { categoryId: c.id, tenantId: c.tenantId, slug: c.slug };

    if (live) {
      rows.push({ ...base, action: used ? 'MAP' : 'RETIRE_UNUSED', masterId: live.id });
      continue;
    }
    if (masterDeleted.has(c.slug)) {
      if (!used) {
        rows.push({ ...base, action: 'RETIRE_UNUSED', masterId: null });
        continue;
      }
      const reason = `master category "${c.slug}" was deleted but a business still uses a copy of it`;
      rows.push({ ...base, action: 'BLOCKED', masterId: null, reason });
      if (!blockers.includes(reason)) blockers.push(reason);
      continue;
    }
    if (!used) {
      rows.push({ ...base, action: 'RETIRE_UNUSED', masterId: null });
      continue;
    }
    if (!createMaster.has(c.slug)) {
      createMaster.set(c.slug, {
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      });
    }
    rows.push({ ...base, action: 'CREATE_MASTER', masterId: null });
  }

  return { rows, createMaster: [...createMaster.values()], blockers };
}

/** Rewrite a business's subcategory ids through the copy→master map; drops duplicates, keeps order. */
export function remapIds(ids: unknown, map: ReadonlyMap<string, string>): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const next = map.get(raw) ?? raw;
    if (!out.includes(next)) out.push(next);
  }
  return out;
}
