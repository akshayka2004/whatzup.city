/**
 * Backfill referral codes for users who registered before auto-generation
 * was added to auth.service.ts.
 *
 * Run:
 *   cd packages/database && pnpm tsx prisma/backfill-referral-codes.ts
 * or from repo root:
 *   pnpm --filter @saas/database exec tsx prisma/backfill-referral-codes.ts
 *
 * Safe to re-run — only updates users where referralCode IS NULL.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function main() {
  console.log('▶ Backfilling referral codes for users without one…\n');

  const users = await prisma.user.findMany({
    where: { referralCode: null, deletedAt: null },
    select: { id: true, email: true },
  });

  console.log(`  Found ${users.length} users without a referral code.`);
  if (users.length === 0) {
    console.log('  Nothing to do.\n');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    // Retry loop in case of rare collision on the unique column
    let attempts = 0;
    while (attempts < 5) {
      const code = generateCode();
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { referralCode: code },
        });
        updated++;
        break;
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Unique constraint violation — retry with new code
          attempts++;
          continue;
        }
        console.error(`  ✗ Failed for ${user.email}:`, err.message);
        skipped++;
        break;
      }
    }
  }

  console.log(`\n  ✓ Updated: ${updated}  Skipped: ${skipped}\n`);
  console.log('▶ Done.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
