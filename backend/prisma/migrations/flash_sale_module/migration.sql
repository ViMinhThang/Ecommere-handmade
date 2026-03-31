-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "banner" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSaleCategory" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "FlashSaleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSaleRange" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSaleRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlashSaleCategory_flashSaleId_categoryId_key" ON "FlashSaleCategory"("flashSaleId", "categoryId");

-- CreateIndex
CREATE INDEX "FlashSaleCategory_flashSaleId_idx" ON "FlashSaleCategory"("flashSaleId");

-- CreateIndex
CREATE INDEX "FlashSaleCategory_categoryId_idx" ON "FlashSaleCategory"("categoryId");

-- CreateIndex
CREATE INDEX "FlashSaleRange_flashSaleId_idx" ON "FlashSaleRange"("flashSaleId");

-- AddForeignKey
ALTER TABLE "FlashSaleCategory" ADD CONSTRAINT "FlashSaleCategory_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleCategory" ADD CONSTRAINT "FlashSaleCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleRange" ADD CONSTRAINT "FlashSaleRange_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
