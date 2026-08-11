-- Composite indexes matching hot-path query filters found in a perf audit.
CREATE INDEX IF NOT EXISTS "payments_status_deleted_at_idx" ON "payments" ("status", "deleted_at");
CREATE INDEX IF NOT EXISTS "platform_offers_tenant_id_deleted_at_status_category_idx" ON "platform_offers" ("tenant_id", "deleted_at", "status", "category");
