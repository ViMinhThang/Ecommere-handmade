-- Add optional gift packaging snapshot to standard orders.
ALTER TABLE "Order" ADD COLUMN "giftWrap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "giftCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "giftMessage" TEXT;