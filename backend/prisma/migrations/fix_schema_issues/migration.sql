-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "totalSpent" SET DATA TYPE DECIMAL(65,30) USING "totalSpent"::DECIMAL(65,30),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Category"
  ALTER COLUMN "description" DROP NOT NULL,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Product"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30) USING "price"::DECIMAL(65,30),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AddForeignKey for Product->Category Restrict
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "Category_status_idx" ON "Category"("status");
CREATE INDEX "Product_status_idx" ON "Product"("status");
