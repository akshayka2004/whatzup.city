// ============================================================
// Database Seed — Initial platform data for development
// ============================================================

import { PrismaClient, UserRole, BusinessStatus, OfferStatus } from '@prisma/client';
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

  // ── Users ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'user@platform.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'user@platform.com',
        passwordHash,
        name: 'John Public',
        phone: '+1234567890',
        role: UserRole.PUBLIC_USER,
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'business@platform.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'business@platform.com',
        passwordHash,
        name: 'Jane Business',
        phone: '+1234567891',
        role: UserRole.BUSINESS_OWNER,
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'gov@platform.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'gov@platform.com',
        passwordHash,
        name: 'Gov Agency',
        role: UserRole.GOVERNMENT_AGENCY,
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@platform.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@platform.com',
        passwordHash,
        name: 'Admin User',
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'superadmin@platform.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'superadmin@platform.com',
        passwordHash,
        name: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
      },
    }),
  ]);
  console.log(`✅ ${users.length} users created`);

  // ── Categories ──────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'restaurants' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Restaurants',
        slug: 'restaurants',
        description: 'Dining & Food Services',
        icon: 'UtensilsCrossed',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'healthcare' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Healthcare',
        slug: 'healthcare',
        description: 'Medical & Health Services',
        icon: 'Heart',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'retail' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Retail',
        slug: 'retail',
        description: 'Shopping & Retail Stores',
        icon: 'ShoppingBag',
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'services' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Services',
        slug: 'services',
        description: 'Professional & Personal Services',
        icon: 'Wrench',
        sortOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'technology' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Technology',
        slug: 'technology',
        description: 'Tech Companies & Startups',
        icon: 'Cpu',
        sortOrder: 5,
      },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'education' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Education',
        slug: 'education',
        description: 'Schools, Training & Tutoring',
        icon: 'GraduationCap',
        sortOrder: 6,
      },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'entertainment' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Entertainment',
        slug: 'entertainment',
        description: 'Entertainment & Recreation',
        icon: 'Music',
        sortOrder: 7,
      },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'finance' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Finance',
        slug: 'finance',
        description: 'Banking & Financial Services',
        icon: 'Landmark',
        sortOrder: 8,
      },
    }),
  ]);
  console.log(`✅ ${categories.length} categories created`);

  // ── Businesses ──────────────────────────────────────────
  const businessOwner = users[1]; // Jane Business
  const businesses = await Promise.all([
    prisma.business.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'sunrise-cafe' } },
      update: {},
      create: {
        tenantId: tenant.id,
        ownerId: businessOwner.id,
        categoryId: categories[0].id,
        name: 'Sunrise Café',
        slug: 'sunrise-cafe',
        description: 'Artisan coffee and fresh pastries in a cozy atmosphere.',
        status: BusinessStatus.APPROVED,
        address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        latitude: 19.076,
        longitude: 72.8777,
        phone: '+91-22-12345678',
        email: 'hello@sunrisecafe.com',
        website: 'https://sunrisecafe.com',
        averageRating: 4.5,
        totalReviews: 128,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    prisma.business.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'metro-health-clinic' } },
      update: {},
      create: {
        tenantId: tenant.id,
        ownerId: businessOwner.id,
        categoryId: categories[1].id,
        name: 'Metro Health Clinic',
        slug: 'metro-health-clinic',
        description: 'Comprehensive healthcare services for the whole family.',
        status: BusinessStatus.APPROVED,
        address: '456 Park Ave',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        latitude: 28.6139,
        longitude: 77.209,
        phone: '+91-11-98765432',
        email: 'info@metrohealth.com',
        averageRating: 4.2,
        totalReviews: 89,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    prisma.business.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'techmart-electronics' } },
      update: {},
      create: {
        tenantId: tenant.id,
        ownerId: businessOwner.id,
        categoryId: categories[2].id,
        name: 'TechMart Electronics',
        slug: 'techmart-electronics',
        description: 'Latest gadgets and electronics at competitive prices.',
        status: BusinessStatus.PENDING,
        address: '789 Tech Blvd',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        phone: '+91-80-11223344',
        email: 'sales@techmart.com',
        averageRating: 0,
        totalReviews: 0,
      },
    }),
  ]);
  console.log(`✅ ${businesses.length} businesses created`);

  // ── Offers ──────────────────────────────────────────────
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await Promise.all([
    prisma.offer.create({
      data: {
        businessId: businesses[0].id,
        title: '20% Off Breakfast',
        description: 'Start your day right with 20% off all breakfast items',
        discountPercent: 20,
        status: OfferStatus.ACTIVE,
        startDate: now,
        endDate: nextMonth,
        code: 'MORNING20',
        maxRedemptions: 500,
      },
    }),
    prisma.offer.create({
      data: {
        businessId: businesses[1].id,
        title: 'Free Health Checkup',
        description: 'Get a free basic health checkup with any consultation',
        status: OfferStatus.ACTIVE,
        startDate: now,
        endDate: nextMonth,
        maxRedemptions: 200,
      },
    }),
  ]);
  console.log('✅ Offers created');

  // ── Feature Flags ───────────────────────────────────────
  await Promise.all([
    prisma.featureFlag.upsert({
      where: { key: 'enable_bill_upload' },
      update: {},
      create: {
        key: 'enable_bill_upload',
        name: 'Bill Upload',
        description: 'Allow users to upload bills for verification',
        isEnabled: true,
      },
    }),
    prisma.featureFlag.upsert({
      where: { key: 'enable_nearby_search' },
      update: {},
      create: {
        key: 'enable_nearby_search',
        name: 'Nearby Search',
        description: 'Enable geo-based nearby business search',
        isEnabled: true,
      },
    }),
    prisma.featureFlag.upsert({
      where: { key: 'enable_push_notifications' },
      update: {},
      create: {
        key: 'enable_push_notifications',
        name: 'Push Notifications',
        description: 'Enable FCM push notifications',
        isEnabled: false,
      },
    }),
    prisma.featureFlag.upsert({
      where: { key: 'enable_ai_fraud_detection' },
      update: {},
      create: {
        key: 'enable_ai_fraud_detection',
        name: 'AI Fraud Detection',
        description: 'Enable AI-powered fraud detection on reviews',
        isEnabled: false,
      },
    }),
  ]);
  console.log('✅ Feature flags created');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📧 Test Credentials:');
  console.log('  Public User:     user@platform.com / password123');
  console.log('  Business Owner:  business@platform.com / password123');
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
