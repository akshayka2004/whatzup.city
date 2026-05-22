import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Checking database readiness...');
  let attempts = 0;
  const maxAttempts = 20;
  const delay = 2000;

  while (attempts < maxAttempts) {
    try {
      // Execute a simple query to verify connection
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database is ready and reachable!');
      process.exit(0);
    } catch (err: any) {
      attempts++;
      console.log(
        `⚠️ Database not ready yet (attempt ${attempts}/${maxAttempts}): ${err.message || err}`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  console.error('❌ Timeout: Database was not reachable after 40 seconds.');
  process.exit(1);
}

main()
  .catch((err) => {
    console.error('❌ Unexpected script error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
