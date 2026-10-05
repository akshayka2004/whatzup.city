-- Food-type businesses tag each offer as dine-in, takeaway or both.
-- CreateEnum
CREATE TYPE "OfferFulfilment" AS ENUM ('DINE_IN', 'TAKEAWAY', 'BOTH');

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "fulfilment" "OfferFulfilment" NOT NULL DEFAULT 'BOTH';
