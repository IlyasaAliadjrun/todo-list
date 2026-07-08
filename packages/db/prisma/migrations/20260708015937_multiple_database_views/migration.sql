-- CreateEnum
CREATE TYPE "DatabaseViewType" AS ENUM ('TABLE', 'BOARD', 'GALLERY', 'CALENDAR');

-- AlterTable
ALTER TABLE "Database" ADD COLUMN     "coverPropertyId" TEXT,
ADD COLUMN     "datePropertyId" TEXT,
ADD COLUMN     "groupByPropertyId" TEXT,
ADD COLUMN     "viewType" "DatabaseViewType" NOT NULL DEFAULT 'TABLE';
