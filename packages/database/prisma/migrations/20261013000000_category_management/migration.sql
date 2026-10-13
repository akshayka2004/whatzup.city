-- Category management: a super admin can add / edit / archive / merge / delete categories.
--  * template   what a category behaves like (status fields, documents, food) — NULL resolves by slug
--  * is_system  slugs application code depends on (not deletable, slug locked)
--  * name_ml    optional Malayalam label
--  * merged_into_id  redirect target when a category is merged into another
-- Additive; the two UPDATEs only fill the new columns, so no existing behaviour changes.

ALTER TABLE "business_categories" ADD COLUMN "template" VARCHAR(30);
ALTER TABLE "business_categories" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_categories" ADD COLUMN "name_ml" VARCHAR(150);
ALTER TABLE "business_categories" ADD COLUMN "merged_into_id" UUID;

ALTER TABLE "business_categories"
  ADD CONSTRAINT "business_categories_merged_into_id_fkey"
  FOREIGN KEY ("merged_into_id") REFERENCES "business_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "business_categories_merged_into_id_idx" ON "business_categories"("merged_into_id");

-- Backfill: the template every built-in slug already behaved like (clones in every tenant included).
UPDATE "business_categories" SET "template" = CASE "slug"
  WHEN 'restaurants' THEN 'RESTAURANT'
  WHEN 'food' THEN 'RESTAURANT'
  WHEN 'buffet' THEN 'RESTAURANT'
  WHEN 'staycation' THEN 'RESTAURANT'
  WHEN 'retail' THEN 'RETAIL'
  WHEN 'shopping' THEN 'RETAIL'
  WHEN 'retail_gifts' THEN 'RETAIL'
  WHEN 'local_shop' THEN 'RETAIL'
  WHEN 'fashion' THEN 'RETAIL'
  WHEN 'healthcare' THEN 'HEALTHCARE'
  WHEN 'services' THEN 'SERVICES'
  WHEN 'business_services' THEN 'SERVICES'
  WHEN 'personal_care' THEN 'SERVICES'
  WHEN 'fitness_wellness' THEN 'FITNESS'
  WHEN 'education' THEN 'EDUCATION'
  WHEN 'automotive_services' THEN 'AUTOMOTIVE'
END
WHERE "template" IS NULL
  AND "slug" IN ('restaurants','food','buffet','staycation','retail','shopping','retail_gifts',
                 'local_shop','fashion','healthcare','services','business_services','personal_care',
                 'fitness_wellness','education','automotive_services');

UPDATE "business_categories" SET "is_system" = true
WHERE "slug" IN ('food','restaurants','home_chefs','hotel','staycation','buffet');
