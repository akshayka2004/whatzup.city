-- Brand accounts: several outlets (each a full Business listing) grouped under one Brand.
-- Also: Bill.billNumber (duplicate detection) and User.activeBusinessId (outlet switcher).
-- Purely additive: new tables, nullable columns, defaulted columns.

-- CreateEnum
CREATE TYPE "BrandBillSeriesMode" AS ENUM ('SHARED', 'PER_OUTLET');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_business_id" UUID;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "brand_id" UUID,
ADD COLUMN     "brand_prompt_at" TIMESTAMP(3),
ADD COLUMN     "brand_prompt_status" VARCHAR(20),
ADD COLUMN     "is_brand_hq" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "outlet_label" VARCHAR(100);

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "bill_number" VARCHAR(60);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "bill_series_mode" "BrandBillSeriesMode" NOT NULL DEFAULT 'PER_OUTLET',
    "bill_series_prefix" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "business_id" UUID,
    "actor_id" UUID,
    "type" VARCHAR(50) NOT NULL,
    "summary" VARCHAR(255) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brands_tenant_id_idx" ON "brands"("tenant_id");

-- CreateIndex
CREATE INDEX "brands_owner_id_idx" ON "brands"("owner_id");

-- CreateIndex
CREATE INDEX "brands_status_idx" ON "brands"("status");

-- CreateIndex
CREATE INDEX "brands_deleted_at_idx" ON "brands"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_slug_key" ON "brands"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "brand_events_brand_id_created_at_idx" ON "brand_events"("brand_id", "created_at");

-- CreateIndex
CREATE INDEX "brand_events_tenant_id_idx" ON "brand_events"("tenant_id");

-- CreateIndex
CREATE INDEX "brand_events_type_idx" ON "brand_events"("type");

-- CreateIndex
CREATE INDEX "businesses_brand_id_idx" ON "businesses"("brand_id");

-- CreateIndex
CREATE INDEX "bills_business_id_bill_number_idx" ON "bills"("business_id", "bill_number");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_events" ADD CONSTRAINT "brand_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_events" ADD CONSTRAINT "brand_events_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
