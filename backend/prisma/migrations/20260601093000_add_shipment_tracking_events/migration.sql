-- Add per-sub-order shipment tracking timeline events.
CREATE TYPE "ShipmentTrackingEventType" AS ENUM (
  'STATUS_UPDATED',
  'INFO',
  'LOCATION',
  'EXCEPTION',
  'DELIVERED'
);

CREATE TABLE "ShipmentTrackingEvent" (
  "id" TEXT NOT NULL,
  "subOrderId" TEXT NOT NULL,
  "createdById" TEXT,
  "status" "OrderStatus",
  "type" "ShipmentTrackingEventType" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "carrier" TEXT,
  "trackingCode" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShipmentTrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShipmentTrackingEvent_subOrderId_occurredAt_idx"
  ON "ShipmentTrackingEvent"("subOrderId", "occurredAt");

CREATE INDEX "ShipmentTrackingEvent_createdById_createdAt_idx"
  ON "ShipmentTrackingEvent"("createdById", "createdAt");

CREATE INDEX "ShipmentTrackingEvent_status_occurredAt_idx"
  ON "ShipmentTrackingEvent"("status", "occurredAt");

ALTER TABLE "ShipmentTrackingEvent"
  ADD CONSTRAINT "ShipmentTrackingEvent_subOrderId_fkey"
  FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShipmentTrackingEvent"
  ADD CONSTRAINT "ShipmentTrackingEvent_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
