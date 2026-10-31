-- Additive: why an event's RSVP was not approved (and how often it was sent again), and the
-- volunteer details a host keeps on each crew pass.
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "booking_reject_reason" VARCHAR(300),
  ADD COLUMN IF NOT EXISTS "booking_reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "booking_resubmit_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "event_crew_passes"
  ADD COLUMN IF NOT EXISTS "place" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
