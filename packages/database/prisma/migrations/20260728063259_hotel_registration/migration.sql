-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "hotel_amenities" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "hotel_star_rating" INTEGER;
