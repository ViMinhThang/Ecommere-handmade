-- Add product-level personalization configuration and carry customer text
-- snapshots from cart items into order items.
ALTER TABLE "Product"
ADD COLUMN "personalizationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "personalizationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "personalizationInstructions" TEXT,
ADD COLUMN "personalizationMaxLength" INTEGER NOT NULL DEFAULT 120;

ALTER TABLE "CartItem"
ADD COLUMN "personalization" JSONB;

ALTER TABLE "OrderItem"
ADD COLUMN "personalization" JSONB;
