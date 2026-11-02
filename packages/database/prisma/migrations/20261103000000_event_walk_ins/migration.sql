-- Additive: people a gate volunteer writes down (name, mobile, place) at an event.
CREATE TABLE IF NOT EXISTS "event_walk_ins" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "pass_id" UUID,
  "name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "place" VARCHAR(120) NOT NULL,
  "client_ref" VARCHAR(64) NOT NULL,
  "consented_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_walk_ins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_walk_ins_event_id_client_ref_key"
  ON "event_walk_ins"("event_id", "client_ref");
CREATE UNIQUE INDEX IF NOT EXISTS "event_walk_ins_event_id_phone_key"
  ON "event_walk_ins"("event_id", "phone");
CREATE INDEX IF NOT EXISTS "event_walk_ins_event_id_created_at_idx"
  ON "event_walk_ins"("event_id", "created_at");

ALTER TABLE "event_walk_ins"
  ADD CONSTRAINT "event_walk_ins_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_walk_ins"
  ADD CONSTRAINT "event_walk_ins_pass_id_fkey"
  FOREIGN KEY ("pass_id") REFERENCES "event_crew_passes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
