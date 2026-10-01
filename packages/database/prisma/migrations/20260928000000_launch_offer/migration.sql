-- Launch offer: the first N registrations per category get a special-priced plan.
-- Purely additive and nullable; existing businesses are unaffected (NULL = never claimed).

ALTER TABLE "businesses" ADD COLUMN "launch_offer_claimed_at" TIMESTAMP(3);

CREATE INDEX "businesses_category_id_launch_offer_claimed_at_idx"
  ON "businesses"("category_id", "launch_offer_claimed_at");
