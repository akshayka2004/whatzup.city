-- CreateEnum
CREATE TYPE "CentreStatus" AS ENUM ('OPEN', 'PAUSED', 'CLOSED');

-- AlterTable
ALTER TABLE "collection_centres" ADD COLUMN     "status" "CentreStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "collection_centres_status_idx" ON "collection_centres"("status");
