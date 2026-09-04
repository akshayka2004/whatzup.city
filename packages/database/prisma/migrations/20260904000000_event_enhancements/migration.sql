-- Event enhancements: platform-hosted events, ticket type/price, category

-- businessId becomes nullable so a "Special Correspondent" (platform) event
-- can exist with no host business, carrying hostLabel instead.
ALTER TABLE "events" ALTER COLUMN "business_id" DROP NOT NULL;

ALTER TABLE "events" ADD COLUMN "host_label" VARCHAR(255);
ALTER TABLE "events" ADD COLUMN "category" VARCHAR(30);
ALTER TABLE "events" ADD COLUMN "ticket_type" VARCHAR(10) NOT NULL DEFAULT 'FREE';
ALTER TABLE "events" ADD COLUMN "ticket_price" DECIMAL(10,2);

CREATE INDEX "events_category_idx" ON "events"("category");

-- Swap CASCADE for SET NULL on the FK, since the column is now optional —
-- deleting a business should orphan its past events, not delete them.
ALTER TABLE "events" DROP CONSTRAINT "events_business_id_fkey";
ALTER TABLE "events" ADD CONSTRAINT "events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
