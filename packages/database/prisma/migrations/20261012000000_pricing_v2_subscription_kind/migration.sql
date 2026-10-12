-- Pricing v2: a business can hold one BASE bundle plus any number of stackable ADDON units,
-- billed monthly or yearly. Purely additive: defaulted columns, so every existing row reads as a
-- legacy quarterly BASE subscription and keeps working untouched.

ALTER TABLE "subscriptions" ADD COLUMN "kind" VARCHAR(10) NOT NULL DEFAULT 'BASE';
ALTER TABLE "subscriptions" ADD COLUMN "billing_cycle" VARCHAR(12) NOT NULL DEFAULT 'QUARTERLY';
ALTER TABLE "subscriptions" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- Entitlement lookups read live subscriptions per business.
CREATE INDEX "subscriptions_business_id_status_end_date_idx" ON "subscriptions"("business_id", "status", "end_date");
