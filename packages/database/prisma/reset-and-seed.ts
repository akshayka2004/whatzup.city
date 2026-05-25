// ============================================================
// Database Reset & Seed — Clean slate with one user per role
// Run: pnpm db:reset (from root) or ts-node prisma/reset-and-seed.ts (from packages/database)
// ⚠️  DESTRUCTIVE — truncates all application tables before re-seeding
// ============================================================

import { PrismaClient, UserRoleEnum } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

async function main() {
  console.log('🔥 Resetting database — all tables will be truncated...\n');

  // ── Hard Reset ───────────────────────────────────────────────
  // Lists all application tables in dependency order; CASCADE handles FK chains.
  // System tables (_prisma_migrations, supabase internals) are NOT listed here.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      analytics_events,
      business_metrics,
      user_activities,
      search_histories,
      audit_logs,
      admin_actions,
      fraud_flags,
      moderation_reports,
      notifications,
      notification_recipients,
      notification_preferences,
      government_announcements,
      bill_verifications,
      bill_items,
      verified_purchases,
      bills,
      review_votes,
      review_media,
      reviews,
      offer_redemptions,
      offers,
      coupons,
      products,
      product_categories,
      bookmarks,
      favorites,
      user_follows,
      business_staff,
      business_documents,
      business_branches,
      verification_requests,
      media,
      payments,
      subscriptions,
      government_profiles,
      organization_profiles,
      event_organizer_profiles,
      professional_profiles,
      influencer_profiles,
      entity_verification_requests,
      uploaded_documents,
      onboarding_events,
      onboarding_progress,
      entities,
      businesses,
      business_categories,
      device_logins,
      refresh_tokens,
      sessions,
      user_roles,
      role_permissions,
      permissions,
      roles,
      customers,
      users,
      plans,
      feature_flags,
      tenants
    CASCADE
  `);
  console.log('✅ All tables truncated\n');

  // ── Tenant ───────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Default Platform',
      slug: 'default',
      settings: { theme: 'default', language: 'en' },
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // ── RBAC Roles ───────────────────────────────────────────────
  const roleCodes = [
    { code: 'USER',                name: 'Public User',          description: 'Standard platform visitor' },
    { code: 'BUSINESS_OWNER',      name: 'Business Owner',       description: 'Business listings owner' },
    { code: 'BUSINESS_MODERATOR',  name: 'Business Moderator',   description: 'Business staff with moderating capabilities' },
    { code: 'BUSINESS_STAFF',      name: 'Business Staff',       description: 'Business branch or operational staff' },
    { code: 'GOVERNMENT_ADMIN',    name: 'Government Admin',     description: 'Government official publishing public notifications' },
    { code: 'MASTER_ADMIN',        name: 'Master Admin',         description: 'Operations admin with full data access' },
    { code: 'SUPER_ADMIN',         name: 'Super Admin',          description: 'Platform super-user' },
    { code: 'INFLUENCER',          name: 'Influencer',           description: 'Content creator / Influencer profile owner' },
    { code: 'PROFESSIONAL',        name: 'Professional Service', description: 'Freelancer / Professional service provider' },
    { code: 'EVENT_ORGANIZER',     name: 'Event Organizer',      description: 'Event organizer publishing events' },
    { code: 'ORGANIZATION_ADMIN',  name: 'NGO Admin',            description: 'NGO or community organization admin' },
  ];

  const rolesMap: Record<string, { id: string }> = {};
  for (const roleData of roleCodes) {
    const role = await prisma.role.create({
      data: { tenantId: tenant.id, ...roleData },
    });
    rolesMap[roleData.code] = role;
  }
  console.log(`✅ ${roleCodes.length} RBAC roles seeded`);

  // ── Permissions ──────────────────────────────────────────────
  const permissionsData = [
    { name: 'read:listings',           resource: 'listings',       action: 'read',     description: 'Read business listings' },
    { name: 'write:listings',          resource: 'listings',       action: 'write',    description: 'Create and update business listings' },
    { name: 'verify:listings',         resource: 'listings',       action: 'verify',   description: 'Verify businesses' },
    { name: 'write:announcements',     resource: 'announcements',  action: 'write',    description: 'Write civic alerts' },
    { name: 'verify:bills',            resource: 'bills',          action: 'verify',   description: 'Verify transaction bills' },
    { name: 'manage:users',            resource: 'users',          action: 'manage',   description: 'Manage users platform-wide' },
    { name: 'business.analytics.view', resource: 'analytics',      action: 'read',     description: 'View business analytics' },
    { name: 'business.bills.verify',   resource: 'business-bills', action: 'verify',   description: 'Verify business bills' },
    { name: 'business.team.manage',    resource: 'team',           action: 'manage',   description: 'Manage business team members' },
    { name: 'business.bills.override', resource: 'bills',          action: 'override', description: 'Override bill verification decisions' },
  ];

  const permissionsMap: Record<string, { id: string }> = {};
  for (const permData of permissionsData) {
    const perm = await prisma.permission.create({
      data: { tenantId: tenant.id, ...permData },
    });
    permissionsMap[permData.name] = perm;
  }
  console.log(`✅ ${permissionsData.length} permissions seeded`);

  // ── Role → Permission Mappings ───────────────────────────────
  const rolePermissionsMap: Record<string, string[]> = {
    USER:               ['read:listings'],
    BUSINESS_OWNER:     ['read:listings', 'write:listings', 'business.analytics.view', 'business.bills.verify', 'business.team.manage', 'business.bills.override'],
    BUSINESS_MODERATOR: ['read:listings', 'business.bills.verify'],
    BUSINESS_STAFF:     ['read:listings'],
    GOVERNMENT_ADMIN:   ['read:listings', 'write:announcements'],
    MASTER_ADMIN:       ['read:listings', 'write:listings', 'verify:listings', 'verify:bills'],
    SUPER_ADMIN:        ['read:listings', 'write:listings', 'verify:listings', 'write:announcements', 'verify:bills', 'manage:users', 'business.analytics.view', 'business.bills.verify', 'business.team.manage', 'business.bills.override'],
    INFLUENCER:         ['read:listings'],
    PROFESSIONAL:       ['read:listings'],
    EVENT_ORGANIZER:    ['read:listings'],
    ORGANIZATION_ADMIN: ['read:listings'],
  };

  for (const [roleCode, permNames] of Object.entries(rolePermissionsMap)) {
    const role = rolesMap[roleCode];
    for (const permName of permNames) {
      await prisma.rolePermission.create({
        data: {
          tenantId: tenant.id,
          roleId: role.id,
          permissionId: permissionsMap[permName].id,
        },
      });
    }
  }
  console.log('✅ Role-Permission mappings seeded');

  // ── Plans ────────────────────────────────────────────────────
  const plansData = [
    {
      name: 'Business Basic',    code: 'BUSINESS_BASIC',
      description: 'Basic business listing plan',
      entityType: 'BUSINESS' as const, price: 4999.00, billingCycle: 'YEARLY',
      features: { listing: true, branches: 1, reviews: true, support: 'standard' },
      limits: { branches: 1, campaigns: 0, offers: 0, analytics: 'basic' },
    },
    {
      name: 'Business Standard', code: 'BUSINESS_STANDARD',
      description: 'Standard business listing plan with promotions',
      entityType: 'BUSINESS' as const, price: 7999.00, billingCycle: 'YEARLY',
      features: { listing: true, branches: 3, reviews: true, support: 'standard', offers: true, highlights: true },
      limits: { branches: 3, campaigns: 3, offers: 5, analytics: 'standard' },
    },
    {
      name: 'Business Premium',  code: 'BUSINESS_PREMIUM',
      description: 'Premium business listing plan with advanced features',
      entityType: 'BUSINESS' as const, price: 14999.00, billingCycle: 'YEARLY',
      features: { listing: true, branches: 9999, reviews: true, support: 'priority', offers: true, highlights: true, campaigns: true, videoCampaigns: true, apiAccess: true },
      limits: { branches: 9999, campaigns: 9999, offers: 9999, analytics: 'premium' },
    },
    {
      name: 'Influencer Free',   code: 'INFLUENCER_FREE',
      description: 'Free influencer profile',
      entityType: 'INFLUENCER' as const, price: 0.00, billingCycle: 'FREE',
      features: { profile: true, campaigns: true }, limits: { campaigns: 2 },
    },
    {
      name: 'Influencer Pro',    code: 'INFLUENCER_PRO',
      description: 'Pro influencer profile with verification badge',
      entityType: 'INFLUENCER' as const, price: 2999.00, billingCycle: 'YEARLY',
      features: { profile: true, campaigns: true, verificationBadge: true }, limits: { campaigns: 9999 },
    },
    {
      name: 'NGO Free',          code: 'NGO_FREE',
      description: 'Free NGO / Community profile',
      entityType: 'ORGANIZATION' as const, price: 0.00, billingCycle: 'FREE',
      features: { profile: true, volunteers: true, donations: true }, limits: { campaigns: 9999 },
    },
    {
      name: 'Gov Portal',        code: 'GOVT_FREE',
      description: 'Official Government notification portal',
      entityType: 'GOVERNMENT' as const, price: 0.00, billingCycle: 'FREE',
      features: { alerts: true, emergencyBroadcasts: true }, limits: { campaigns: 9999 },
    },
  ];

  for (const plan of plansData) {
    await prisma.plan.create({ data: { tenantId: tenant.id, ...plan } });
  }
  console.log(`✅ ${plansData.length} plans seeded`);

  // ── Business Categories ──────────────────────────────────────
  const categoriesData = [
    { name: 'Restaurants',   slug: 'restaurants',   description: 'Dining & Food Services',          icon: 'UtensilsCrossed', sortOrder: 1 },
    { name: 'Healthcare',    slug: 'healthcare',    description: 'Medical & Health Services',        icon: 'Heart',           sortOrder: 2 },
    { name: 'Retail',        slug: 'retail',        description: 'Shopping & Retail Stores',         icon: 'ShoppingBag',     sortOrder: 3 },
    { name: 'Services',      slug: 'services',      description: 'Professional & Personal Services', icon: 'Wrench',          sortOrder: 4 },
    { name: 'Technology',    slug: 'technology',    description: 'Tech Companies & Startups',        icon: 'Cpu',             sortOrder: 5 },
    { name: 'Education',     slug: 'education',     description: 'Schools, Training & Tutoring',     icon: 'GraduationCap',   sortOrder: 6 },
    { name: 'Entertainment', slug: 'entertainment', description: 'Entertainment & Recreation',       icon: 'Music',           sortOrder: 7 },
    { name: 'Finance',       slug: 'finance',       description: 'Banking & Financial Services',     icon: 'Landmark',        sortOrder: 8 },
  ];

  const createdCategories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const category = await prisma.category.create({ data: { tenantId: tenant.id, ...cat } });
    createdCategories[cat.slug] = category;
  }
  console.log(`✅ ${categoriesData.length} categories seeded`);

  // ── Users — One Per Role ─────────────────────────────────────
  // Password: Admin@1234 (bcrypt hash — compatible with the PasswordService)
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  const roleUsers: Array<{ email: string; name: string; role: UserRoleEnum }> = [
    { email: 'user@platform.com',          name: 'John Public',       role: UserRoleEnum.USER },
    { email: 'business@platform.com',      name: 'Jane Business',     role: UserRoleEnum.BUSINESS_OWNER },
    { email: 'moderator@platform.com',     name: 'Joe Moderator',     role: UserRoleEnum.BUSINESS_MODERATOR },
    { email: 'staff@platform.com',         name: 'Sam Staff',         role: UserRoleEnum.BUSINESS_STAFF },
    { email: 'admin@platform.com',         name: 'Admin User',        role: UserRoleEnum.MASTER_ADMIN },
    { email: 'superadmin@platform.com',    name: 'Super Admin',       role: UserRoleEnum.SUPER_ADMIN },
    { email: 'gov@platform.com',           name: 'Gov Agency',        role: UserRoleEnum.GOVERNMENT_ADMIN },
    { email: 'influencer@platform.com',    name: 'Insta Influencer',  role: UserRoleEnum.INFLUENCER },
    { email: 'professional@platform.com',  name: 'Pro Service',       role: UserRoleEnum.PROFESSIONAL },
    { email: 'eventorg@platform.com',      name: 'Event Organizer',   role: UserRoleEnum.EVENT_ORGANIZER },
    { email: 'orgadmin@platform.com',      name: 'NGO Admin',         role: UserRoleEnum.ORGANIZATION_ADMIN },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of roleUsers) {
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        isActive: true,
        emailVerified: true,
      },
    });
    createdUsers[u.role] = user;

    const dbRole = rolesMap[u.role.toString()];
    if (dbRole) {
      await prisma.userRole.create({
        data: { tenantId: tenant.id, userId: user.id, roleId: dbRole.id },
      });
    }
  }
  console.log(`✅ ${roleUsers.length} role-based users created`);

  // ── Seed Businesses ──────────────────────────────────────────
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

  for (const b of sampleBusinesses) {
    const category = createdCategories[b.categorySlug];
    const owner = createdUsers['BUSINESS_OWNER'];
    await prisma.business.create({
      data: {
        tenantId: tenant.id,
        ownerId: owner.id,
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
  console.log(`✅ ${sampleBusinesses.length} sample businesses seeded`);

  // ── Feature Flags (global — no tenantId) ────────────────────
  const flags = [
    { key: 'enable_bill_upload',         name: 'Bill Upload',          description: 'Allow users to upload bills for verification',   isEnabled: true },
    { key: 'enable_nearby_search',       name: 'Nearby Search',        description: 'Enable geo-based nearby business search',        isEnabled: true },
    { key: 'enable_push_notifications',  name: 'Push Notifications',   description: 'Enable FCM push notifications',                  isEnabled: false },
    { key: 'enable_ai_fraud_detection',  name: 'AI Fraud Detection',   description: 'Enable AI-powered fraud detection on reviews',   isEnabled: false },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.create({ data: flag });
  }
  console.log(`✅ ${flags.length} feature flags seeded`);

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n🎉 Database reset and re-seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑  Login Credentials  |  Password: Admin@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  USER               →  user@platform.com');
  console.log('  BUSINESS_OWNER     →  business@platform.com');
  console.log('  BUSINESS_MODERATOR →  moderator@platform.com');
  console.log('  BUSINESS_STAFF     →  staff@platform.com');
  console.log('  MASTER_ADMIN       →  admin@platform.com');
  console.log('  SUPER_ADMIN        →  superadmin@platform.com');
  console.log('  GOVERNMENT_ADMIN   →  gov@platform.com');
  console.log('  INFLUENCER         →  influencer@platform.com');
  console.log('  PROFESSIONAL       →  professional@platform.com');
  console.log('  EVENT_ORGANIZER    →  eventorg@platform.com');
  console.log('  ORGANIZATION_ADMIN →  orgadmin@platform.com');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('\n❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
