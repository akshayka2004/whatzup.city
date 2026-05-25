/**
 * Backfill VerificationRequest rows for businesses that registered before
 * the auto-enqueue change. Every Business / non-CUSTOMER Entity without an
 * existing PENDING/UNDER_REVIEW VerificationRequest gets one created so
 * it appears in the admin moderation queue.
 *
 * Run:
 *   cd packages/database && pnpm tsx prisma/backfill-verification-requests.ts
 * or from repo root:
 *   pnpm --filter @saas/database exec tsx prisma/backfill-verification-requests.ts
 *
 * Safe to re-run — uses findFirst gate before each create.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('▶ Backfilling VerificationRequest rows…\n');

  // 1. Businesses with no entityId — create Entity first
  const orphans = await prisma.business.findMany({
    where: { entityId: null, deletedAt: null },
    select: { id: true, tenantId: true, ownerId: true, name: true, email: true, phone: true, status: true },
  });
  console.log(`Found ${orphans.length} businesses with no Entity link.`);

  for (const biz of orphans) {
    const entity = await prisma.entity.create({
      data: {
        tenantId: biz.tenantId,
        userId: biz.ownerId,
        type: 'BUSINESS' as any,
        status: biz.status === 'APPROVED' ? 'APPROVED' : ('PENDING_VERIFICATION' as any),
        name: biz.name,
        email: biz.email || null,
        phone: biz.phone || null,
      },
    });
    await prisma.business.update({ where: { id: biz.id }, data: { entityId: entity.id } });
    console.log(`  ✓ Linked business "${biz.name}" → entity ${entity.id}`);
  }

  // 2. All Business entities not yet APPROVED → ensure VerificationRequest exists
  const businessEntities = await prisma.entity.findMany({
    where: {
      type: 'BUSINESS' as any,
      status: { notIn: ['APPROVED' as any, 'REJECTED' as any] },
    },
    select: { id: true, tenantId: true, name: true, status: true },
  });
  console.log(`\nFound ${businessEntities.length} non-approved business entities.`);

  let created = 0;
  let skipped = 0;
  for (const ent of businessEntities) {
    const existing = await prisma.verificationRequest.findFirst({
      where: { entityId: ent.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.verificationRequest.create({
      data: {
        tenantId: ent.tenantId,
        entityId: ent.id,
        status: 'PENDING',
      },
    });
    // Bump entity status to PENDING_VERIFICATION if it was DRAFT
    if (ent.status === 'DRAFT') {
      await prisma.entity.update({
        where: { id: ent.id },
        data: { status: 'PENDING_VERIFICATION' as any },
      });
    }
    created++;
    console.log(`  ✓ Enqueued "${ent.name}" (entity ${ent.id})`);
  }

  // 3. Sync Business.status + isVerified for entities we just enqueued
  const synced = await prisma.business.updateMany({
    where: {
      entity: { type: 'BUSINESS' as any, status: 'PENDING_VERIFICATION' as any },
      status: { notIn: ['APPROVED' as any, 'REJECTED' as any] },
    },
    data: { status: 'PENDING_VERIFICATION', isVerified: false },
  });

  // 4. Non-BUSINESS entities (Influencer, Professional, EventOrganizer,
  //    Organization, Government) also need to be in admin queue.
  const otherEntities = await prisma.entity.findMany({
    where: {
      type: { notIn: ['CUSTOMER' as any, 'BUSINESS' as any] },
      status: { notIn: ['APPROVED' as any, 'REJECTED' as any] },
    },
    select: { id: true, tenantId: true, name: true, type: true, status: true },
  });
  console.log(`\nFound ${otherEntities.length} other entity types pending.`);

  let createdOther = 0;
  for (const ent of otherEntities) {
    const existing = await prisma.verificationRequest.findFirst({
      where: { entityId: ent.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    });
    if (existing) continue;
    await prisma.verificationRequest.create({
      data: {
        tenantId: ent.tenantId,
        entityId: ent.id,
        status: 'PENDING',
      },
    });
    if (ent.status === 'DRAFT') {
      await prisma.entity.update({
        where: { id: ent.id },
        data: { status: 'PENDING_VERIFICATION' as any },
      });
    }
    createdOther++;
    console.log(`  ✓ Enqueued ${ent.type} "${ent.name}" (entity ${ent.id})`);
  }

  console.log('\n──────────────────────────────────────────');
  console.log(`Business entities enqueued:  ${created}`);
  console.log(`Business entities skipped:   ${skipped}  (already in queue)`);
  console.log(`Other entities enqueued:     ${createdOther}`);
  console.log(`Business rows synced:        ${synced.count}`);
  console.log('──────────────────────────────────────────');
  console.log('✓ Backfill complete.');
}

main()
  .catch((e) => {
    console.error('✗ Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
