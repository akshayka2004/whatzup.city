-- CreateIndex
CREATE INDEX "businesses_category_id_city_idx" ON "businesses"("category_id", "city");

-- CreateIndex
CREATE INDEX "businesses_status_average_rating_idx" ON "businesses"("status", "average_rating");

-- CreateIndex
CREATE INDEX "offers_status_end_date_idx" ON "offers"("status", "end_date");

-- CreateIndex
CREATE INDEX "reviews_business_id_status_idx" ON "reviews"("business_id", "status");

-- CreateIndex
CREATE INDEX "bills_business_id_status_idx" ON "bills"("business_id", "status");

-- CreateIndex
CREATE INDEX "government_announcements_is_published_expires_at_idx" ON "government_announcements"("is_published", "expires_at");

-- CreateIndex
CREATE INDEX "government_announcements_tenant_id_is_published_expires_at_idx" ON "government_announcements"("tenant_id", "is_published", "expires_at");

-- CreateIndex
CREATE INDEX "events_status_start_date_idx" ON "events"("status", "start_date");


-- Partial indexes (active rows only) — smaller + faster for the soft-delete
-- filtered hot reads. Not expressible in schema.prisma, so they live only here.
-- NOTE: a future `prisma migrate dev` will not see these in the schema and may
-- try to drop them — decline / hand-edit that migration to keep them.
CREATE INDEX IF NOT EXISTS "offers_active_idx"        ON "offers"("status","end_date")                 WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "events_active_idx"        ON "events"("status","start_date")               WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "govann_active_idx"        ON "government_announcements"("is_published","expires_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "bills_biz_active_idx"     ON "bills"("business_id")                         WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "reviews_biz_active_idx"   ON "reviews"("business_id","status")              WHERE "deleted_at" IS NULL;
