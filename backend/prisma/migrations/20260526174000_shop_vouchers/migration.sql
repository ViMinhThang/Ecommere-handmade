-- Add optional seller ownership for shop-specific vouchers.
ALTER TABLE "Voucher" ADD COLUMN "sellerId" TEXT;

ALTER TABLE "Voucher"
ADD CONSTRAINT "Voucher_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Voucher_sellerId_isActive_endDate_idx"
ON "Voucher"("sellerId", "isActive", "endDate");
