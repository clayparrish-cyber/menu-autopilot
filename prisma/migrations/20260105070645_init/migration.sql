-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('NONE', 'SOLO', 'TEAM', 'GROUP');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('BAR_KITCHEN', 'FULL_SERVICE', 'FAST_CASUAL', 'CAFE', 'BREWERY', 'OTHER');

-- CreateEnum
CREATE TYPE "UploadType" AS ENUM ('PERFORMANCE', 'COSTS', 'MARGINEDGE_MENU_ANALYSIS');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CostSource" AS ENUM ('MANUAL', 'MARGINEDGE', 'ESTIMATE');

-- CreateEnum
CREATE TYPE "Quadrant" AS ENUM ('STAR', 'PLOWHORSE', 'PUZZLE', 'DOG');

-- CreateEnum
CREATE TYPE "RecommendedAction" AS ENUM ('KEEP', 'PROMOTE', 'REPRICE', 'REPOSITION', 'REWORK', 'REMOVE');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'NONE',
    "targetFoodCostPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "minQtyThreshold" INTEGER NOT NULL DEFAULT 10,
    "popularityThreshold" INTEGER NOT NULL DEFAULT 60,
    "marginThreshold" INTEGER NOT NULL DEFAULT 60,
    "allowPremiumPricing" BOOLEAN NOT NULL DEFAULT false,
    "columnMappings" JSONB,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "channel" "Channel" NOT NULL DEFAULT 'BAR_KITCHEN',
    "targetFoodCostPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "popularityThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "marginThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "confidenceQtyHigh" INTEGER NOT NULL DEFAULT 20,
    "confidenceQtyMedium" INTEGER NOT NULL DEFAULT 10,
    "priceIncreaseMaxPct" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "priceIncreaseMaxAbs" DOUBLE PRECISION NOT NULL DEFAULT 2.00,
    "allowPremiumCross85th" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" "UploadType" NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "columnMapping" JSONB,
    "locationId" TEXT NOT NULL,
    "weekId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "isAnchor" BOOLEAN NOT NULL DEFAULT false,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostOverride" (
    "id" TEXT NOT NULL,
    "unitFoodCost" DOUBLE PRECISION NOT NULL,
    "unitCostBase" DOUBLE PRECISION,
    "unitCostModifiers" DOUBLE PRECISION,
    "source" "CostSource" NOT NULL DEFAULT 'MANUAL',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,
    "meItemsSold" INTEGER,
    "meRevenue" DOUBLE PRECISION,
    "meTotalCost" DOUBLE PRECISION,
    "meTheoreticalPct" DOUBLE PRECISION,
    "ingestionWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemWeekMetric" (
    "id" TEXT NOT NULL,
    "quantitySold" INTEGER NOT NULL,
    "netSales" DOUBLE PRECISION NOT NULL,
    "avgPrice" DOUBLE PRECISION NOT NULL,
    "unitFoodCost" DOUBLE PRECISION NOT NULL,
    "unitCostBase" DOUBLE PRECISION,
    "unitCostModifiers" DOUBLE PRECISION,
    "costSource" "CostSource" NOT NULL DEFAULT 'ESTIMATE',
    "unitMargin" DOUBLE PRECISION NOT NULL,
    "totalMargin" DOUBLE PRECISION NOT NULL,
    "foodCostPct" DOUBLE PRECISION NOT NULL,
    "popularityPercentile" DOUBLE PRECISION NOT NULL,
    "marginPercentile" DOUBLE PRECISION NOT NULL,
    "profitPercentile" DOUBLE PRECISION NOT NULL,
    "quadrant" "Quadrant" NOT NULL,
    "recommendedAction" "RecommendedAction" NOT NULL,
    "suggestedPrice" DOUBLE PRECISION,
    "priceChangeAmount" DOUBLE PRECISION,
    "priceChangePct" DOUBLE PRECISION,
    "confidence" "Confidence" NOT NULL,
    "explanation" TEXT[],
    "itemId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemWeekMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "summary" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "weekId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekSnapshot" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "grossMargin" DOUBLE PRECISION NOT NULL,
    "itemsSold" INTEGER NOT NULL,
    "marginPct" DOUBLE PRECISION NOT NULL,
    "categoryBreakdown" JSONB,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Account_stripeCustomerId_key" ON "Account"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_ownerId_key" ON "Account"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Week_locationId_weekStart_weekEnd_key" ON "Week"("locationId", "weekStart", "weekEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Item_locationId_name_key" ON "Item"("locationId", "name");

-- CreateIndex
CREATE INDEX "CostOverride_itemId_effectiveDate_idx" ON "CostOverride"("itemId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "ItemWeekMetric_itemId_weekId_key" ON "ItemWeekMetric"("itemId", "weekId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_weekId_key" ON "Report"("weekId");

-- CreateIndex
CREATE INDEX "WeekSnapshot_locationId_weekStart_idx" ON "WeekSnapshot"("locationId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeekSnapshot_locationId_weekStart_weekEnd_key" ON "WeekSnapshot"("locationId", "weekStart", "weekEnd");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostOverride" ADD CONSTRAINT "CostOverride_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemWeekMetric" ADD CONSTRAINT "ItemWeekMetric_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemWeekMetric" ADD CONSTRAINT "ItemWeekMetric_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekSnapshot" ADD CONSTRAINT "WeekSnapshot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
