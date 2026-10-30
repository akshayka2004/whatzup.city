-- Event RSVP and tickets. Additive: every new events column has a default, so existing events are
-- unchanged (booking_mode 'NONE'). New tables only.

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "booking_mode" VARCHAR(10) NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "booking_approval" VARCHAR(10) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "seats_taken" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "checked_in_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rsvp_opens_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rsvp_closes_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "max_per_user" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "cancel_cutoff_hours" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "venue_capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "min_age" INTEGER,
  ADD COLUMN IF NOT EXISTS "booking_note" TEXT,
  ADD COLUMN IF NOT EXISTS "check_in_opens_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "check_in_closes_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "events_booking_mode_booking_approval_idx" ON "events" ("booking_mode", "booking_approval");

-- A seat count can never go negative or past capacity, whatever the application does.
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_seats_within_capacity";
ALTER TABLE "events" ADD CONSTRAINT "events_seats_within_capacity"
  CHECK ("seats_taken" >= 0 AND ("capacity" IS NULL OR "seats_taken" <= "capacity"));

CREATE TABLE IF NOT EXISTS "event_tickets" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "holder_name" VARCHAR(120) NOT NULL,
  "is_guest" BOOLEAN NOT NULL DEFAULT false,
  "code" VARCHAR(10) NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'ISSUED',
  "source" VARCHAR(20),
  "idempotency_key" VARCHAR(64),
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  "checked_in_at" TIMESTAMP(3),
  "checked_in_pass_id" UUID,
  CONSTRAINT "event_tickets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "event_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_tickets_event_id_code_key" ON "event_tickets" ("event_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "event_tickets_event_id_user_id_idempotency_key_holder_name_key" ON "event_tickets" ("event_id", "user_id", "idempotency_key", "holder_name");
CREATE INDEX IF NOT EXISTS "event_tickets_event_id_status_idx" ON "event_tickets" ("event_id", "status");
CREATE INDEX IF NOT EXISTS "event_tickets_user_id_event_id_idx" ON "event_tickets" ("user_id", "event_id");
CREATE INDEX IF NOT EXISTS "event_tickets_event_id_checked_in_at_idx" ON "event_tickets" ("event_id", "checked_in_at");

CREATE TABLE IF NOT EXISTS "event_crew_passes" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "code_hash" VARCHAR(64) NOT NULL,
  "level" VARCHAR(6) NOT NULL DEFAULT 'SCAN',
  "valid_from" TIMESTAMP(3) NOT NULL,
  "valid_until" TIMESTAMP(3) NOT NULL,
  "max_devices" INTEGER NOT NULL DEFAULT 2,
  "revoked_at" TIMESTAMP(3),
  "last_used_at" TIMESTAMP(3),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_crew_passes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_crew_passes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_crew_passes_code_hash_key" ON "event_crew_passes" ("code_hash");
CREATE INDEX IF NOT EXISTS "event_crew_passes_event_id_idx" ON "event_crew_passes" ("event_id");

CREATE TABLE IF NOT EXISTS "event_crew_sessions" (
  "id" UUID NOT NULL,
  "pass_id" UUID NOT NULL,
  "device_id" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  CONSTRAINT "event_crew_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_crew_sessions_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "event_crew_passes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_crew_sessions_pass_id_device_id_key" ON "event_crew_sessions" ("pass_id", "device_id");

CREATE TABLE IF NOT EXISTS "event_scans" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "ticket_id" UUID,
  "pass_id" UUID,
  "result" VARCHAR(16) NOT NULL,
  "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_scans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_scans_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "event_scans_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "event_crew_passes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "event_scans_event_id_scanned_at_idx" ON "event_scans" ("event_id", "scanned_at");
CREATE INDEX IF NOT EXISTS "event_scans_pass_id_idx" ON "event_scans" ("pass_id");

CREATE TABLE IF NOT EXISTS "event_waitlist" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "seats" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "promoted_at" TIMESTAMP(3),
  CONSTRAINT "event_waitlist_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_waitlist_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "event_waitlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_waitlist_event_id_user_id_key" ON "event_waitlist" ("event_id", "user_id");
CREATE INDEX IF NOT EXISTS "event_waitlist_event_id_promoted_at_created_at_idx" ON "event_waitlist" ("event_id", "promoted_at", "created_at");
