-- Add voucher snapshot support for custom order payments.
ALTER TABLE "CustomOrder"
ADD COLUMN "voucherId" TEXT,
ADD COLUMN "voucherCode" TEXT,
ADD COLUMN "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "VoucherUsage"
ADD COLUMN "customOrderId" TEXT;

CREATE UNIQUE INDEX "VoucherUsage_customOrderId_key" ON "VoucherUsage"("customOrderId");
CREATE INDEX "VoucherUsage_customOrderId_idx" ON "VoucherUsage"("customOrderId");
CREATE INDEX "CustomOrder_voucherId_idx" ON "CustomOrder"("voucherId");

ALTER TABLE "CustomOrder"
ADD CONSTRAINT "CustomOrder_voucherId_fkey"
FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VoucherUsage"
ADD CONSTRAINT "VoucherUsage_customOrderId_fkey"
FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
