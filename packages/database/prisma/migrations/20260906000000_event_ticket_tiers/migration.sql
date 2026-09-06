-- Optional named ticket tiers (Gold/Platinum/etc), each its own price.
-- Nullable JSON, additive — existing events keep using ticketType/ticketPrice.
ALTER TABLE "events" ADD COLUMN "ticket_tiers" JSONB;
