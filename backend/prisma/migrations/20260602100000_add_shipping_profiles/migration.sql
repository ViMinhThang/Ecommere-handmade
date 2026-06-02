-- Add seller-managed shipping profiles and order ETA snapshots.
CREATE TABLE "ShippingProfile" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "trackingUrlTemplate" TEXT,
    "processingMinDays" INTEGER NOT NULL DEFAULT 1,
    "processingMaxDays" INTEGER NOT NULL DEFAULT 3,
    "transitMinDays" INTEGER NOT NULL DEFAULT 2,
    "transitMaxDays" INTEGER NOT NULL DEFAULT 5,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "shippingProfileId" TEXT;

ALTER TABLE "SubOrder" ADD COLUMN "shippingProfileId" TEXT;
ALTER TABLE "SubOrder" ADD COLUMN "shippingProfileSnapshot" JSONB;
ALTER TABLE "SubOrder" ADD COLUMN "estimatedShipStartAt" TIMESTAMP(3);
ALTER TABLE "SubOrder" ADD COLUMN "estimatedShipEndAt" TIMESTAMP(3);
ALTER TABLE "SubOrder" ADD COLUMN "estimatedDeliveryStartAt" TIMESTAMP(3);
ALTER TABLE "SubOrder" ADD COLUMN "estimatedDeliveryEndAt" TIMESTAMP(3);

CREATE INDEX "ShippingProfile_sellerId_isActive_isDefault_idx" ON "ShippingProfile"("sellerId", "isActive", "isDefault");
CREATE INDEX "ShippingProfile_sellerId_createdAt_idx" ON "ShippingProfile"("sellerId", "createdAt");
CREATE INDEX "Product_shippingProfileId_idx" ON "Product"("shippingProfileId");
CREATE INDEX "SubOrder_shippingProfileId_idx" ON "SubOrder"("shippingProfileId");
CREATE INDEX "SubOrder_estimatedDeliveryStartAt_estimatedDeliveryEndAt_idx" ON "SubOrder"("estimatedDeliveryStartAt", "estimatedDeliveryEndAt");

ALTER TABLE "ShippingProfile" ADD CONSTRAINT "ShippingProfile_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubOrder" ADD CONSTRAINT "SubOrder_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
