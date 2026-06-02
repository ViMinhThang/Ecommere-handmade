-- CreateTable
CREATE TABLE "ShopFollow" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopFollow_customerId_sellerId_key" ON "ShopFollow"("customerId", "sellerId");

-- CreateIndex
CREATE INDEX "ShopFollow_customerId_createdAt_idx" ON "ShopFollow"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopFollow_sellerId_createdAt_idx" ON "ShopFollow"("sellerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ShopFollow" ADD CONSTRAINT "ShopFollow_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopFollow" ADD CONSTRAINT "ShopFollow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
