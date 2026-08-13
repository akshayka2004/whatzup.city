-- AlterTable
ALTER TABLE "offers" ADD COLUMN "click_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "platform_offers" ADD COLUMN "click_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "offer_clicks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "offer_kind" VARCHAR(20) NOT NULL,
    "offer_id" UUID NOT NULL,
    "actor_key" VARCHAR(120) NOT NULL,
    "click_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_clicks_offer_kind_offer_id_idx" ON "offer_clicks"("offer_kind", "offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_clicks_offer_kind_offer_id_actor_key_click_date_key" ON "offer_clicks"("offer_kind", "offer_id", "actor_key", "click_date");
