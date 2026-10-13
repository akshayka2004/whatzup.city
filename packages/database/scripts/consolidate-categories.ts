// =============================================================
// One-off: consolidate per-tenant category copies into the master list
// =============================================================
// Every business signup used to clone the whole category list into the new
// tenant, so businesses point at ~46 copies of each category. This repoints
// businesses.category_id and businesses.subcategory_ids at the master (default
// tenant) category and soft-retires the copies.
//
//   dry run (default, writes nothing to the DB):
//     dotenv -e .env -- pnpm --filter @saas/database db:consolidate-categories
//   apply:
//     dotenv -e .env -- pnpm --filter @saas/database db:consolidate-categories -- --apply
//
// Both runs write a CSV of every copy -> master mapping (default: OS temp dir,
// override with --out=path.csv). The mapping is the rollback: re-point
// businesses.category_id from master_id back to category_id per row.
//
// --apply runs in ONE transaction and verifies before commit; any failed check
// rolls everything back. It refuses to run while the plan has blockers.
// =============================================================

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  planCategoryConsolidation,
  remapIds,
  type ConsolidationCategory,
} from '../../types/src/category-consolidation';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const outArg = process.argv.find((a) => a.startsWith('--out='));

type CatRow = {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  deleted_at: Date | null;
};

function csvCell(v: unknown) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function approvedCountsBySlug(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ slug: string; n: bigint }[]>`
    SELECT c.slug, COUNT(*)::bigint AS n
    FROM businesses b
    JOIN business_categories c ON c.id = b.category_id
    WHERE b.status = 'APPROVED' AND b.deleted_at IS NULL
    GROUP BY c.slug`;
  return new Map(rows.map((r) => [r.slug, Number(r.n)]));
}

