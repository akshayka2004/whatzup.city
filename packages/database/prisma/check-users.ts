import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  console.log("=== DB Users ===");
  for (const u of users) {
    console.log(`User: ${u.email}`);
    console.log(`  Role (User table): ${u.role}`);
    console.log(`  RBAC Roles: ${u.userRoles.map(ur => ur.role.code).join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
