ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

ALTER TYPE "CustomOrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "CustomOrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "MarketplaceLedgerEntryType" AS ENUM (
  'PAYMENT_CAPTURE',
  'SELLER_EARNING',
  'PLATFORM_FEE',
  'PLATFORM_DISCOUNT',
  'REFUND',
  'PAYOUT'
);

CREATE TYPE "MarketplaceLedgerEntryStatus" AS ENUM (
  'PENDING',
  'POSTED',
  'VOIDED'
);

CREATE TYPE "RefundStatus" AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TYPE "SellerPayoutStatus" AS ENUM (
  'PENDING',
  'PAID',
  'FAILED'
);

ALTER TABLE "Order"
  ADD COLUMN "checkoutIdempotencyKey" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'vnd';

ALTER TABLE "OrderItem"
  ADD COLUMN "originalPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "platformDiscountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "CustomOrder"
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "paymentExpiresAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);

CREATE TABLE "MarketplaceLedgerEntry" (
  "id" TEXT NOT NULL,
  "type" "MarketplaceLedgerEntryType" NOT NULL,
  "status" "MarketplaceLedgerEntryStatus" NOT NULL DEFAULT 'POSTED',
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'vnd',
  "idempotencyKey" TEXT NOT NULL,
  "orderId" TEXT,
  "subOrderId" TEXT,
  "customOrderId" TEXT,
  "refundId" TEXT,
  "sellerId" TEXT,
  "customerId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "orderId" TEXT,
  "subOrderId" TEXT,
  "customOrderId" TEXT,
  "paymentIntentId" TEXT NOT NULL,
  "providerRefundId" TEXT,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'vnd',
  "reason" TEXT NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SellerPayout" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'vnd',
  "status" "SellerPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "providerRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_customerId_checkoutIdempotencyKey_key"
  ON "Order"("customerId", "checkoutIdempotencyKey");

CREATE UNIQUE INDEX "MarketplaceLedgerEntry_idempotencyKey_key"
  ON "MarketplaceLedgerEntry"("idempotencyKey");
CREATE INDEX "MarketplaceLedgerEntry_sellerId_createdAt_idx"
  ON "MarketplaceLedgerEntry"("sellerId", "createdAt");
CREATE INDEX "MarketplaceLedgerEntry_customerId_createdAt_idx"
  ON "MarketplaceLedgerEntry"("customerId", "createdAt");
CREATE INDEX "MarketplaceLedgerEntry_orderId_idx"
  ON "MarketplaceLedgerEntry"("orderId");
CREATE INDEX "MarketplaceLedgerEntry_subOrderId_idx"
  ON "MarketplaceLedgerEntry"("subOrderId");
CREATE INDEX "MarketplaceLedgerEntry_customOrderId_idx"
  ON "MarketplaceLedgerEntry"("customOrderId");
CREATE INDEX "MarketplaceLedgerEntry_refundId_idx"
  ON "MarketplaceLedgerEntry"("refundId");
CREATE INDEX "MarketplaceLedgerEntry_type_status_idx"
  ON "MarketplaceLedgerEntry"("type", "status");

CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX "Refund_subOrderId_idx" ON "Refund"("subOrderId");
CREATE INDEX "Refund_customOrderId_idx" ON "Refund"("customOrderId");
CREATE INDEX "Refund_paymentIntentId_idx" ON "Refund"("paymentIntentId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

CREATE UNIQUE INDEX "SellerPayout_idempotencyKey_key"
  ON "SellerPayout"("idempotencyKey");
CREATE INDEX "SellerPayout_sellerId_createdAt_idx"
  ON "SellerPayout"("sellerId", "createdAt");
CREATE INDEX "SellerPayout_status_idx" ON "SellerPayout"("status");

ALTER TABLE "MarketplaceLedgerEntry"
  ADD CONSTRAINT "MarketplaceLedgerEntry_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceLedgerEntry_subOrderId_fkey"
    FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceLedgerEntry_customOrderId_fkey"
    FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceLedgerEntry_refundId_fkey"
    FOREIGN KEY ("refundId") REFERENCES "Refund"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceLedgerEntry_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceLedgerEntry_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Refund_subOrderId_fkey"
    FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Refund_customOrderId_fkey"
    FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SellerPayout"
  ADD CONSTRAINT "SellerPayout_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
