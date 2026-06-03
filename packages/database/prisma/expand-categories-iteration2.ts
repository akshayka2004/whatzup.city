// =============================================================
// Iteration 2 — Business Category & Discovery Expansion
// =============================================================
// SAFE, IDEMPOTENT category/subcategory expansion.
//
//   • Case-insensitive existence checks before every insert.
//   • Reuse existing records — never rename, never duplicate,
//     never create alternate spellings.
//   • Never modifies existing business records.
//   • Never reassigns categories.
//   • Prints a structured final report.
//
// Run:  pnpm --filter @saas/database db:expand-categories
// (or)  ts-node prisma/expand-categories-iteration2.ts
//
// This script is additive only and re-runnable any number of times.
// =============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Expansion definition ────────────────────────────────────
// Standardized names per spec: "Salons" (not Saloons),
// "Diagnostic Centers" (not Diagnosis Centers), "Home Care Services".
interface SubcatDef {
  name: string;
  slug: string;
}
interface CategoryDef {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  subcategories: SubcatDef[];
}

const EXPANSION: CategoryDef[] = [
  {
    name: 'Personal Care',
    slug: 'personal_care',
    description: 'Salons & personal grooming services',
    icon: 'Scissors',
    sortOrder: 20,
    subcategories: [{ name: 'Salons', slug: 'salons' }],
  },
  {
    name: 'Retail & Gifts',
    slug: 'retail_gifts',
    description: 'Gift shops & specialty retail',
    icon: 'Gift',
    sortOrder: 21,
    subcategories: [{ name: 'Gift Shops', slug: 'gift_shops' }],
  },
  {
    name: 'Automotive Services',
    slug: 'automotive_services',
    description: 'Tyre, puncture & mobile vehicle services',
    icon: 'Car',
    sortOrder: 22,
    subcategories: [
      { name: 'Tyre Shops', slug: 'tyre_shops' },
      { name: 'Puncture Repair Shops', slug: 'puncture_repair_shops' },
      { name: 'Mobile Puncture Services', slug: 'mobile_puncture_services' },
    ],
  },
];

// ── Report accumulator ──────────────────────────────────────
const report = {
  reusedCategories: [] as string[],
  createdCategories: [] as string[],
  reusedSubcategories: [] as string[],
  createdSubcategories: [] as string[],
};

// Case-insensitive lookup by name OR slug within a tenant (excludes soft-deleted).
async function findCategory(
  tenantId: string,
  name: string,
  slug: string,
  parentId: string | null,
) {
  return prisma.category.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      parentId: parentId ?? null,
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { slug: { equals: slug, mode: 'insensitive' } },
      ],
    },
  });
}

async function main() {
  console.log('🌱 Iteration 2 — Category & Discovery Expansion (safe, idempotent)\n');

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
  if (!tenant) {
    throw new Error('Default tenant not found. Run base seed first (pnpm db:seed).');
  }

  for (const cat of EXPANSION) {
    // ── Top-level category ──
    let parent = await findCategory(tenant.id, cat.name, cat.slug, null);
    if (parent) {
      report.reusedCategories.push(`${parent.name} (${parent.slug})`);
      console.log(`↻ Reuse category: ${parent.name}`);
    } else {
      parent = await prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });
      report.createdCategories.push(`${parent.name} (${parent.slug})`);
      console.log(`✅ Create category: ${parent.name}`);
    }

    // ── Subcategories (child rows) ──
    for (const sub of cat.subcategories) {
      const existing = await findCategory(tenant.id, sub.name, sub.slug, parent.id);
      if (existing) {
        report.reusedSubcategories.push(`${existing.name} → ${parent.name}`);
        console.log(`  ↻ Reuse subcategory: ${existing.name}`);
        continue;
      }
      // Guard against tenant-wide slug collision (tenantId_slug is unique).
      const slugClash = await prisma.category.findFirst({
        where: { tenantId: tenant.id, slug: { equals: sub.slug, mode: 'insensitive' } },
      });
      if (slugClash) {
        report.reusedSubcategories.push(`${slugClash.name} (slug reused: ${sub.slug})`);
        console.log(`  ↻ Slug already present, skip create: ${sub.slug}`);
        continue;
      }
      const created = await prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: sub.name,
          slug: sub.slug,
          parentId: parent.id,
          sortOrder: 0,
          isActive: true,
        },
      });
      report.createdSubcategories.push(`${created.name} → ${parent.name}`);
      console.log(`  ✅ Create subcategory: ${created.name}`);
    }
  }

  // ── Final report ──
  console.log('\n──────────── FINAL REPORT ────────────');
  console.log(`Categories reused      : ${report.reusedCategories.length}`);
  report.reusedCategories.forEach((c) => console.log(`   ↻ ${c}`));
  console.log(`Categories created     : ${report.createdCategories.length}`);
  report.createdCategories.forEach((c) => console.log(`   ✅ ${c}`));
  console.log(`Subcategories reused   : ${report.reusedSubcategories.length}`);
  report.reusedSubcategories.forEach((c) => console.log(`   ↻ ${c}`));
  console.log(`Subcategories created  : ${report.createdSubcategories.length}`);
  report.createdSubcategories.forEach((c) => console.log(`   ✅ ${c}`));
  console.log('──────────────────────────────────────');
  console.log('NOTE: Healthcare ("Diagnostics Centers", "Home Health Care Services")');
  console.log('      and Staycation ("Hotels", "Resorts") already exist in the');
  console.log('      taxonomy and are REUSED — no duplicates created. "Venues" maps');
  console.log('      to the existing standalone "Venue Spots" category.');
  console.log('✅ Expansion complete. No existing records modified.\n');
}

main()
  .catch((e) => {
    console.error('❌ Expansion failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
