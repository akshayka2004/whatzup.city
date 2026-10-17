-- Offer channels (Instore / Takeaway / Online, any combination) and how a bill was paid.
-- Additive. Existing offers keep their meaning: Dine-in -> Instore, Takeaway -> Takeaway,
-- Both -> all three (no restriction). Existing bills have no payment info (NULL).

CREATE TYPE "OfferChannel" AS ENUM ('INSTORE', 'TAKEAWAY', 'ONLINE');
CREATE TYPE "BillPaymentMode" AS ENUM ('CASH', 'UPI', 'DEBIT_CARD', 'CREDIT_CARD');
CREATE TYPE "BillOrderChannel" AS ENUM ('IN_STORE', 'TAKEAWAY', 'DELIVERY');

ALTER TABLE "offers"
  ADD COLUMN "channels" "OfferChannel"[] NOT NULL DEFAULT ARRAY['INSTORE', 'TAKEAWAY', 'ONLINE']::"OfferChannel"[];

UPDATE "offers" SET "channels" = ARRAY['INSTORE']::"OfferChannel"[] WHERE "fulfilment" = 'DINE_IN';
UPDATE "offers" SET "channels" = ARRAY['TAKEAWAY']::"OfferChannel"[] WHERE "fulfilment" = 'TAKEAWAY';

ALTER TABLE "bills"
  ADD COLUMN "order_channel" "BillOrderChannel",
  ADD COLUMN "payment_mode" "BillPaymentMode",
  ADD COLUMN "delivery_partner" VARCHAR(30),
  ADD COLUMN "delivery_partner_name" VARCHAR(60);

CREATE INDEX "bills_business_id_order_channel_idx" ON "bills"("business_id", "order_channel");
