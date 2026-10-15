-- Additive: optional end date for platform offers (expired ones drop off the public list).
ALTER TABLE "platform_offers" ADD COLUMN IF NOT EXISTS "ends_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "platform_offers_ends_at_idx" ON "platform_offers"("ends_at");
