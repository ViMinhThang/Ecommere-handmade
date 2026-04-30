-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'COD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'COD_PENDING', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

UPDATE "Order"
SET
  "paymentMethod" = CASE
    WHEN "paymentIntentId" IS NULL THEN 'COD'::"PaymentMethod"
    ELSE 'STRIPE'::"PaymentMethod"
  END,
  "paymentStatus" = CASE
    WHEN "status" = 'PAID'::"OrderStatus" THEN 'PAID'::"PaymentStatus"
    WHEN "paymentIntentId" IS NULL THEN 'COD_PENDING'::"PaymentStatus"
    ELSE 'UNPAID'::"PaymentStatus"
  END;

