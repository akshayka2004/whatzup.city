-- Structured detail entries (halls, rooms, restaurant sections, etc.) per
-- selected hotel amenity. Purely additive, nullable-equivalent default,
-- no backfill needed — every existing row gets an empty object.

ALTER TABLE "businesses" ADD COLUMN "amenity_details" JSONB NOT NULL DEFAULT '{}';
