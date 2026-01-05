-- CreateEnum
CREATE TYPE "TipUserRole" AS ENUM ('ADMIN', 'MANAGER', 'SERVER');

-- CreateEnum
CREATE TYPE "StaffRoleType" AS ENUM ('SERVER', 'BARTENDER', 'BUSSER', 'RUNNER', 'HOST', 'BARBACK', 'EXPEDITOR', 'KITCHEN', 'MANAGER_FOH', 'OTHER');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('BREAKFAST', 'BRUNCH', 'LUNCH', 'DINNER', 'LATE_NIGHT', 'ALL_DAY');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "TipAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'CLOSE', 'REOPEN', 'OVERRIDE', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "TipOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "TipUserRole" NOT NULL DEFAULT 'SERVER',
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleType" "StaffRoleType" NOT NULL DEFAULT 'SERVER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "locationId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "shiftType" "ShiftType" NOT NULL DEFAULT 'DINNER',
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "toastTotalCCTips" DOUBLE PRECISION,
    "toastTotalSales" DOUBLE PRECISION,
    "toastTotalChecks" INTEGER,
    "totalCCTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCashTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "closeNotes" TEXT,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftEntry" (
    "id" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "grossSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ccTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "checkCount" INTEGER,
    "declaredTips" DOUBLE PRECISION,
    "totalTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiredTipOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualTipOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "shiftId" TEXT NOT NULL,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipAllocation" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "entryId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipAuditLog" (
    "id" TEXT NOT NULL,
    "action" "TipAuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipUser_email_key" ON "TipUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TipUser_staffId_key" ON "TipUser"("staffId");

-- CreateIndex
CREATE INDEX "TipUser_organizationId_idx" ON "TipUser"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TipSession_token_key" ON "TipSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TipStaff_userId_key" ON "TipStaff"("userId");

-- CreateIndex
CREATE INDEX "TipStaff_locationId_isActive_idx" ON "TipStaff"("locationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TipStaff_locationId_name_key" ON "TipStaff"("locationId", "name");

-- CreateIndex
CREATE INDEX "Shift_locationId_status_idx" ON "Shift"("locationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_locationId_shiftDate_shiftType_key" ON "Shift"("locationId", "shiftDate", "shiftType");

-- CreateIndex
CREATE INDEX "ShiftEntry_shiftId_status_idx" ON "ShiftEntry"("shiftId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftEntry_shiftId_serverName_key" ON "ShiftEntry"("shiftId", "serverName");

-- CreateIndex
CREATE INDEX "TipAllocation_recipientId_idx" ON "TipAllocation"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "TipAllocation_entryId_recipientId_key" ON "TipAllocation"("entryId", "recipientId");

-- CreateIndex
CREATE INDEX "TipAuditLog_entityType_entityId_idx" ON "TipAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "TipAuditLog_userId_createdAt_idx" ON "TipAuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TipLocation" ADD CONSTRAINT "TipLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "TipOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipUser" ADD CONSTRAINT "TipUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "TipOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipSession" ADD CONSTRAINT "TipSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TipUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipStaff" ADD CONSTRAINT "TipStaff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "TipLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipStaff" ADD CONSTRAINT "TipStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TipUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "TipLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEntry" ADD CONSTRAINT "ShiftEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEntry" ADD CONSTRAINT "ShiftEntry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TipStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ShiftEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "TipStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipAuditLog" ADD CONSTRAINT "TipAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TipUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
