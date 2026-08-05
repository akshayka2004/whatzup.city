-- CreateTable
CREATE TABLE "collection_centre_requirements" (
    "id" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_centre_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_centre_requirements_centreId_idx" ON "collection_centre_requirements"("centreId");

-- CreateIndex
CREATE INDEX "collection_centre_requirements_priority_idx" ON "collection_centre_requirements"("priority");

-- AddForeignKey
ALTER TABLE "collection_centre_requirements" ADD CONSTRAINT "collection_centre_requirements_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "collection_centres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
