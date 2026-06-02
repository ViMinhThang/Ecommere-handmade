-- Add lightweight product option metadata and cart/order snapshots.
ALTER TABLE "Product" ADD COLUMN "optionColors" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "optionMaterials" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "optionSizes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "processingTime" TEXT;

ALTER TABLE "CartItem" ADD COLUMN "selectedOptions" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "selectedOptions" JSONB;
