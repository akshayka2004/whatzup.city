-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserRoleEnum" AS ENUM ('USER', 'BUSINESS_OWNER', 'BUSINESS_MODERATOR', 'BUSINESS_STAFF', 'MASTER_ADMIN', 'SUPER_ADMIN', 'GOVERNMENT_ADMIN', 'INFLUENCER', 'PROFESSIONAL', 'EVENT_ORGANIZER', 'ORGANIZATION_ADMIN', 'NGO_ADMIN', 'COMMUNITY_ADMIN', 'NEWS_FORUM_ADMIN', 'BUSINESS_ADMIN');

-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'MODERATOR', 'STAFF');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CUSTOMER', 'BUSINESS', 'INFLUENCER', 'PROFESSIONAL', 'EVENT_ORGANIZER', 'ORGANIZATION', 'GOVERNMENT', 'NGO', 'COMMUNITY', 'NEWS_FORUM');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BusinessProfileType" AS ENUM ('OWNER', 'AGENCY', 'STAFF');

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REMOVED');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'RE_UPLOAD_REQUESTED', 'ESCALATED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255),
    "logo" TEXT,
    "settings" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "avatar" TEXT,
    "role" "UserRoleEnum" NOT NULL DEFAULT 'USER',
    "profession" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "referral_code" VARCHAR(20),
    "referred_by" UUID,
    "accepted_terms_at" TIMESTAMP(3),
    "accepted_privacy_at" TIMESTAMP(3),
    "terms_version" VARCHAR(20),
    "privacy_policy_version" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "state" VARCHAR(100),
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "status" "CustomerStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_logins" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_type" VARCHAR(100) NOT NULL,
    "device_token" TEXT,
    "os" VARCHAR(50),
    "browser" VARCHAR(50),
    "ip_address" VARCHAR(45),
    "last_login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "device_logins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "entity_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "zip_code" VARCHAR(20) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "phone" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "website" TEXT,
    "owner_name" VARCHAR(255),
    "district" VARCHAR(100),
    "google_maps_url" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "subcategory_ids" JSONB NOT NULL DEFAULT '[]',
    "halal_status" VARCHAR(20),
    "profile_type" "BusinessProfileType" NOT NULL DEFAULT 'OWNER',
    "logo" TEXT,
    "cover_image" TEXT,
    "operating_hours" JSONB,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "featured_until" TIMESTAMP(3),
    "parent_business_id" UUID,
    "trial_status" "TrialStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "trial_start_date" TIMESTAMP(3),
    "trial_end_date" TIMESTAMP(3),
    "has_intro_offer" BOOLEAN NOT NULL DEFAULT false,
    "intro_offer_claimed_at" TIMESTAMP(3),
    "intro_offer_redeemed" BOOLEAN NOT NULL DEFAULT false,
    "intro_offer_discount_pct" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_tags" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "parent_business_id" UUID,
    "branch_business_id" UUID,
    "first_interaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_interaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offers_claimed_count" INTEGER NOT NULL DEFAULT 0,
    "offers_redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "total_verified_purchases" INTEGER NOT NULL DEFAULT 0,
    "referral_source" VARCHAR(100),
    "customer_status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "business_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_branches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL DEFAULT '',
    "state" VARCHAR(100) NOT NULL DEFAULT '',
    "zip_code" VARCHAR(20) NOT NULL DEFAULT '',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "manager_name" VARCHAR(255),
    "manager_phone" VARCHAR(50),
    "manager_email" VARCHAR(255),
    "operating_hours" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "business_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_url" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "document_number" VARCHAR(100),
    "issued_authority" VARCHAR(255),
    "expiry_date" TIMESTAMP(3),
    "document_category" VARCHAR(100),
    "document_subtype" VARCHAR(100),
    "verification_status" VARCHAR(50),
    "verification_notes" TEXT,
    "uploaded_by" UUID,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "issue_date" TIMESTAMP(3),
    "document_path" TEXT,
    "bucket_name" VARCHAR(100),
    "storage_key" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "business_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_staff" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'STAFF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "business_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "category_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "discount_percent" INTEGER,
    "discount_amount" DECIMAL(12,2),
    "code" VARCHAR(50),
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "max_redemptions" INTEGER,
    "current_redemptions" INTEGER NOT NULL DEFAULT 0,
    "terms" TEXT,
    "target_cities" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_redemptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'REDEEMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "offer_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" VARCHAR(255),
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_media" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_votes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vote_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL,
    "bill_image" TEXT NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UPLOADED',
    "description" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_verifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "business_id" UUID,
    "status" "BillVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "moderator_id" UUID,
    "owner_override_by" UUID,
    "owner_override_at" TIMESTAMP(3),
    "re_upload_requested_at" TIMESTAMP(3),
    "escalation_level" VARCHAR(20) NOT NULL DEFAULT 'NONE',
    "ocr_metadata" JSONB,
    "fraud_score" DECIMAL(3,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "bill_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_purchases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "verified_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_announcements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "publish_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "target_audience" JSONB,
    "target_cities" JSONB NOT NULL DEFAULT '[]',
    "link_url" TEXT,
    "start_at" TIMESTAMP(3),
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "government_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(255),
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "business_id" UUID,
    "event" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "session_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_histories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "query" VARCHAR(255) NOT NULL,
    "filters" JSONB,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "resolution" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" UUID,
    "old_data" JSONB,
    "new_data" JSONB,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action_type" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_flags" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'LOW',
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "fraud_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID,
    "entity_id" UUID,
    "plan_id" UUID,
    "packageName" VARCHAR(100) NOT NULL,
    "pricing" DECIMAL(12,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "featureFlags" JSONB NOT NULL DEFAULT '{}',
    "postingLimits" INTEGER NOT NULL DEFAULT 0,
    "categoryLimits" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "transaction_ref" VARCHAR(255),
    "invoice_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "steps_completed" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "EntityType" NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'DRAFT',
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "entity_type" "EntityType" NOT NULL DEFAULT 'BUSINESS',
    "price" DECIMAL(12,2) NOT NULL,
    "billing_cycle" TEXT NOT NULL DEFAULT 'YEARLY',
    "features" JSONB NOT NULL DEFAULT '{}',
    "limits" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_url" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "document_number" VARCHAR(100),
    "issued_authority" VARCHAR(255),
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploaded_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_verification_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "moderation_notes" TEXT,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencer_profiles" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "niche" VARCHAR(100) NOT NULL,
    "instagram" VARCHAR(255),
    "youtube" VARCHAR(255),
    "facebook" VARCHAR(255),
    "linkedin" VARCHAR(255),
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DECIMAL(5,2),
    "portfolio_url" TEXT,
    "media_kit_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "influencer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "pricing_min" DECIMAL(12,2),
    "pricing_max" DECIMAL(12,2),
    "availability" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_organizer_profiles" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "organization_name" VARCHAR(255) NOT NULL,
    "event_categories" JSONB NOT NULL DEFAULT '[]',
    "venue_partnerships" JSONB NOT NULL DEFAULT '[]',
    "ticketing_support" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "previous_events" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_organizer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_profiles" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "ngo_name" VARCHAR(255) NOT NULL,
    "registration_number" VARCHAR(100) NOT NULL,
    "cause_category" VARCHAR(100) NOT NULL,
    "operational_areas" JSONB NOT NULL DEFAULT '[]',
    "website" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_profiles" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "department_name" VARCHAR(255) NOT NULL,
    "official_email" VARCHAR(255) NOT NULL,
    "department_type" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civic_profiles" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "organization_type" VARCHAR(50) NOT NULL,
    "organization_name" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(255),
    "registration_number" VARCHAR(100),
    "description" TEXT,
    "address" TEXT,
    "district" VARCHAR(100),
    "website" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "logo_url" TEXT,
    "banner_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civic_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launch_individual_interests" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "interests" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "launch_individual_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launch_business_interests" (
    "id" UUID NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "contact_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "website" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "launch_business_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_spending_summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "total_spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "spend_last_30_days" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "spend_last_90_days" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "spend_last_365_days" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "verified_bill_count" INTEGER NOT NULL DEFAULT 0,
    "offers_claimed_count" INTEGER NOT NULL DEFAULT 0,
    "offers_redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "primary_spend_category" VARCHAR(100),
    "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category_breakdown" JSONB NOT NULL DEFAULT '{}',
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_spending_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_analytics_summaries" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "referral_code" VARCHAR(20) NOT NULL,
    "total_referrals" INTEGER NOT NULL DEFAULT 0,
    "successful_referrals" INTEGER NOT NULL DEFAULT 0,
    "active_referrals" INTEGER NOT NULL DEFAULT 0,
    "referral_conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_referral_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_analytics_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_analytics_summaries" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_count" INTEGER NOT NULL DEFAULT 0,
    "new_customers" INTEGER NOT NULL DEFAULT 0,
    "returning_customers" INTEGER NOT NULL DEFAULT 0,
    "offer_claims" INTEGER NOT NULL DEFAULT 0,
    "offer_redemptions" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verified_bill_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "branch_count" INTEGER NOT NULL DEFAULT 0,
    "referral_count" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_analytics_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_analytics_summaries" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_count" INTEGER NOT NULL DEFAULT 0,
    "offer_claims" INTEGER NOT NULL DEFAULT 0,
    "offer_redemptions" INTEGER NOT NULL DEFAULT 0,
    "verified_bill_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "referral_count" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_analytics_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "poster_image" TEXT,
    "venue" VARCHAR(255),
    "city" VARCHAR(100),
    "target_cities" JSONB NOT NULL DEFAULT '[]',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_url" TEXT,
    "ticket_url" TEXT,
    "registration_clicks" INTEGER NOT NULL DEFAULT 0,
    "ticket_clicks" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_clicks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_deleted_at_idx" ON "tenants"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_referral_code_idx" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_referred_by_idx" ON "users"("referred_by");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_status_idx" ON "customers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "customers_tenant_id_city_state_idx" ON "customers"("tenant_id", "city", "state");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_email_key" ON "customers"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_phone_key" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_code_key" ON "roles"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "permissions_tenant_id_idx" ON "permissions"("tenant_id");

-- CreateIndex
CREATE INDEX "permissions_deleted_at_idx" ON "permissions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_resource_action_key" ON "permissions"("tenant_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_name_key" ON "permissions"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_idx" ON "user_roles"("tenant_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_deleted_at_idx" ON "user_roles"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_tenant_id_user_id_role_id_key" ON "user_roles"("tenant_id", "user_id", "role_id");

-- CreateIndex
CREATE INDEX "role_permissions_tenant_id_idx" ON "role_permissions"("tenant_id");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "role_permissions_deleted_at_idx" ON "role_permissions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_tenant_id_role_id_permission_id_key" ON "role_permissions"("tenant_id", "role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_tenant_id_idx" ON "sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_refresh_token_idx" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_deleted_at_idx" ON "sessions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_tenant_id_idx" ON "refresh_tokens"("tenant_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_deleted_at_idx" ON "refresh_tokens"("deleted_at");

-- CreateIndex
CREATE INDEX "device_logins_tenant_id_idx" ON "device_logins"("tenant_id");

-- CreateIndex
CREATE INDEX "device_logins_user_id_idx" ON "device_logins"("user_id");

-- CreateIndex
CREATE INDEX "device_logins_deleted_at_idx" ON "device_logins"("deleted_at");

-- CreateIndex
CREATE INDEX "business_categories_tenant_id_idx" ON "business_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "business_categories_parent_id_idx" ON "business_categories"("parent_id");

-- CreateIndex
CREATE INDEX "business_categories_deleted_at_idx" ON "business_categories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_categories_tenant_id_slug_key" ON "business_categories"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_entity_id_key" ON "businesses"("entity_id");

-- CreateIndex
CREATE INDEX "businesses_tenant_id_idx" ON "businesses"("tenant_id");

-- CreateIndex
CREATE INDEX "businesses_owner_id_idx" ON "businesses"("owner_id");

-- CreateIndex
CREATE INDEX "businesses_category_id_idx" ON "businesses"("category_id");

-- CreateIndex
CREATE INDEX "businesses_status_idx" ON "businesses"("status");

-- CreateIndex
CREATE INDEX "businesses_city_state_idx" ON "businesses"("city", "state");

-- CreateIndex
CREATE INDEX "businesses_district_idx" ON "businesses"("district");

-- CreateIndex
CREATE INDEX "businesses_average_rating_idx" ON "businesses"("average_rating");

-- CreateIndex
CREATE INDEX "businesses_deleted_at_idx" ON "businesses"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_tenant_id_slug_key" ON "businesses"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_tenant_id_email_key" ON "businesses"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_tenant_id_phone_key" ON "businesses"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "business_tags_tenant_id_idx" ON "business_tags"("tenant_id");

-- CreateIndex
CREATE INDEX "business_tags_business_id_idx" ON "business_tags"("business_id");

-- CreateIndex
CREATE INDEX "business_tags_tenant_id_tag_idx" ON "business_tags"("tenant_id", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "business_tags_tenant_id_business_id_tag_key" ON "business_tags"("tenant_id", "business_id", "tag");

-- CreateIndex
CREATE INDEX "business_customers_tenant_id_business_id_idx" ON "business_customers"("tenant_id", "business_id");

-- CreateIndex
CREATE INDEX "business_customers_tenant_id_user_id_idx" ON "business_customers"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "business_customers_tenant_id_business_id_customer_status_idx" ON "business_customers"("tenant_id", "business_id", "customer_status");

-- CreateIndex
CREATE INDEX "business_customers_last_interaction_date_idx" ON "business_customers"("last_interaction_date");

-- CreateIndex
CREATE INDEX "business_customers_deleted_at_idx" ON "business_customers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_customers_tenant_id_user_id_business_id_key" ON "business_customers"("tenant_id", "user_id", "business_id");

-- CreateIndex
CREATE INDEX "business_branches_tenant_id_idx" ON "business_branches"("tenant_id");

-- CreateIndex
CREATE INDEX "business_branches_business_id_idx" ON "business_branches"("business_id");

-- CreateIndex
CREATE INDEX "business_branches_deleted_at_idx" ON "business_branches"("deleted_at");

-- CreateIndex
CREATE INDEX "business_documents_tenant_id_idx" ON "business_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "business_documents_business_id_idx" ON "business_documents"("business_id");

-- CreateIndex
CREATE INDEX "business_documents_status_idx" ON "business_documents"("status");

-- CreateIndex
CREATE INDEX "business_documents_deleted_at_idx" ON "business_documents"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_documents_tenant_id_business_id_document_type_docu_key" ON "business_documents"("tenant_id", "business_id", "document_type", "document_number");

-- CreateIndex
CREATE INDEX "business_staff_tenant_id_idx" ON "business_staff"("tenant_id");

-- CreateIndex
CREATE INDEX "business_staff_business_id_idx" ON "business_staff"("business_id");

-- CreateIndex
CREATE INDEX "business_staff_user_id_idx" ON "business_staff"("user_id");

-- CreateIndex
CREATE INDEX "business_staff_deleted_at_idx" ON "business_staff"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_staff_tenant_id_business_id_user_id_key" ON "business_staff"("tenant_id", "business_id", "user_id");

-- CreateIndex
CREATE INDEX "verification_requests_tenant_id_idx" ON "verification_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "verification_requests_business_id_idx" ON "verification_requests"("business_id");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE INDEX "verification_requests_deleted_at_idx" ON "verification_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "product_categories_tenant_id_idx" ON "product_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "product_categories_business_id_idx" ON "product_categories"("business_id");

-- CreateIndex
CREATE INDEX "product_categories_deleted_at_idx" ON "product_categories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenant_id_business_id_slug_key" ON "product_categories"("tenant_id", "business_id", "slug");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");

-- CreateIndex
CREATE INDEX "products_business_id_idx" ON "products"("business_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");

-- CreateIndex
CREATE INDEX "offers_tenant_id_idx" ON "offers"("tenant_id");

-- CreateIndex
CREATE INDEX "offers_business_id_idx" ON "offers"("business_id");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE INDEX "offers_start_date_end_date_idx" ON "offers"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "offers_deleted_at_idx" ON "offers"("deleted_at");

-- CreateIndex
CREATE INDEX "offer_redemptions_tenant_id_idx" ON "offer_redemptions"("tenant_id");

-- CreateIndex
CREATE INDEX "offer_redemptions_offer_id_idx" ON "offer_redemptions"("offer_id");

-- CreateIndex
CREATE INDEX "offer_redemptions_user_id_idx" ON "offer_redemptions"("user_id");

-- CreateIndex
CREATE INDEX "offer_redemptions_deleted_at_idx" ON "offer_redemptions"("deleted_at");

-- CreateIndex
CREATE INDEX "offer_redemptions_tenant_id_user_id_deleted_at_idx" ON "offer_redemptions"("tenant_id", "user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "offer_redemptions_tenant_id_offer_id_user_id_idx" ON "offer_redemptions"("tenant_id", "offer_id", "user_id");

-- CreateIndex
CREATE INDEX "coupons_tenant_id_idx" ON "coupons"("tenant_id");

-- CreateIndex
CREATE INDEX "coupons_business_id_idx" ON "coupons"("business_id");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_deleted_at_idx" ON "coupons"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_tenant_id_business_id_code_key" ON "coupons"("tenant_id", "business_id", "code");

-- CreateIndex
CREATE INDEX "reviews_tenant_id_idx" ON "reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_business_id_idx" ON "reviews"("business_id");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_deleted_at_idx" ON "reviews"("deleted_at");

-- CreateIndex
CREATE INDEX "review_media_tenant_id_idx" ON "review_media"("tenant_id");

-- CreateIndex
CREATE INDEX "review_media_review_id_idx" ON "review_media"("review_id");

-- CreateIndex
CREATE INDEX "review_media_deleted_at_idx" ON "review_media"("deleted_at");

-- CreateIndex
CREATE INDEX "review_votes_tenant_id_idx" ON "review_votes"("tenant_id");

-- CreateIndex
CREATE INDEX "review_votes_review_id_idx" ON "review_votes"("review_id");

-- CreateIndex
CREATE INDEX "review_votes_user_id_idx" ON "review_votes"("user_id");

-- CreateIndex
CREATE INDEX "review_votes_deleted_at_idx" ON "review_votes"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_tenant_id_review_id_user_id_key" ON "review_votes"("tenant_id", "review_id", "user_id");

-- CreateIndex
CREATE INDEX "bookmarks_tenant_id_idx" ON "bookmarks"("tenant_id");

-- CreateIndex
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "bookmarks_business_id_idx" ON "bookmarks"("business_id");

-- CreateIndex
CREATE INDEX "bookmarks_deleted_at_idx" ON "bookmarks"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_tenant_id_user_id_business_id_key" ON "bookmarks"("tenant_id", "user_id", "business_id");

-- CreateIndex
CREATE INDEX "favorites_tenant_id_idx" ON "favorites"("tenant_id");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_deleted_at_idx" ON "favorites"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_tenant_id_user_id_business_id_key" ON "favorites"("tenant_id", "user_id", "business_id");

-- CreateIndex
CREATE INDEX "user_follows_tenant_id_idx" ON "user_follows"("tenant_id");

-- CreateIndex
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows"("follower_id");

-- CreateIndex
CREATE INDEX "user_follows_following_id_idx" ON "user_follows"("following_id");

-- CreateIndex
CREATE INDEX "user_follows_deleted_at_idx" ON "user_follows"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_tenant_id_follower_id_following_id_key" ON "user_follows"("tenant_id", "follower_id", "following_id");

-- CreateIndex
CREATE INDEX "bills_tenant_id_idx" ON "bills"("tenant_id");

-- CreateIndex
CREATE INDEX "bills_user_id_idx" ON "bills"("user_id");

-- CreateIndex
CREATE INDEX "bills_business_id_idx" ON "bills"("business_id");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bills_deleted_at_idx" ON "bills"("deleted_at");

-- CreateIndex
CREATE INDEX "bill_items_tenant_id_idx" ON "bill_items"("tenant_id");

-- CreateIndex
CREATE INDEX "bill_items_bill_id_idx" ON "bill_items"("bill_id");

-- CreateIndex
CREATE INDEX "bill_items_deleted_at_idx" ON "bill_items"("deleted_at");

-- CreateIndex
CREATE INDEX "bill_verifications_tenant_id_idx" ON "bill_verifications"("tenant_id");

-- CreateIndex
CREATE INDEX "bill_verifications_bill_id_idx" ON "bill_verifications"("bill_id");

-- CreateIndex
CREATE INDEX "bill_verifications_business_id_idx" ON "bill_verifications"("business_id");

-- CreateIndex
CREATE INDEX "bill_verifications_status_idx" ON "bill_verifications"("status");

-- CreateIndex
CREATE INDEX "bill_verifications_escalation_level_idx" ON "bill_verifications"("escalation_level");

-- CreateIndex
CREATE INDEX "bill_verifications_deleted_at_idx" ON "bill_verifications"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "verified_purchases_bill_id_key" ON "verified_purchases"("bill_id");

-- CreateIndex
CREATE INDEX "verified_purchases_tenant_id_idx" ON "verified_purchases"("tenant_id");

-- CreateIndex
CREATE INDEX "verified_purchases_user_id_idx" ON "verified_purchases"("user_id");

-- CreateIndex
CREATE INDEX "verified_purchases_business_id_idx" ON "verified_purchases"("business_id");

-- CreateIndex
CREATE INDEX "verified_purchases_deleted_at_idx" ON "verified_purchases"("deleted_at");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_deleted_at_idx" ON "notifications"("deleted_at");

-- CreateIndex
CREATE INDEX "notification_recipients_tenant_id_idx" ON "notification_recipients"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_recipients_user_id_idx" ON "notification_recipients"("user_id");

-- CreateIndex
CREATE INDEX "notification_recipients_notification_id_idx" ON "notification_recipients"("notification_id");

-- CreateIndex
CREATE INDEX "notification_recipients_deleted_at_idx" ON "notification_recipients"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_tenant_id_notification_id_user_id_key" ON "notification_recipients"("tenant_id", "notification_id", "user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_idx" ON "notification_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_deleted_at_idx" ON "notification_preferences"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_user_id_channel_type_key" ON "notification_preferences"("tenant_id", "user_id", "channel", "type");

-- CreateIndex
CREATE INDEX "government_announcements_tenant_id_idx" ON "government_announcements"("tenant_id");

-- CreateIndex
CREATE INDEX "government_announcements_is_published_publish_at_idx" ON "government_announcements"("is_published", "publish_at");

-- CreateIndex
CREATE INDEX "government_announcements_category_idx" ON "government_announcements"("category");

-- CreateIndex
CREATE INDEX "government_announcements_deleted_at_idx" ON "government_announcements"("deleted_at");

-- CreateIndex
CREATE INDEX "media_tenant_id_idx" ON "media"("tenant_id");

-- CreateIndex
CREATE INDEX "media_business_id_idx" ON "media"("business_id");

-- CreateIndex
CREATE INDEX "media_deleted_at_idx" ON "media"("deleted_at");

-- CreateIndex
CREATE INDEX "analytics_events_tenant_id_idx" ON "analytics_events"("tenant_id");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events"("user_id");

-- CreateIndex
CREATE INDEX "analytics_events_business_id_idx" ON "analytics_events"("business_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_idx" ON "analytics_events"("event");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "analytics_events_deleted_at_idx" ON "analytics_events"("deleted_at");

-- CreateIndex
CREATE INDEX "analytics_events_tenant_id_business_id_event_idx" ON "analytics_events"("tenant_id", "business_id", "event");

-- CreateIndex
CREATE INDEX "analytics_events_tenant_id_business_id_created_at_idx" ON "analytics_events"("tenant_id", "business_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_tenant_id_event_created_at_idx" ON "analytics_events"("tenant_id", "event", "created_at");

-- CreateIndex
CREATE INDEX "business_metrics_tenant_id_idx" ON "business_metrics"("tenant_id");

-- CreateIndex
CREATE INDEX "business_metrics_business_id_idx" ON "business_metrics"("business_id");

-- CreateIndex
CREATE INDEX "business_metrics_deleted_at_idx" ON "business_metrics"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_tenant_id_business_id_date_key" ON "business_metrics"("tenant_id", "business_id", "date");

-- CreateIndex
CREATE INDEX "user_activities_tenant_id_idx" ON "user_activities"("tenant_id");

-- CreateIndex
CREATE INDEX "user_activities_user_id_idx" ON "user_activities"("user_id");

-- CreateIndex
CREATE INDEX "user_activities_activity_type_idx" ON "user_activities"("activity_type");

-- CreateIndex
CREATE INDEX "user_activities_deleted_at_idx" ON "user_activities"("deleted_at");

-- CreateIndex
CREATE INDEX "search_histories_tenant_id_idx" ON "search_histories"("tenant_id");

-- CreateIndex
CREATE INDEX "search_histories_user_id_idx" ON "search_histories"("user_id");

-- CreateIndex
CREATE INDEX "search_histories_query_idx" ON "search_histories"("query");

-- CreateIndex
CREATE INDEX "search_histories_deleted_at_idx" ON "search_histories"("deleted_at");

-- CreateIndex
CREATE INDEX "moderation_reports_tenant_id_idx" ON "moderation_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "moderation_reports_reporter_id_idx" ON "moderation_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "moderation_reports_target_type_target_id_idx" ON "moderation_reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_reports_status_idx" ON "moderation_reports"("status");

-- CreateIndex
CREATE INDEX "moderation_reports_deleted_at_idx" ON "moderation_reports"("deleted_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_actions_tenant_id_idx" ON "admin_actions"("tenant_id");

-- CreateIndex
CREATE INDEX "admin_actions_admin_id_idx" ON "admin_actions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_actions_target_type_target_id_idx" ON "admin_actions"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "admin_actions_deleted_at_idx" ON "admin_actions"("deleted_at");

-- CreateIndex
CREATE INDEX "fraud_flags_tenant_id_idx" ON "fraud_flags"("tenant_id");

-- CreateIndex
CREATE INDEX "fraud_flags_target_type_target_id_idx" ON "fraud_flags"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "fraud_flags_status_idx" ON "fraud_flags"("status");

-- CreateIndex
CREATE INDEX "fraud_flags_deleted_at_idx" ON "fraud_flags"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_tenant_id_idx" ON "feature_flags"("tenant_id");

-- CreateIndex
CREATE INDEX "feature_flags_deleted_at_idx" ON "feature_flags"("deleted_at");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_business_id_idx" ON "subscriptions"("business_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_end_date_idx" ON "subscriptions"("status", "end_date");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_deleted_at_idx" ON "subscriptions"("deleted_at");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_business_id_idx" ON "payments"("business_id");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_deleted_at_idx" ON "payments"("deleted_at");

-- CreateIndex
CREATE INDEX "onboarding_progress_tenant_id_idx" ON "onboarding_progress"("tenant_id");

-- CreateIndex
CREATE INDEX "onboarding_progress_entity_type_current_step_idx" ON "onboarding_progress"("entity_type", "current_step");

-- CreateIndex
CREATE INDEX "onboarding_progress_status_idx" ON "onboarding_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_tenant_id_entity_type_entity_id_key" ON "onboarding_progress"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "onboarding_events_tenant_id_idx" ON "onboarding_events"("tenant_id");

-- CreateIndex
CREATE INDEX "onboarding_events_entity_type_entity_id_idx" ON "onboarding_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "onboarding_events_event_idx" ON "onboarding_events"("event");

-- CreateIndex
CREATE INDEX "entities_tenant_id_idx" ON "entities"("tenant_id");

-- CreateIndex
CREATE INDEX "entities_user_id_idx" ON "entities"("user_id");

-- CreateIndex
CREATE INDEX "entities_type_idx" ON "entities"("type");

-- CreateIndex
CREATE INDEX "entities_status_idx" ON "entities"("status");

-- CreateIndex
CREATE INDEX "entities_deleted_at_idx" ON "entities"("deleted_at");

-- CreateIndex
CREATE INDEX "plans_tenant_id_idx" ON "plans"("tenant_id");

-- CreateIndex
CREATE INDEX "plans_deleted_at_idx" ON "plans"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "plans_tenant_id_code_key" ON "plans"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "uploaded_documents_tenant_id_idx" ON "uploaded_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "uploaded_documents_entity_id_idx" ON "uploaded_documents"("entity_id");

-- CreateIndex
CREATE INDEX "uploaded_documents_status_idx" ON "uploaded_documents"("status");

-- CreateIndex
CREATE INDEX "entity_verification_requests_tenant_id_idx" ON "entity_verification_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "entity_verification_requests_entity_id_idx" ON "entity_verification_requests"("entity_id");

-- CreateIndex
CREATE INDEX "entity_verification_requests_status_idx" ON "entity_verification_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "influencer_profiles_entity_id_key" ON "influencer_profiles"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_entity_id_key" ON "professional_profiles"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_organizer_profiles_entity_id_key" ON "event_organizer_profiles"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_profiles_entity_id_key" ON "organization_profiles"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "government_profiles_entity_id_key" ON "government_profiles"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "civic_profiles_entity_id_key" ON "civic_profiles"("entity_id");

-- CreateIndex
CREATE INDEX "civic_profiles_organization_type_idx" ON "civic_profiles"("organization_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_spending_summaries_user_id_key" ON "user_spending_summaries"("user_id");

-- CreateIndex
CREATE INDEX "user_spending_summaries_tenant_id_idx" ON "user_spending_summaries"("tenant_id");

-- CreateIndex
CREATE INDEX "user_spending_summaries_tenant_id_total_spend_idx" ON "user_spending_summaries"("tenant_id", "total_spend");

-- CreateIndex
CREATE INDEX "user_spending_summaries_tenant_id_engagement_score_idx" ON "user_spending_summaries"("tenant_id", "engagement_score");

-- CreateIndex
CREATE UNIQUE INDEX "referral_analytics_summaries_entity_id_key" ON "referral_analytics_summaries"("entity_id");

-- CreateIndex
CREATE INDEX "referral_analytics_summaries_entity_type_successful_referra_idx" ON "referral_analytics_summaries"("entity_type", "successful_referrals");

-- CreateIndex
CREATE INDEX "referral_analytics_summaries_referral_code_idx" ON "referral_analytics_summaries"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "business_analytics_summaries_business_id_key" ON "business_analytics_summaries"("business_id");

-- CreateIndex
CREATE INDEX "business_analytics_summaries_tenant_id_idx" ON "business_analytics_summaries"("tenant_id");

-- CreateIndex
CREATE INDEX "business_analytics_summaries_tenant_id_customer_count_idx" ON "business_analytics_summaries"("tenant_id", "customer_count");

-- CreateIndex
CREATE UNIQUE INDEX "branch_analytics_summaries_branch_id_key" ON "branch_analytics_summaries"("branch_id");

-- CreateIndex
CREATE INDEX "branch_analytics_summaries_tenant_id_idx" ON "branch_analytics_summaries"("tenant_id");

-- CreateIndex
CREATE INDEX "events_tenant_id_idx" ON "events"("tenant_id");

-- CreateIndex
CREATE INDEX "events_business_id_idx" ON "events"("business_id");

-- CreateIndex
CREATE INDEX "events_status_end_date_idx" ON "events"("status", "end_date");

-- CreateIndex
CREATE INDEX "events_deleted_at_idx" ON "events"("deleted_at");

-- CreateIndex
CREATE INDEX "event_clicks_event_id_idx" ON "event_clicks"("event_id");

-- CreateIndex
CREATE INDEX "event_clicks_tenant_id_idx" ON "event_clicks"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_logins" ADD CONSTRAINT "device_logins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_logins" ADD CONSTRAINT "device_logins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "business_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "business_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_parent_business_id_fkey" FOREIGN KEY ("parent_business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tags" ADD CONSTRAINT "business_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tags" ADD CONSTRAINT "business_tags_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_customers" ADD CONSTRAINT "business_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_customers" ADD CONSTRAINT "business_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_customers" ADD CONSTRAINT "business_customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_branches" ADD CONSTRAINT "business_branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_branches" ADD CONSTRAINT "business_branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_staff" ADD CONSTRAINT "business_staff_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_staff" ADD CONSTRAINT "business_staff_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_staff" ADD CONSTRAINT "business_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_verifications" ADD CONSTRAINT "bill_verifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_verifications" ADD CONSTRAINT "bill_verifications_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_verifications" ADD CONSTRAINT "bill_verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_purchases" ADD CONSTRAINT "verified_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_purchases" ADD CONSTRAINT "verified_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_purchases" ADD CONSTRAINT "verified_purchases_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_purchases" ADD CONSTRAINT "verified_purchases_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_announcements" ADD CONSTRAINT "government_announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_histories" ADD CONSTRAINT "search_histories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_histories" ADD CONSTRAINT "search_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_events" ADD CONSTRAINT "onboarding_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_events" ADD CONSTRAINT "onboarding_events_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_verification_requests" ADD CONSTRAINT "entity_verification_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_verification_requests" ADD CONSTRAINT "entity_verification_requests_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_verification_requests" ADD CONSTRAINT "entity_verification_requests_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_profiles" ADD CONSTRAINT "influencer_profiles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_organizer_profiles" ADD CONSTRAINT "event_organizer_profiles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_profiles" ADD CONSTRAINT "government_profiles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civic_profiles" ADD CONSTRAINT "civic_profiles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_clicks" ADD CONSTRAINT "event_clicks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_clicks" ADD CONSTRAINT "event_clicks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

