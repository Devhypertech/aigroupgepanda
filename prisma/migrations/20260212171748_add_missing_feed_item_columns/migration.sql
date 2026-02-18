-- AlterTable
ALTER TABLE "feed_items" ADD COLUMN     "contentSnippet" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "lens" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "url" TEXT,
ADD COLUMN     "whyThisMatters" JSONB;

-- CreateIndex
CREATE INDEX "feed_items_publishedAt_idx" ON "feed_items"("publishedAt");

-- CreateIndex
CREATE INDEX "feed_items_lens_idx" ON "feed_items"("lens");
