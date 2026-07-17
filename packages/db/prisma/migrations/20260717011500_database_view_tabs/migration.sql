-- Multi-view bertab: pindahkan konfigurasi view dari kolom Database ke tabel
-- DatabaseViewConfig (satu baris = satu tab). Data lama DIMIGRASIKAN dulu,
-- baru kolom lama dibuang.

-- CreateTable
CREATE TABLE "DatabaseViewConfig" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'View',
    "type" "DatabaseViewType" NOT NULL DEFAULT 'TABLE',
    "groupByPropertyId" TEXT,
    "order" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseViewConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatabaseViewConfig_databaseId_order_idx" ON "DatabaseViewConfig"("databaseId", "order");

-- AddForeignKey
ALTER TABLE "DatabaseViewConfig" ADD CONSTRAINT "DatabaseViewConfig_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: kolom tab aktif
ALTER TABLE "Database" ADD COLUMN "activeViewId" TEXT;

-- Data migration: satu tab default per database, disalin dari konfigurasi lama.
-- viewType selain BOARD (TABLE/GALLERY/CALENDAR lama) dipetakan ke TABLE.
INSERT INTO "DatabaseViewConfig" ("id", "databaseId", "name", "type", "groupByPropertyId", "order", "createdAt")
SELECT
    gen_random_uuid()::text,
    d."id",
    CASE WHEN d."viewType" = 'BOARD' THEN 'Board' ELSE 'Tabel' END,
    CASE WHEN d."viewType" = 'BOARD' THEN 'BOARD'::"DatabaseViewType" ELSE 'TABLE'::"DatabaseViewType" END,
    d."groupByPropertyId",
    'a0',
    CURRENT_TIMESTAMP
FROM "Database" d;

UPDATE "Database" d
SET "activeViewId" = v."id"
FROM "DatabaseViewConfig" v
WHERE v."databaseId" = d."id";

-- Kolom lama tak dipakai lagi
ALTER TABLE "Database" DROP COLUMN "coverPropertyId",
DROP COLUMN "datePropertyId",
DROP COLUMN "groupByPropertyId",
DROP COLUMN "viewType";
