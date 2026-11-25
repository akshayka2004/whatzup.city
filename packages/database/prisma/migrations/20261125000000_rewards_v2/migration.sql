-- Rewards v2: spend windows, repeatable rewards, audiences, safer claim/redeem, reward event log,
-- counter bills ("Quick pay"). Existing vouchers keep behaving as before (LIFETIME window, one claim).

-- vouchers ---------------------------------------------------------------
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "spend_window" VARCHAR(16) NOT NULL DEFAULT 'LIFETIME';
ALTER TABLE "vouchers" ALTER COLUMN "spend_window" SET DEFAULT 'SINCE_START';
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "repeatable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "per_customer_limit" INTEGER;
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "audience" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "claim_valid_days" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "current_claims" INTEGER NOT NULL DEFAULT 0;
UPDATE "vouchers" v
   SET "current_claims" = c.n
  FROM (SELECT "voucher_id", COUNT(*)::int AS n FROM "voucher_claims" WHERE "deleted_at" IS NULL GROUP BY "voucher_id") c
 WHERE c."voucher_id" = v."id";

-- voucher_claims ---------------------------------------------------------
ALTER TABLE "voucher_claims" ADD COLUMN IF NOT EXISTS "cycle_key" VARCHAR(60) NOT NULL DEFAULT 'legacy';
ALTER TABLE "voucher_claims" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "voucher_claims" ADD COLUMN IF NOT EXISTS "redeem_amount" DECIMAL(12,2);
DROP INDEX IF EXISTS "voucher_claims_voucher_id_user_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "voucher_claims_voucher_id_user_id_cycle_key_key"
  ON "voucher_claims" ("voucher_id", "user_id", "cycle_key");
CREATE INDEX IF NOT EXISTS "voucher_claims_voucher_id_user_id_idx" ON "voucher_claims" ("voucher_id", "user_id");

-- bills ------------------------------------------------------------------
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "source" VARCHAR(12) NOT NULL DEFAULT 'PHOTO';
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "voided_by" UUID;

-- reward_events ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reward_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "voucher_id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "kind" VARCHAR(12) NOT NULL,
  "cycle_key" VARCHAR(60) NOT NULL DEFAULT '',
  "amount" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reward_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "reward_events_user_id_voucher_id_kind_cycle_key_key"
  ON "reward_events" ("user_id", "voucher_id", "kind", "cycle_key");
CREATE INDEX IF NOT EXISTS "reward_events_business_id_kind_created_at_idx"
  ON "reward_events" ("business_id", "kind", "created_at");
CREATE INDEX IF NOT EXISTS "reward_events_voucher_id_kind_idx" ON "reward_events" ("voucher_id", "kind");

-- counter_bills ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "counter_bills" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code" VARCHAR(8) NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  "business_id" UUID,
  "staff_id" UUID,
  "amount" DECIMAL(12,2),
  "bill_number" VARCHAR(60),
  "bill_id" UUID,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "entered_at" TIMESTAMP(3),
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "counter_bills_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "counter_bills_code_status_idx" ON "counter_bills" ("code", "status");
CREATE INDEX IF NOT EXISTS "counter_bills_user_id_status_idx" ON "counter_bills" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "counter_bills_business_id_created_at_idx" ON "counter_bills" ("business_id", "created_at");
-- At most one waiting customer per code, so a typed code always means one person.
CREATE UNIQUE INDEX IF NOT EXISTS "counter_bills_open_code_key" ON "counter_bills" ("code") WHERE "status" IN ('OPEN', 'AWAITING');
