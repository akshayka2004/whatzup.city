-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "proof_url" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" UUID;
