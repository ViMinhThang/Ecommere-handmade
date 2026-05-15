-- CreateEnum
CREATE TYPE "RewardPointLedgerType" AS ENUM ('EARN', 'REDEEM', 'REFUND', 'ADJUSTMENT', 'EXPIRE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SHOP', 'CUSTOMER', 'PRODUCT', 'ORDER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "rewardPointsBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "rewardPointsRedeemed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardDiscountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RewardPointLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "RewardPointLedgerType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardPointLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetProductId" TEXT,
    "orderId" TEXT,
    "type" "ReportType" NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardPointLedger_idempotencyKey_key" ON "RewardPointLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RewardPointLedger_userId_createdAt_idx" ON "RewardPointLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardPointLedger_orderId_idx" ON "RewardPointLedger"("orderId");

-- CreateIndex
CREATE INDEX "RewardPointLedger_type_idx" ON "RewardPointLedger"("type");

-- CreateIndex
CREATE INDEX "Report_reporterId_createdAt_idx" ON "Report"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetUserId_createdAt_idx" ON "Report"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetProductId_idx" ON "Report"("targetProductId");

-- CreateIndex
CREATE INDEX "Report_orderId_idx" ON "Report"("orderId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_type_idx" ON "Report"("type");

-- AddForeignKey
ALTER TABLE "RewardPointLedger" ADD CONSTRAINT "RewardPointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardPointLedger" ADD CONSTRAINT "RewardPointLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
