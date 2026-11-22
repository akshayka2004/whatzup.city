-- Christmas cakes + Buffets (platform offer categories), a city on platform offers, and buffet RSVPs.
-- Additive only.
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'CHRISTMAS_CAKES';
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'BUFFET';

ALTER TABLE "platform_offers" ADD COLUMN IF NOT EXISTS "city" VARCHAR(100);
CREATE INDEX IF NOT EXISTS "platform_offers_category_city_idx" ON "platform_offers" ("category", "city");

CREATE TABLE IF NOT EXISTS "buffet_rsvps" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "offer_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(30) NOT NULL,
  "visit_date" DATE NOT NULL,
  "guests" INTEGER NOT NULL,
  "note" VARCHAR(500),
  "status" VARCHAR(12) NOT NULL DEFAULT 'PENDING',
  "admin_note" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "buffet_rsvps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "buffet_rsvps_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "platform_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "buffet_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "buffet_rsvps_offer_id_visit_date_idx" ON "buffet_rsvps" ("offer_id", "visit_date");
CREATE INDEX IF NOT EXISTS "buffet_rsvps_user_id_idx" ON "buffet_rsvps" ("user_id");
CREATE INDEX IF NOT EXISTS "buffet_rsvps_tenant_id_status_idx" ON "buffet_rsvps" ("tenant_id", "status");
