-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'DATE', 'URL');

-- CreateTable
CREATE TABLE "Database" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseProperty" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Kolom',
    "type" "PropertyType" NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "order" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseRow" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellValue" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "value" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Database_workspaceId_idx" ON "Database"("workspaceId");

-- CreateIndex
CREATE INDEX "Database_pageId_idx" ON "Database"("pageId");

-- CreateIndex
CREATE INDEX "DatabaseProperty_databaseId_order_idx" ON "DatabaseProperty"("databaseId", "order");

-- CreateIndex
CREATE INDEX "DatabaseRow_databaseId_order_idx" ON "DatabaseRow"("databaseId", "order");

-- CreateIndex
CREATE INDEX "CellValue_propertyId_idx" ON "CellValue"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "CellValue_rowId_propertyId_key" ON "CellValue"("rowId", "propertyId");

-- AddForeignKey
ALTER TABLE "Database" ADD CONSTRAINT "Database_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Database" ADD CONSTRAINT "Database_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseProperty" ADD CONSTRAINT "DatabaseProperty_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseRow" ADD CONSTRAINT "DatabaseRow_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellValue" ADD CONSTRAINT "CellValue_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "DatabaseRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellValue" ADD CONSTRAINT "CellValue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "DatabaseProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
