// ============================================================
// Database Seed — Initial platform data for development
// ============================================================

import { PrismaClient, UserRoleEnum, BusinessStatus, OfferStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Tenant ──────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Platform',
      slug: 'default',
      settings: { theme: 'default', language: 'en' },
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // ── Seeding Roles ───────────────────────────────────────
  const roleCodes = [
    { code: 'USER', name: 'Public User', description: 'Standard platform visitor' },
    {
      code: 'BUSINESS_OWNER',
      name: 'Business Owner',
      description: 'Business listings owner',
    },
    {
      code: 'BUSINESS_MODERATOR',
      name: 'Business Moderator',
      description: 'Business staff with moderating capabilities',
    },
    {
      code: 'BUSINESS_STAFF',
      name: 'Business Staff',
      description: 'Business branch or operational staff',
    },
    {
      code: 'GOVERNMENT_ADMIN',
      name: 'Government Admin',
      description: 'Government official publishing public notifications',
    },
    {
      code: 'MASTER_ADMIN',
      name: 'Master Admin',
      description: 'Operations admin with full data access',
    },
    { code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Platform super-user' },
    {
      code: 'INFLUENCER',
      name: 'Influencer',
      description: 'Content creator / Influencer profile owner',
    },
    {
      code: 'PROFESSIONAL',
      name: 'Professional Service',
      description: 'Freelancer / Professional service provider',
    },
    {
      code: 'EVENT_ORGANIZER',
      name: 'Event Organizer',
      description: 'Event organizer publishing events',
    },
    {
      code: 'ORGANIZATION_ADMIN',
      name: 'NGO Admin',
      description: 'NGO or community organization admin',
    },
  ];

  const rolesMap: Record<string, any> = {};
  for (const roleData of roleCodes) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: roleData.code,
        },
      },
      update: {},
      create: {
        ...roleData,
        tenantId: tenant.id,
      },
    });
    rolesMap[roleData.code] = role;
  }
  console.log('✅ RBAC Roles seeded');

  // ── Seeding Permissions ─────────────────────────────────
  const permissionsData = [
    {
      name: 'read:listings',
      resource: 'listings',
      action: 'read',
      description: 'Read business listings',
    },
    {
      name: 'write:listings',
      resource: 'listings',
      action: 'write',
      description: 'Create and update business listings',
    },
    {
      name: 'verify:listings',
      resource: 'listings',
      action: 'verify',
      description: 'Verify businesses',
    },
    {
      name: 'write:announcements',
      resource: 'announcements',
      action: 'write',
      description: 'Write civic alerts',
    },
    {
      name: 'verify:bills',
      resource: 'bills',
      action: 'verify',
      description: 'Verify transaction bills',
    },
    {
      name: 'manage:users',
      resource: 'users',
      action: 'manage',
      description: 'Manage users platform-wide',
    },
    {
      name: 'business.analytics.view',
      resource: 'analytics',
      action: 'read',
      description: 'View business analytics',
    },
    {
      name: 'business.bills.verify',
      resource: 'business-bills',
      action: 'verify',
      description: 'Verify business bills',
    },
    {
      name: 'business.team.manage',
      resource: 'team',
      action: 'manage',
      description: 'Manage business team members',
    },
    {
      name: 'business.bills.override',
      resource: 'bills',
      action: 'override',
      description: 'Override bill verification decisions',
    },
  ];

  const permissionsMap: Record<string, any> = {};
  for (const permData of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: permData.name,
        },
      },
      update: {},
      create: {
        ...permData,
        tenantId: tenant.id,
      },
    });
    permissionsMap[permData.name] = perm;
  }
  console.log('✅ RBAC Permissions seeded');

  // ── Mapping Permissions to Roles ───────────────────────
  const rolePermissionsMap: Record<string, string[]> = {
    USER: ['read:listings'],
    BUSINESS_OWNER: [
      'read:listings',
      'write:listings',
      'business.analytics.view',
      'business.bills.verify',
      'business.team.manage',
      'business.bills.override',
    ],
    BUSINESS_MODERATOR: [
      'read:listings',
      'business.bills.verify',
    ],
    BUSINESS_STAFF: ['read:listings'],
    GOVERNMENT_ADMIN: ['read:listings', 'write:announcements'],
    MASTER_ADMIN: [
      'read:listings',
      'write:listings',
      'verify:listings',
      'verify:bills',
    ],
    SUPER_ADMIN: [
      'read:listings',
      'write:listings',
      'verify:listings',
      'write:announcements',
      'verify:bills',
      'manage:users',
      'business.analytics.view',
      'business.bills.verify',
      'business.team.manage',
      'business.bills.override',
    ],
  };

  for (const [roleCode, permNames] of Object.entries(rolePermissionsMap)) {
    const role = rolesMap[roleCode];
    for (const name of permNames) {
      const perm = permissionsMap[name];
      await prisma.rolePermission.upsert({
        where: {
          tenantId_roleId_permissionId: {
            tenantId: tenant.id,
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log('✅ Role-Permission mappings seeded');

  // ── Seeding Plans ───────────────────────────────────────
  console.log('🌱 Seeding plans...');
  const plansData = [
    {
      name: 'Business Basic',
      code: 'BUSINESS_BASIC',
      description: 'Basic business listing plan',
      entityType: 'BUSINESS',
      price: 4999.00,
      billingCycle: 'YEARLY',
      features: { listing: true, branches: 1, reviews: true, support: 'standard' },
      limits: { branches: 1, campaigns: 0, offers: 0, analytics: 'basic' },
    },
    {
      name: 'Business Standard',
      code: 'BUSINESS_STANDARD',
      description: 'Standard business listing plan with promotions',
      entityType: 'BUSINESS',
      price: 7999.00,
      billingCycle: 'YEARLY',
      features: { listing: true, branches: 3, reviews: true, support: 'standard', offers: true, highlights: true },
      limits: { branches: 3, campaigns: 3, offers: 5, analytics: 'standard' },
    },
    {
      name: 'Business Premium',
      code: 'BUSINESS_PREMIUM',
      description: 'Premium business listing plan with advanced features',
      entityType: 'BUSINESS',
      price: 14999.00,
      billingCycle: 'YEARLY',
      features: { listing: true, branches: 9999, reviews: true, support: 'priority', offers: true, highlights: true, campaigns: true, videoCampaigns: true, apiAccess: true },
      limits: { branches: 9999, campaigns: 9999, offers: 9999, analytics: 'premium' },
    },
    {
      name: 'Influencer Free',
      code: 'INFLUENCER_FREE',
      description: 'Free influencer profile',
      entityType: 'INFLUENCER',
      price: 0.00,
      billingCycle: 'FREE',
      features: { profile: true, campaigns: true },
      limits: { campaigns: 2 },
    },
    {
      name: 'Influencer Pro',
      code: 'INFLUENCER_PRO',
      description: 'Pro influencer profile with verification badge',
      entityType: 'INFLUENCER',
      price: 2999.00,
      billingCycle: 'YEARLY',
      features: { profile: true, campaigns: true, verificationBadge: true },
      limits: { campaigns: 9999 },
    },
    {
      name: 'NGO Free',
      code: 'NGO_FREE',
      description: 'Free NGO / Community profile',
      entityType: 'ORGANIZATION',
      price: 0.00,
      billingCycle: 'FREE',
      features: { profile: true, volunteers: true, donations: true },
      limits: { campaigns: 9999 },
    },
    {
      name: 'Gov Portal',
      code: 'GOVT_FREE',
      description: 'Official Government notification portal',
      entityType: 'GOVERNMENT',
      price: 0.00,
      billingCycle: 'FREE',
      features: { alerts: true, emergencyBroadcasts: true },
      limits: { campaigns: 9999 },
    },
  ];

  for (const plan of plansData) {
    await prisma.plan.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: plan.code,
        },
      },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        billingCycle: plan.billingCycle,
        features: plan.features,
        limits: plan.limits,
      },
      create: {
        ...plan,
        tenantId: tenant.id,
        entityType: plan.entityType as any,
      },
    });
  }
  console.log('✅ Plans seeded');

  // ── Users ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const coreUsers = [
    { email: 'user@platform.com', name: 'John Public', role: UserRoleEnum.USER },
    { email: 'business@platform.com', name: 'Jane Business', role: UserRoleEnum.BUSINESS_OWNER },
    { email: 'moderator@platform.com', name: 'Joe Moderator', role: UserRoleEnum.BUSINESS_MODERATOR },
    { email: 'gov@platform.com', name: 'Gov Agency', role: UserRoleEnum.GOVERNMENT_ADMIN },
    { email: 'admin@platform.com', name: 'Admin User', role: UserRoleEnum.MASTER_ADMIN },
    { email: 'superadmin@platform.com', name: 'Super Admin', role: UserRoleEnum.SUPER_ADMIN },
  ];

  const seededUsers: any[] = [];
  for (const u of coreUsers) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        isActive: true,
        emailVerified: true,
      },
    });

    // Map to dynamic RBAC Role table
    const targetRoleCode = u.role.toString();

    const dbRole = rolesMap[targetRoleCode];
    await prisma.userRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: dbRole.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: dbRole.id,
      },
    });

    seededUsers.push(user);
  }
  console.log(`✅ ${seededUsers.length} core users created with RBAC mapping`);

  // ── Categories ──────────────────────────────────────────
  const categoriesData = [
    {
      name: 'Restaurants',
      slug: 'restaurants',
      description: 'Dining & Food Services',
      icon: 'UtensilsCrossed',
      sortOrder: 1,
    },
    {
      name: 'Healthcare',
      slug: 'healthcare',
      description: 'Medical & Health Services',
      icon: 'Heart',
      sortOrder: 2,
    },
    {
      name: 'Retail',
      slug: 'retail',
      description: 'Shopping & Retail Stores',
      icon: 'ShoppingBag',
      sortOrder: 3,
    },
    {
      name: 'Services',
      slug: 'services',
      description: 'Professional & Personal Services',
      icon: 'Wrench',
      sortOrder: 4,
    },
    {
      name: 'Technology',
      slug: 'technology',
      description: 'Tech Companies & Startups',
      icon: 'Cpu',
      sortOrder: 5,
    },
    {
      name: 'Education',
      slug: 'education',
      description: 'Schools, Training & Tutoring',
      icon: 'GraduationCap',
      sortOrder: 6,
    },
    {
      name: 'Entertainment',
      slug: 'entertainment',
      description: 'Entertainment & Recreation',
      icon: 'Music',
      sortOrder: 7,
    },
    {
      name: 'Finance',
      slug: 'finance',
      description: 'Banking & Financial Services',
      icon: 'Landmark',
      sortOrder: 8,
    },
  ];

  const categories = [];
  const createdCategories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: cat.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      },
    });
    categories.push(category);
    createdCategories[cat.slug] = category;
  }
  console.log(`✅ ${categories.length} categories upserted`);

  // ── Seeding Sample Businesses ────────────────────────────
  const sampleBusinesses = [
    {
      name: 'Sunrise Café',
      slug: 'sunrise-cafe',
      description: 'Fresh coffee and bakery items in Kochi.',
      categorySlug: 'restaurants',
      address: '123 Beach Road',
      city: 'Kochi',
      state: 'Kerala',
      zipCode: '682001',
      phone: '9876500010',
      email: 'info@sunrisecafe.com',
      status: 'APPROVED' as any,
      isVerified: true,
    },
    {
      name: 'Kerala Health Center',
      slug: 'kerala-health-center',
      description: 'Multi-specialty wellness clinic in Trivandrum.',
      categorySlug: 'healthcare',
      address: '45 MG Road',
      city: 'Trivandrum',
      state: 'Kerala',
      zipCode: '695001',
      phone: '9876500011',
      email: 'trivandrum@keralahealth.org',
      status: 'APPROVED' as any,
      isVerified: true,
    },
    {
      name: 'Smart Retailers',
      slug: 'smart-retailers',
      description: 'Electronics and apparel department store.',
      categorySlug: 'retail',
      address: 'Near Town Hall',
      city: 'Kozhikode',
      state: 'Kerala',
      zipCode: '673001',
      phone: '9876500012',
      email: 'sales@smartretailers.com',
      status: 'APPROVED' as any,
      isVerified: true,
    },
  ];

  // Resolve business owner user from DB
  const businessOwnerUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'BUSINESS_OWNER' as any },
  });

  if (businessOwnerUser) {
    for (const b of sampleBusinesses) {
      const category = createdCategories[b.categorySlug];
      await prisma.business.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: b.slug } },
        update: {
          name: b.name,
          description: b.description,
          address: b.address,
          city: b.city,
          state: b.state,
          zipCode: b.zipCode,
          phone: b.phone,
          email: b.email,
          status: b.status,
          isVerified: b.isVerified,
        },
        create: {
          tenantId: tenant.id,
          ownerId: businessOwnerUser.id,
          categoryId: category.id,
          name: b.name,
          slug: b.slug,
          description: b.description,
          address: b.address,
          city: b.city,
          state: b.state,
          zipCode: b.zipCode,
          phone: b.phone,
          email: b.email,
          status: b.status,
          isVerified: b.isVerified,
        },
      });
    }
    console.log(`✅ ${sampleBusinesses.length} sample businesses seeded/upserted`);
  }

  // ── Feature Flags ───────────────────────────────────────
  const flags = [
    {
      key: 'enable_bill_upload',
      name: 'Bill Upload',
      description: 'Allow users to upload bills for verification',
      isEnabled: true,
    },
    {
      key: 'enable_nearby_search',
      name: 'Nearby Search',
      description: 'Enable geo-based nearby business search',
      isEnabled: true,
    },
    {
      key: 'enable_push_notifications',
      name: 'Push Notifications',
      description: 'Enable FCM push notifications',
      isEnabled: false,
    },
    {
      key: 'enable_ai_fraud_detection',
      name: 'AI Fraud Detection',
      description: 'Enable AI-powered fraud detection on reviews',
      isEnabled: false,
    },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        isEnabled: flag.isEnabled,
      },
    });
  }
  console.log('✅ Feature flags created');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📧 Test Credentials:');
  console.log('  Public User:     user@platform.com / password123');
  console.log('  Business Owner:  business@platform.com / password123');
  console.log('  Business Mod:    moderator@platform.com / password123');
  console.log('  Government:      gov@platform.com / password123');
  console.log('  Admin:           admin@platform.com / password123');
  console.log('  Super Admin:     superadmin@platform.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
