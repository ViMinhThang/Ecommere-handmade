-- CreateEnum
CREATE TYPE "FlashSaleState" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- AlterTable
ALTER TABLE "FlashSale" ADD COLUMN     "autoPauseThreshold" INTEGER,
ADD COLUMN     "maxUnits" INTEGER,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedReason" TEXT,
ADD COLUMN     "perUserLimit" INTEGER,
ADD COLUMN     "reserveStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservedUnits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saleState" "FlashSaleState" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "soldUnits" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "flashSaleDiscountPercent" DECIMAL(65,30),
ADD COLUMN     "flashSaleId" TEXT;

-- CreateTable
CREATE TABLE "FlashSaleUserUsage" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "soldUnits" INTEGER NOT NULL DEFAULT 0,
    "reservedUnits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSaleUserUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashSaleUserUsage_userId_idx" ON "FlashSaleUserUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashSaleUserUsage_flashSaleId_userId_key" ON "FlashSaleUserUsage"("flashSaleId", "userId");

-- CreateIndex
CREATE INDEX "FlashSale_isActive_saleState_startAt_endAt_idx" ON "FlashSale"("isActive", "saleState", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "OrderItem_flashSaleId_idx" ON "OrderItem"("flashSaleId");

-- AddForeignKey
ALTER TABLE "FlashSaleUserUsage" ADD CONSTRAINT "FlashSaleUserUsage_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleUserUsage" ADD CONSTRAINT "FlashSaleUserUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
