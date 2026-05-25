-- CreateTable
CREATE TABLE "ShopReview" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopReview_customerId_sellerId_key" ON "ShopReview"("customerId", "sellerId");

-- CreateIndex
CREATE INDEX "ShopReview_sellerId_createdAt_idx" ON "ShopReview"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopReview_sellerId_rating_idx" ON "ShopReview"("sellerId", "rating");

-- CreateIndex
CREATE INDEX "ShopReview_customerId_createdAt_idx" ON "ShopReview"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