async function main() {
  console.log(APPLY ? '== APPLY ==' : '== DRY RUN (nothing is written to the database) ==');

  const master = await prisma.tenant.findUnique({ where: { slug: 'default' }, select: { id: true } });
  if (!master) throw new Error('Default (master) tenant not found');

  const cats = await prisma.$queryRaw<CatRow[]>`
    SELECT id, tenant_id, slug, name, description, icon, sort_order, is_active, deleted_at
    FROM business_categories`;
  const categories: ConsolidationCategory[] = cats.map((c) => ({
    id: c.id,
    tenantId: c.tenant_id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    sortOrder: c.sort_order,
    isActive: c.is_active,
    deletedAt: c.deleted_at,
  }));

  const businesses = await prisma.$queryRaw<
    { id: string; category_id: string; subcategory_ids: unknown }[]
  >`SELECT id, category_id, subcategory_ids FROM businesses`;
  const referenced = new Set<string>();
  for (const b of businesses) {
    referenced.add(b.category_id);
    if (Array.isArray(b.subcategory_ids)) {
      for (const s of b.subcategory_ids) if (typeof s === 'string') referenced.add(s);
    }
  }

  const plan = planCategoryConsolidation({
    masterTenantId: master.id,
    categories,
    referencedIds: referenced,
  });

  // ── Report ────────────────────────────────────────────────
  const by = (a: string) => plan.rows.filter((r) => r.action === a);
  const masterLive = categories.filter((c) => c.tenantId === master.id && !c.deletedAt);
  const offMasterBiz = businesses.filter((b) => {
    const c = categories.find((x) => x.id === b.category_id);
    return c && c.tenantId !== master.id;
  });
  console.log(`Master tenant: ${master.id} (${masterLive.length} live categories)`);
  console.log(`Copies in other tenants: ${plan.rows.length}`);
  console.log(`  MAP            ${by('MAP').length}  (referenced; repoint at the master row)`);
  console.log(`  CREATE_MASTER  ${by('CREATE_MASTER').length}  (slug only exists as copies; master row is created)`);
  console.log(`  RETIRE_UNUSED  ${by('RETIRE_UNUSED').length}  (nobody references it)`);
  console.log(`  BLOCKED        ${by('BLOCKED').length}`);
  console.log(`Businesses on a copy: ${offMasterBiz.length} of ${businesses.length}`);
  if (plan.createMaster.length) {
    console.log('Master rows to create:');
    for (const c of plan.createMaster) console.log(`  + ${c.slug}  "${c.name}"`);
  }
  if (plan.blockers.length) {
    console.log('BLOCKERS (resolve before --apply):');
    for (const b of plan.blockers) console.log(`  ! ${b}`);
  }
  const renamed = by('MAP').filter((r) => {
    const m = categories.find((c) => c.id === r.masterId);
    const c = categories.find((c) => c.id === r.categoryId);
    return m && c && m.name !== c.name;
  });
  if (renamed.length) {
    console.log(`Copies whose name differs from the master (display name will change): ${renamed.length}`);
    for (const r of renamed.slice(0, 15)) {
      const m = categories.find((c) => c.id === r.masterId)!;
      const c = categories.find((c) => c.id === r.categoryId)!;
      console.log(`  ${r.slug}: "${c.name}" -> "${m.name}"`);
    }
  }

  const csvPath =
    outArg?.slice('--out='.length) ||
    path.join(os.tmpdir(), `category-consolidation-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
  const lines = ['category_id,tenant_id,slug,action,master_id,reason'];
  for (const r of plan.rows) {
    lines.push([r.categoryId, r.tenantId, r.slug, r.action, r.masterId ?? '', r.reason ?? ''].map(csvCell).join(','));
  }
  fs.writeFileSync(csvPath, lines.join('\n'));
  console.log(`Mapping written: ${csvPath}`);

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply after review.');
    return;
  }
  if (plan.blockers.length) throw new Error('Plan has blockers; refusing to apply.');

  const before = await approvedCountsBySlug();

  await prisma.$transaction(
    async (tx) => {
      // 1. master rows for slugs that only exist as copies
      const created = new Map<string, string>();
      for (const c of plan.createMaster) {
        const row = await tx.category.create({
          data: {
            tenantId: master.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            icon: c.icon,
            sortOrder: c.sortOrder,
            isActive: c.isActive,
          },
          select: { id: true },
        });
        created.set(c.slug, row.id);
      }

      // 2. copy id -> master id
      const map = new Map<string, string>();
      for (const r of plan.rows) {
        const target = r.masterId ?? (r.action === 'CREATE_MASTER' ? created.get(r.slug) : undefined);
        if (target) map.set(r.categoryId, target);
      }
      const copyIds = [...map.keys()];
      const masterIds = copyIds.map((id) => map.get(id)!);

      // 3. businesses.category_id
      if (copyIds.length) {
        await tx.$executeRaw`
          UPDATE businesses b
          SET category_id = m.master_id
          FROM (SELECT unnest(${copyIds}::uuid[]) AS copy_id, unnest(${masterIds}::uuid[]) AS master_id) m
          WHERE b.category_id = m.copy_id`;
      }

      // 4. businesses.subcategory_ids (JSON array of ids, no FK)
      let subRewritten = 0;
      for (const b of businesses) {
        if (!Array.isArray(b.subcategory_ids) || b.subcategory_ids.length === 0) continue;
        const next = remapIds(b.subcategory_ids, map);
        if (JSON.stringify(next) === JSON.stringify(b.subcategory_ids)) continue;
        await tx.$executeRaw`UPDATE businesses SET subcategory_ids = ${JSON.stringify(next)}::jsonb WHERE id = ${b.id}::uuid`;
        subRewritten++;
      }

      // 5. retire every copy (soft delete keeps the row for the rollback CSV)
      const retireIds = plan.rows.map((r) => r.categoryId);
      if (retireIds.length) {
        await tx.$executeRaw`
          UPDATE business_categories
          SET deleted_at = now(), is_active = false
          WHERE id = ANY(${retireIds}::uuid[]) AND deleted_at IS NULL`;
      }

      // 6. verify before commit
      const off = await tx.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n
        FROM businesses b JOIN business_categories c ON c.id = b.category_id
        WHERE c.tenant_id <> ${master.id}::uuid`;
      if (Number(off[0].n) !== 0) throw new Error(`Verification failed: ${off[0].n} businesses still on a copy`);

      const liveIds = new Set(
        (
          await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM business_categories WHERE tenant_id = ${master.id}::uuid AND deleted_at IS NULL`
        ).map((r) => r.id),
      );
      const bizAfter = await tx.$queryRaw<{ id: string; subcategory_ids: unknown }[]>`
        SELECT id, subcategory_ids FROM businesses WHERE jsonb_array_length(subcategory_ids) > 0`;
      for (const b of bizAfter) {
        for (const s of (b.subcategory_ids as unknown[]) ?? []) {
          if (typeof s === 'string' && !liveIds.has(s)) {
            throw new Error(`Verification failed: business ${b.id} has unresolved subcategory ${s}`);
          }
        }
      }

      const after = await approvedCountsBySlugTx(tx);
      for (const [slug, n] of before) {
        if ((after.get(slug) ?? 0) !== n) {
          throw new Error(`Verification failed: ${slug} approved count ${n} -> ${after.get(slug) ?? 0}`);
        }
      }
      console.log(
        `Applied: ${created.size} master rows created, ${copyIds.length} copies mapped, ` +
          `${subRewritten} businesses' subcategories rewritten, ${retireIds.length} copies retired.`,
      );
    },
    { maxWait: 30_000, timeout: 300_000 },
  );
  console.log('Verification passed: 0 businesses on a copy, subcategories resolve, listing counts unchanged.');
  console.log('Next: reindex search (category names may have changed) and clear category caches.');
}

async function approvedCountsBySlugTx(tx: Pick<PrismaClient, '$queryRaw'>) {
  const rows = await tx.$queryRaw<{ slug: string; n: bigint }[]>`
    SELECT c.slug, COUNT(*)::bigint AS n
    FROM businesses b JOIN business_categories c ON c.id = b.category_id
    WHERE b.status = 'APPROVED' AND b.deleted_at IS NULL
    GROUP BY c.slug`;
  return new Map(rows.map((r) => [r.slug, Number(r.n)]));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
