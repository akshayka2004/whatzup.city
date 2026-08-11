-- CreateEnum
CREATE TYPE "PlatformOfferCategory" AS ENUM ('SADYA', 'CLOTHING', 'ELECTRONICS', 'STAYCATION');

-- CreateEnum
CREATE TYPE "PlatformOfferStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "platform_offers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category" "PlatformOfferCategory" NOT NULL,
    "sub_type" VARCHAR(30),
    "title" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "price" VARCHAR(120),
    "phone" VARCHAR(30),
    "image_url" TEXT,
    "description" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "status" "PlatformOfferStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "platform_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_offers_tenant_id_idx" ON "platform_offers"("tenant_id");

-- CreateIndex
CREATE INDEX "platform_offers_category_idx" ON "platform_offers"("category");

-- CreateIndex
CREATE INDEX "platform_offers_status_idx" ON "platform_offers"("status");

-- CreateIndex
CREATE INDEX "platform_offers_deleted_at_idx" ON "platform_offers"("deleted_at");

-- AddForeignKey
ALTER TABLE "platform_offers" ADD CONSTRAINT "platform_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

