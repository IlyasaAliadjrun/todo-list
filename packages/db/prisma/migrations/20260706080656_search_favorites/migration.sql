-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "searchVector" tsvector;

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_pageId_key" ON "Favorite"("userId", "pageId");

-- CreateIndex
CREATE INDEX "Page_searchVector_idx" ON "Page" USING GIN ("searchVector");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger: maintain searchVector dari (title + searchText) pada INSERT/UPDATE.
CREATE OR REPLACE FUNCTION page_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW."searchText",''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER page_search_vector_trg
  BEFORE INSERT OR UPDATE OF title, "searchText" ON "Page"
  FOR EACH ROW EXECUTE FUNCTION page_search_vector_update();

-- Backfill baris yang sudah ada.
UPDATE "Page" SET "searchVector" = to_tsvector('simple', coalesce(title,'') || ' ' || coalesce("searchText",''));
