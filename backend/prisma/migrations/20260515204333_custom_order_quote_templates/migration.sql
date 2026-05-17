-- AlterTable
ALTER TABLE "CustomOrder" ADD COLUMN     "quoteAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "quoteSentAt" TIMESTAMP(3),
ADD COLUMN     "quoteSnapshot" JSONB,
ADD COLUMN     "quoteTemplateId" TEXT;

-- CreateTable
CREATE TABLE "CustomOrderQuoteTemplate" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedPrice" DECIMAL(65,30),
    "minPrice" DECIMAL(65,30),
    "maxPrice" DECIMAL(65,30),
    "materials" JSONB NOT NULL DEFAULT '[]',
    "sizeOptions" JSONB NOT NULL DEFAULT '[]',
    "estimatedLeadTime" TEXT,
    "revisionPolicy" TEXT,
    "shippingNote" TEXT,
    "termsNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomOrderQuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomOrderQuoteTemplate_sellerId_isActive_updatedAt_idx" ON "CustomOrderQuoteTemplate"("sellerId", "isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "CustomOrderQuoteTemplate_sellerId_deletedAt_idx" ON "CustomOrderQuoteTemplate"("sellerId", "deletedAt");

-- CreateIndex
CREATE INDEX "CustomOrder_quoteTemplateId_idx" ON "CustomOrder"("quoteTemplateId");

-- AddForeignKey
ALTER TABLE "CustomOrder" ADD CONSTRAINT "CustomOrder_quoteTemplateId_fkey" FOREIGN KEY ("quoteTemplateId") REFERENCES "CustomOrderQuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOrderQuoteTemplate" ADD CONSTRAINT "CustomOrderQuoteTemplate_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
