-- Booking by day for multi-day events. Additive and opt-in: every new column has a default that
-- leaves existing events and tickets exactly as they are (day_booking false, day_id null).

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "day_booking" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "all_days_price" DECIMAL(10,2);

CREATE TABLE IF NOT EXISTS "event_days" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "day_date" VARCHAR(10) NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER,
  "seats_taken" INTEGER NOT NULL DEFAULT 0,
  "checked_in_count" INTEGER NOT NULL DEFAULT 0,
  "price" DECIMAL(10,2),
  "is_open" BOOLEAN NOT NULL DEFAULT true,
  "rsvp_opens_at" TIMESTAMP(3),
  "rsvp_closes_at" TIMESTAMP(3),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_days_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_days_event_id_day_date_key" ON "event_days" ("event_id", "day_date");
CREATE INDEX IF NOT EXISTS "event_days_event_id_sort_order_idx" ON "event_days" ("event_id", "sort_order");

-- A day's seat count can never go negative or past its capacity, whatever the application does.
ALTER TABLE "event_days" DROP CONSTRAINT IF EXISTS "event_days_seats_within_capacity";
ALTER TABLE "event_days" ADD CONSTRAINT "event_days_seats_within_capacity"
  CHECK ("seats_taken" >= 0 AND ("capacity" IS NULL OR "seats_taken" <= "capacity"));

ALTER TABLE "event_tickets" ADD COLUMN IF NOT EXISTS "day_id" UUID;
ALTER TABLE "event_tickets" DROP CONSTRAINT IF EXISTS "event_tickets_day_id_fkey";
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_day_id_fkey"
  FOREIGN KEY ("day_id") REFERENCES "event_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "event_tickets_event_id_day_id_status_idx" ON "event_tickets" ("event_id", "day_id", "status");

ALTER TABLE "event_waitlist" ADD COLUMN IF NOT EXISTS "day_id" UUID;
ALTER TABLE "event_waitlist" DROP CONSTRAINT IF EXISTS "event_waitlist_day_id_fkey";
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_day_id_fkey"
  FOREIGN KEY ("day_id") REFERENCES "event_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "event_waitlist_event_id_user_id_key";
-- One entry per person per day; a missing day counts as one value so ordinary events keep one entry.
CREATE UNIQUE INDEX IF NOT EXISTS "event_waitlist_event_user_day_key"
  ON "event_waitlist" ("event_id", "user_id", "day_id") NULLS NOT DISTINCT;

ALTER TABLE "event_payments" ADD COLUMN IF NOT EXISTS "day_breakdown" JSONB;
