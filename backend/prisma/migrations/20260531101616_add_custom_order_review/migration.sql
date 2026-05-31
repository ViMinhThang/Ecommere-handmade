-- CreateTable
CREATE TABLE "CustomOrderReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sellerReply" TEXT,
    "userId" TEXT NOT NULL,
    "customOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomOrderReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomOrderReview_customOrderId_key" ON "CustomOrderReview"("customOrderId");

-- CreateIndex
CREATE INDEX "CustomOrderReview_customOrderId_idx" ON "CustomOrderReview"("customOrderId");

-- CreateIndex
CREATE INDEX "CustomOrderReview_userId_idx" ON "CustomOrderReview"("userId");

-- AddForeignKey
ALTER TABLE "CustomOrderReview" ADD CONSTRAINT "CustomOrderReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOrderReview" ADD CONSTRAINT "CustomOrderReview_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
