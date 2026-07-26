-- AlterTable: business registration / KYC details
ALTER TABLE "businesses" ADD COLUMN     "brand_name" VARCHAR(255),
ADD COLUMN     "company_name" VARCHAR(255),
ADD COLUMN     "company_type" VARCHAR(50),
ADD COLUMN     "compliance" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "owner_contact" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "billing_contact" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "support_contact" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "branch_head" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "category_attributes" JSONB NOT NULL DEFAULT '{}';
