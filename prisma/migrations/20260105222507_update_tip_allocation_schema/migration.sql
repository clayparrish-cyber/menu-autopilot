/*
  Warnings:

  - You are about to drop the column `note` on the `TipAllocation` table. All the data in the column will be lost.
  - You are about to drop the column `recipientId` on the `TipAllocation` table. All the data in the column will be lost.
  - Added the required column `recipientName` to the `TipAllocation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TipAllocation" DROP CONSTRAINT "TipAllocation_recipientId_fkey";

-- DropIndex
DROP INDEX "TipAllocation_entryId_recipientId_key";

-- DropIndex
DROP INDEX "TipAllocation_recipientId_idx";

-- AlterTable
ALTER TABLE "TipAllocation" DROP COLUMN "note",
DROP COLUMN "recipientId",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "recipientName" TEXT NOT NULL,
ADD COLUMN     "recipientStaffId" TEXT;

-- CreateIndex
CREATE INDEX "TipAllocation_entryId_idx" ON "TipAllocation"("entryId");

-- CreateIndex
CREATE INDEX "TipAllocation_recipientStaffId_idx" ON "TipAllocation"("recipientStaffId");

-- AddForeignKey
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_recipientStaffId_fkey" FOREIGN KEY ("recipientStaffId") REFERENCES "TipStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
