-- New platform offer categories. Additive: existing rows keep their category.
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'FESTIVE';
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'DINE_IN';
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'TAKEAWAY';
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'HYPERMARKET';
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'JEWELLERY';
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'STATIONERY';
ALTER TYPE "PlatformOfferCategory" ADD VALUE IF NOT EXISTS 'FOOD';
