-- CreateTable
CREATE TABLE "points_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "points" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "points_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "points_entries_bill_id_key" ON "points_entries"("bill_id");
CREATE INDEX "points_entries_tenant_id_idx" ON "points_entries"("tenant_id");
CREATE INDEX "points_entries_user_id_idx" ON "points_entries"("user_id");
CREATE INDEX "points_entries_deleted_at_idx" ON "points_entries"("deleted_at");

-- AddForeignKey
ALTER TABLE "points_entries" ADD CONSTRAINT "points_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "points_entries" ADD CONSTRAINT "points_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "points_entries" ADD CONSTRAINT "points_entries_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "platform_vouchers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "threshold_points" DECIMAL(12,2) NOT NULL,
    "reward_type" VARCHAR(20) NOT NULL DEFAULT 'AMOUNT',
    "reward_value" DECIMAL(12,2),
    "reward_label" VARCHAR(255),
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "max_redemptions" INTEGER,
    "current_redemptions" INTEGER NOT NULL DEFAULT 0,
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "platform_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_vouchers_tenant_id_idx" ON "platform_vouchers"("tenant_id");
CREATE INDEX "platform_vouchers_status_end_date_idx" ON "platform_vouchers"("status", "end_date");
CREATE INDEX "platform_vouchers_deleted_at_idx" ON "platform_vouchers"("deleted_at");

-- AddForeignKey
ALTER TABLE "platform_vouchers" ADD CONSTRAINT "platform_vouchers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "platform_voucher_claims" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "platform_voucher_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UNLOCKED',
    "points_at_unlock" DECIMAL(12,2) NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_at" TIMESTAMP(3),
    "redeemed_by" UUID,
    "redeemed_by_business_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "platform_voucher_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_voucher_claims_platform_voucher_id_user_id_key" ON "platform_voucher_claims"("platform_voucher_id", "user_id");
CREATE UNIQUE INDEX "platform_voucher_claims_tenant_id_code_key" ON "platform_voucher_claims"("tenant_id", "code");
CREATE INDEX "platform_voucher_claims_user_id_idx" ON "platform_voucher_claims"("user_id");
CREATE INDEX "platform_voucher_claims_status_idx" ON "platform_voucher_claims"("status");
CREATE INDEX "platform_voucher_claims_redeemed_by_business_id_idx" ON "platform_voucher_claims"("redeemed_by_business_id");

-- AddForeignKey
ALTER TABLE "platform_voucher_claims" ADD CONSTRAINT "platform_voucher_claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_voucher_claims" ADD CONSTRAINT "platform_voucher_claims_platform_voucher_id_fkey" FOREIGN KEY ("platform_voucher_id") REFERENCES "platform_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_voucher_claims" ADD CONSTRAINT "platform_voucher_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_voucher_claims" ADD CONSTRAINT "platform_voucher_claims_redeemed_by_business_id_fkey" FOREIGN KEY ("redeemed_by_business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
