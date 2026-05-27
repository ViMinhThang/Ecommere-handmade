-- Add voucher caps and usage tracking for local MVP checkout safety.
ALTER TABLE "Voucher"
ADD COLUMN "maxDiscountAmount" DECIMAL(65,30),
ADD COLUMN "usageLimit" INTEGER,
ADD COLUMN "perUserLimit" INTEGER,
ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "VoucherUsage" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VoucherUsage_orderId_key" ON "VoucherUsage"("orderId");
CREATE INDEX "Voucher_isActive_endDate_idx" ON "Voucher"("isActive", "endDate");
CREATE INDEX "VoucherUsage_voucherId_createdAt_idx" ON "VoucherUsage"("voucherId", "createdAt");
CREATE INDEX "VoucherUsage_userId_createdAt_idx" ON "VoucherUsage"("userId", "createdAt");

ALTER TABLE "VoucherUsage"
ADD CONSTRAINT "VoucherUsage_voucherId_fkey"
FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoucherUsage"
ADD CONSTRAINT "VoucherUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoucherUsage"
ADD CONSTRAINT "VoucherUsage_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
