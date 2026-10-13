-- Categories can be hidden from the registration form without being archived (still listed and
-- browsable). Backfill keeps today's form unchanged: the legacy top-level categories the wizard
-- never offered stay out of it. Additive.

ALTER TABLE "business_categories" ADD COLUMN "show_in_signup" BOOLEAN NOT NULL DEFAULT true;

UPDATE "business_categories" c
SET "show_in_signup" = false
FROM "tenants" t
WHERE c."tenant_id" = t."id"
  AND t."slug" = 'default'
  AND c."parent_id" IS NULL
  AND c."slug" IN ('restaurants', 'retail', 'services', 'technology', 'education', 'entertainment', 'finance');
