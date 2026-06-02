-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "giftWrapFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "giftWrapTierId" TEXT,
ADD COLUMN     "giftWrapTierSnapshot" JSONB;

-- CreateTable
CREATE TABLE "GiftWrapTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "includesCard" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftWrapTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftWrapTier_isActive_sortOrder_idx" ON "GiftWrapTier"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "GiftWrapTier_deletedAt_idx" ON "GiftWrapTier"("deletedAt");

-- CreateIndex
CREATE INDEX "Order_giftWrapTierId_idx" ON "Order"("giftWrapTierId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_giftWrapTierId_fkey" FOREIGN KEY ("giftWrapTierId") REFERENCES "GiftWrapTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
