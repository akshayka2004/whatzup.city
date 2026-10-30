-- Paid event tickets: attendees pay the host's UPI directly, send proof, and the host approves.
-- Additive only. Existing events and tickets are untouched (pay_enabled defaults to false).

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "pay_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pay_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pay_upi_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "pay_phone" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "payee_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "pay_qr_image" TEXT,
  ADD COLUMN IF NOT EXISTS "pay_window_hours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_pay_window_range";
ALTER TABLE "events" ADD CONSTRAINT "events_pay_window_range"
  CHECK ("pay_window_hours" BETWEEN 1 AND 72);

ALTER TABLE "event_waitlist" ADD COLUMN IF NOT EXISTS "tier_name" VARCHAR(60);

CREATE TABLE IF NOT EXISTS "event_payments" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "seats" INTEGER NOT NULL,
  "tier_name" VARCHAR(60),
  "unit_price" DECIMAL(10,2) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'PENDING',
  "utr" VARCHAR(32),
  "proof_image" TEXT,
  "payer_note" VARCHAR(300),
  "submitted_at" TIMESTAMP(3),
  "decided_at" TIMESTAMP(3),
  "decided_by" UUID,
  "decision_note" VARCHAR(300),
  "resubmit_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "host_reminded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "event_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "event_payments_amount_positive" CHECK ("amount" > 0 AND "seats" > 0)
);
CREATE INDEX IF NOT EXISTS "event_payments_event_id_status_idx" ON "event_payments"("event_id", "status");
CREATE INDEX IF NOT EXISTS "event_payments_user_id_created_at_idx" ON "event_payments"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "event_payments_status_expires_at_idx" ON "event_payments"("status", "expires_at");
CREATE INDEX IF NOT EXISTS "event_payments_tenant_id_created_at_idx" ON "event_payments"("tenant_id", "created_at");

-- One UPI reference can back only one live payment anywhere on the platform, so a single
-- screenshot cannot be reused for several tickets.
CREATE UNIQUE INDEX IF NOT EXISTS "event_payments_utr_live_key"
  ON "event_payments"("utr") WHERE "utr" IS NOT NULL AND "status" IN ('SUBMITTED', 'APPROVED');

CREATE TABLE IF NOT EXISTS "event_payment_logs" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "actor_id" UUID,
  "actor_role" VARCHAR(10) NOT NULL,
  "action" VARCHAR(24) NOT NULL,
  "detail" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_payment_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_payment_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "event_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "event_payment_logs_payment_id_created_at_idx" ON "event_payment_logs"("payment_id", "created_at");
CREATE INDEX IF NOT EXISTS "event_payment_logs_event_id_created_at_idx" ON "event_payment_logs"("event_id", "created_at");

ALTER TABLE "event_tickets" ADD COLUMN IF NOT EXISTS "payment_id" UUID;
DO $$ BEGIN
  ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "event_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "event_tickets_payment_id_idx" ON "event_tickets"("payment_id");
