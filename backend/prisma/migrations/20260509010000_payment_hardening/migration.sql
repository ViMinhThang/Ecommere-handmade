-- Payment hardening for marketplace order invariants.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "paymentExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomOrder_paymentIntentId_key"
ON "CustomOrder"("paymentIntentId");

CREATE INDEX IF NOT EXISTS "CustomOrder_paymentIntentId_idx"
ON "CustomOrder"("paymentIntentId");

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "paymentIntentId" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_eventId_key"
ON "PaymentWebhookEvent"("eventId");

CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_paymentIntentId_idx"
ON "PaymentWebhookEvent"("paymentIntentId");
