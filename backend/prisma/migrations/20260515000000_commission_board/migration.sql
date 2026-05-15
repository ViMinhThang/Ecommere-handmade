CREATE TYPE "CommissionPostStatus" AS ENUM ('OPEN', 'ASSIGNED', 'CLOSED', 'CANCELLED');
CREATE TYPE "CommissionProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

CREATE TABLE "CommissionPost" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "selectedProposalId" TEXT,
    "customOrderId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetMin" DECIMAL(65,30),
    "budgetMax" DECIMAL(65,30),
    "desiredTimeline" TEXT,
    "referenceImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "CommissionPostStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionProposal" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "proposedPrice" DECIMAL(65,30) NOT NULL,
    "proposedLeadTime" TEXT NOT NULL,
    "sketchImageUrl" TEXT,
    "status" "CommissionProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommissionPost_selectedProposalId_key" ON "CommissionPost"("selectedProposalId");
CREATE INDEX "CommissionPost_customerId_createdAt_idx" ON "CommissionPost"("customerId", "createdAt");
CREATE INDEX "CommissionPost_status_createdAt_idx" ON "CommissionPost"("status", "createdAt");
CREATE UNIQUE INDEX "CommissionProposal_commissionId_sellerId_key" ON "CommissionProposal"("commissionId", "sellerId");
CREATE INDEX "CommissionProposal_sellerId_createdAt_idx" ON "CommissionProposal"("sellerId", "createdAt");
CREATE INDEX "CommissionProposal_commissionId_status_idx" ON "CommissionProposal"("commissionId", "status");

ALTER TABLE "CommissionPost" ADD CONSTRAINT "CommissionPost_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionPost" ADD CONSTRAINT "CommissionPost_selectedProposalId_fkey" FOREIGN KEY ("selectedProposalId") REFERENCES "CommissionProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionProposal" ADD CONSTRAINT "CommissionProposal_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "CommissionPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionProposal" ADD CONSTRAINT "CommissionProposal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
