CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "platformName" TEXT NOT NULL DEFAULT 'HandCraft Market',
    "platformDescription" TEXT NOT NULL DEFAULT 'Marketplace for handmade products',
    "commissionBps" INTEGER NOT NULL DEFAULT 1000,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

