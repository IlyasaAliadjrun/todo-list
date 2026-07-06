-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('VIEW', 'COMMENT', 'EDIT');

-- CreateEnum
CREATE TYPE "PermissionSubject" AS ENUM ('USER', 'WORKSPACE');

-- CreateTable
CREATE TABLE "PagePermission" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "subjectType" "PermissionSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "level" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagePermission_pageId_idx" ON "PagePermission"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "PagePermission_pageId_subjectType_subjectId_key" ON "PagePermission"("pageId", "subjectType", "subjectId");

-- AddForeignKey
ALTER TABLE "PagePermission" ADD CONSTRAINT "PagePermission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
