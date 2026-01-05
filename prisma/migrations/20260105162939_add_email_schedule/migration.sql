-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "emailScheduleDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "emailScheduleEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailScheduleHour" INTEGER NOT NULL DEFAULT 14;
