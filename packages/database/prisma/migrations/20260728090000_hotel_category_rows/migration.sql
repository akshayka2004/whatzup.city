-- Data migration: create the top-level "Hotel" category (+ its subcategories)
-- for every tenant that already has categories, and rename the overlapping
-- Staycation subcategory. Schema-only migrations cannot make the hotel
-- star-classification pricing reachable — the category row must exist.
--
-- Slug is 'hotel' (singular): 'hotels' is already used by the Staycation
-- subcategory and business_categories has UNIQUE (tenant_id, slug).
-- Every statement is idempotent so a re-run is harmless.

-- 1. Top-level Hotel category, one per tenant that has categories.
INSERT INTO "business_categories"
  (id, tenant_id, name, slug, description, icon, sort_order, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  t.tenant_id,
  'Hotel',
  'hotel',
  'Star-classified hotels — listing charge set by classification',
  'Hotel',
  18,
  true,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT tenant_id FROM "business_categories" WHERE deleted_at IS NULL
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "business_categories" c
  WHERE c.tenant_id = t.tenant_id AND c.slug = 'hotel'
);

-- 2. Hotel subcategories, parented to the row created above.
INSERT INTO "business_categories"
  (id, tenant_id, name, slug, parent_id, sort_order, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.tenant_id,
  s.name,
  s.slug,
  p.id,
  s.ord,
  true,
  NOW(),
  NOW()
FROM "business_categories" p
CROSS JOIN (VALUES
  ('Business Hotel', 'hotel_business', 1),
  ('Boutique Hotel', 'hotel_boutique', 2),
  ('Heritage Hotel', 'hotel_heritage', 3),
  ('Resort Hotel',   'hotel_resort',   4),
  ('Airport Hotel',  'hotel_airport',  5)
) AS s(name, slug, ord)
WHERE p.slug = 'hotel'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "business_categories" c
    WHERE c.tenant_id = p.tenant_id AND c.slug = s.slug
  );

-- 3. Rename the Staycation subcategory "Hotels" -> "Homestays" so it no longer
--    competes with the new category. Slug is intentionally left as 'hotels' so
--    existing businesses referencing it keep resolving. Only touches rows that
--    are actually subcategories (parent_id IS NOT NULL).
UPDATE "business_categories"
SET name = 'Homestays', updated_at = NOW()
WHERE slug = 'hotels'
  AND parent_id IS NOT NULL
  AND deleted_at IS NULL
  AND name = 'Hotels';
