-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'ORDER_CANCELLED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'REFUND_UPDATED', 'PRODUCT_SUBMITTED', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED', 'CHAT_MESSAGE', 'CUSTOM_QUOTE_SENT', 'CUSTOM_ORDER_CREATED', 'CUSTOM_ORDER_STATUS_UPDATED', 'REPORT_CREATED', 'REPORT_STATUS_UPDATED', 'REVIEW_CREATED', 'REVIEW_REPLIED', 'QUESTION_CREATED', 'QUESTION_ANSWERED', 'REWARD_POINTS_UPDATED', 'SYSTEM');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
