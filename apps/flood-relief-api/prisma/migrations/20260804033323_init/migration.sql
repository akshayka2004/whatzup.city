-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "District" AS ENUM ('THIRUVANANTHAPURAM', 'KOLLAM', 'PATHANAMTHITTA', 'ALAPPUZHA', 'KOTTAYAM', 'IDUKKI', 'ERNAKULAM', 'THRISSUR', 'PALAKKAD', 'MALAPPURAM', 'KOZHIKODE', 'WAYANAD', 'KANNUR', 'KASARAGOD');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('WEATHER_WARNING', 'EVACUATION', 'ROAD_CLOSURE', 'RESCUE_OPERATION', 'RELIEF_CAMP_UPDATE', 'HEALTH_ADVISORY', 'GENERAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AlertCategory" NOT NULL,
    "district" "District" NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_centres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" "District" NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapLink" TEXT,
    "contactName" TEXT NOT NULL,
    "contactDesignation" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactAltPhone" TEXT,
    "workingHours" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_centres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_centre_officials" (
    "id" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_centre_officials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relief_camps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" "District" NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapLink" TEXT,
    "contactName" TEXT NOT NULL,
    "contactDesignation" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relief_camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_officials" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_officials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_requirements" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "camp_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" "District" NOT NULL,
    "region" TEXT NOT NULL,
    "coordinatorName" TEXT NOT NULL,
    "coordinatorPhone" TEXT NOT NULL,
    "whatsappLink" TEXT,
    "telegramLink" TEXT,
    "website" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_group_officials" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_group_officials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "district" "District" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "notifications_district_idx" ON "notifications"("district");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_isPinned_idx" ON "notifications"("isPinned");

-- CreateIndex
CREATE INDEX "collection_centres_district_idx" ON "collection_centres"("district");

-- CreateIndex
CREATE INDEX "collection_centre_officials_centreId_idx" ON "collection_centre_officials"("centreId");

-- CreateIndex
CREATE INDEX "relief_camps_district_idx" ON "relief_camps"("district");

-- CreateIndex
CREATE INDEX "camp_officials_campId_idx" ON "camp_officials"("campId");

-- CreateIndex
CREATE INDEX "camp_requirements_campId_idx" ON "camp_requirements"("campId");

-- CreateIndex
CREATE INDEX "camp_requirements_priority_idx" ON "camp_requirements"("priority");

-- CreateIndex
CREATE INDEX "volunteer_groups_district_idx" ON "volunteer_groups"("district");

-- CreateIndex
CREATE INDEX "volunteer_group_officials_groupId_idx" ON "volunteer_group_officials"("groupId");

-- CreateIndex
CREATE INDEX "emergency_contacts_district_idx" ON "emergency_contacts"("district");

-- AddForeignKey
ALTER TABLE "collection_centre_officials" ADD CONSTRAINT "collection_centre_officials_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "collection_centres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_officials" ADD CONSTRAINT "camp_officials_campId_fkey" FOREIGN KEY ("campId") REFERENCES "relief_camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_requirements" ADD CONSTRAINT "camp_requirements_campId_fkey" FOREIGN KEY ("campId") REFERENCES "relief_camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_group_officials" ADD CONSTRAINT "volunteer_group_officials_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "volunteer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
