-- Lucky-wheel discount campaigns: a business's active campaign (item + max %
-- + generated wheel percentages) plus one redeemable "ticket" per customer spin.

CREATE TABLE "business_discounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "product_id" UUID,
    "description" TEXT,
    "max_discount_percent" INTEGER NOT NULL,
    "wheel_percentages" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "business_discounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discount_spins" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "discount_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "discount_percent" INTEGER NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UNLOCKED',
    "spun_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "redeemed_at" TIMESTAMP(3),
    "redeemed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "discount_spins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_discounts_tenant_id_idx" ON "business_discounts"("tenant_id");
CREATE INDEX "business_discounts_business_id_is_active_idx" ON "business_discounts"("business_id", "is_active");
CREATE INDEX "business_discounts_deleted_at_idx" ON "business_discounts"("deleted_at");

CREATE UNIQUE INDEX "discount_spins_discount_id_user_id_key" ON "discount_spins"("discount_id", "user_id");
CREATE UNIQUE INDEX "discount_spins_tenant_id_code_key" ON "discount_spins"("tenant_id", "code");
CREATE INDEX "discount_spins_business_id_status_idx" ON "discount_spins"("business_id", "status");
CREATE INDEX "discount_spins_user_id_idx" ON "discount_spins"("user_id");

ALTER TABLE "business_discounts" ADD CONSTRAINT "business_discounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_discounts" ADD CONSTRAINT "business_discounts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_discounts" ADD CONSTRAINT "business_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "discount_spins" ADD CONSTRAINT "discount_spins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discount_spins" ADD CONSTRAINT "discount_spins_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "business_discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discount_spins" ADD CONSTRAINT "discount_spins_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discount_spins" ADD CONSTRAINT "discount_spins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
