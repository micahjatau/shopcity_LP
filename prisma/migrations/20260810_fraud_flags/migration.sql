-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FraudFlagStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FraudSubjectType" AS ENUM ('RECEIPT', 'LEDGER_ENTRY', 'REDEMPTION');

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "severity" "FraudSeverity" NOT NULL,
    "status" "FraudFlagStatus" NOT NULL DEFAULT 'OPEN',
    "dedupeKey" TEXT NOT NULL,
    "subjectType" "FraudSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "branchId" TEXT,
    "cashierId" TEXT,
    "customerId" TEXT,
    "receiptId" TEXT,
    "ledgerEntryId" TEXT,
    "redemptionId" TEXT,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3),
    "firstDetectedAt" TIMESTAMP(3) NOT NULL,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "evidence" JSONB NOT NULL,
    "decisionReason" TEXT,
    "decisionActorId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FraudFlag_tenantId_dedupeKey_key" ON "FraudFlag"("tenantId", "dedupeKey");

-- CreateIndex
CREATE INDEX "FraudFlag_tenantId_status_severity_lastDetectedAt_idx" ON "FraudFlag"("tenantId", "status", "severity", "lastDetectedAt");

-- CreateIndex
CREATE INDEX "FraudFlag_tenantId_branchId_status_idx" ON "FraudFlag"("tenantId", "branchId", "status");

-- CreateIndex
CREATE INDEX "FraudFlag_tenantId_cashierId_status_idx" ON "FraudFlag"("tenantId", "cashierId", "status");

-- CreateIndex
CREATE INDEX "FraudFlag_tenantId_customerId_status_idx" ON "FraudFlag"("tenantId", "customerId", "status");

-- CreateIndex
CREATE INDEX "FraudFlag_tenantId_receiptId_idx" ON "FraudFlag"("tenantId", "receiptId");

-- CreateIndex
CREATE INDEX "FraudFlag_tenantId_ledgerEntryId_idx" ON "FraudFlag"("tenantId", "ledgerEntryId");

-- CreateIndex
CREATE INDEX "FraudFlag_tenantId_redemptionId_idx" ON "FraudFlag"("tenantId", "redemptionId");

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
