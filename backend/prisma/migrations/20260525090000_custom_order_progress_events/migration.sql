-- CreateTable
CREATE TABLE "CustomOrderProgressEvent" (
    "id" TEXT NOT NULL,
    "customOrderId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "status" "CustomOrderStatus",
    "title" TEXT NOT NULL,
    "note" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomOrderProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomOrderProgressEvent_customOrderId_createdAt_idx" ON "CustomOrderProgressEvent"("customOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomOrderProgressEvent_actorId_createdAt_idx" ON "CustomOrderProgressEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomOrderProgressEvent_status_createdAt_idx" ON "CustomOrderProgressEvent"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomOrderProgressEvent" ADD CONSTRAINT "CustomOrderProgressEvent_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOrderProgressEvent" ADD CONSTRAINT "CustomOrderProgressEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
