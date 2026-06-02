-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shopPolicyUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "shopProcessingTime" TEXT,
ADD COLUMN     "shopReturnPolicy" TEXT,
ADD COLUMN     "shopShippingPolicy" TEXT;
