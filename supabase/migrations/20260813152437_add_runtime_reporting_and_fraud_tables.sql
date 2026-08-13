-- CreateEnum
CREATE TYPE "OfflineSyncStatus" AS ENUM ('CONFIRMED', 'PENDING_APPROVAL', 'REJECTED', 'RETRYABLE');

-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FraudFlagStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FraudSubjectType" AS ENUM ('RECEIPT', 'LEDGER_ENTRY', 'REDEMPTION');

-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'EXPIRY';

-- AlterEnum
ALTER TYPE "OutboxEventStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN     "processedAt" TIMESTAMP(3);

-- DropTable

-- CreateTable
CREATE TABLE "CreditExpiry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "creditLotId" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditExpiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditExpiryReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "totalExpiringKobo" BIGINT NOT NULL,
    "earliestExpiresAt" TIMESTAMP(3) NOT NULL,
    "latestExpiresAt" TIMESTAMP(3) NOT NULL,
    "outboxEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditExpiryReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineSyncAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "posReceiptNumber" TEXT NOT NULL,
    "receiptWeekStartSubmitted" TIMESTAMP(3) NOT NULL,
    "receiptWeekStartDerived" TIMESTAMP(3),
    "purchaseAmountKobo" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" "OfflineSyncStatus" NOT NULL DEFAULT 'RETRYABLE',
    "errorCode" TEXT,
    "responseJson" JSONB,
    "transactionId" TEXT,
    "approvalId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineSyncAttempt_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ReportMaterializationState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "branchId" TEXT,
    "asOf" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "lastError" TEXT,
    "materializedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportMaterializationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDailyFinancialSummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "branchId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "registeredCustomers" INTEGER NOT NULL DEFAULT 0,
    "activeCustomers" INTEGER NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "loyaltyPurchaseValueKobo" BIGINT NOT NULL DEFAULT 0,
    "creditIssuedKobo" BIGINT NOT NULL DEFAULT 0,
    "creditRedeemedKobo" BIGINT NOT NULL DEFAULT 0,
    "creditExpiredKobo" BIGINT NOT NULL DEFAULT 0,
    "outstandingLiabilityKobo" BIGINT NOT NULL DEFAULT 0,
    "materializedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDailyFinancialSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCashierDailySummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "branchId" TEXT,
    "cashierId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseValueKobo" BIGINT NOT NULL DEFAULT 0,
    "creditIssuedKobo" BIGINT NOT NULL DEFAULT 0,
    "duplicateAttempts" INTEGER NOT NULL DEFAULT 0,
    "reversalCount" INTEGER NOT NULL DEFAULT 0,
    "approvalRequests" INTEGER NOT NULL DEFAULT 0,
    "materializedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCashierDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCustomerSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "purchaseValueKobo" BIGINT NOT NULL DEFAULT 0,
    "currentBalanceKobo" BIGINT NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "dormant" BOOLEAN NOT NULL DEFAULT false,
    "materializedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCustomerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportLiabilityBucket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "branchId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "expiryMonth" TEXT NOT NULL,
    "ageBucket" TEXT NOT NULL,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "lotCount" INTEGER NOT NULL DEFAULT 0,
    "outstandingKobo" BIGINT NOT NULL DEFAULT 0,
    "materializedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportLiabilityBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRedemptionDailySummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "branchId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "requestedKobo" BIGINT NOT NULL DEFAULT 0,
    "confirmedKobo" BIGINT NOT NULL DEFAULT 0,
    "reversedKobo" BIGINT NOT NULL DEFAULT 0,
    "pendingApprovalCount" INTEGER NOT NULL DEFAULT 0,
    "materializedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportRedemptionDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSmsDailySummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "branchId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "queuedCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "suppressedCount" INTEGER NOT NULL DEFAULT 0,
    "materializedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSmsDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiry_ledgerEntryId_key" ON "CreditExpiry"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "CreditExpiry_tenantId_expiredAt_idx" ON "CreditExpiry"("tenantId", "expiredAt");

-- CreateIndex
CREATE INDEX "CreditExpiry_tenantId_customerId_expiredAt_idx" ON "CreditExpiry"("tenantId", "customerId", "expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiry_tenantId_id_key" ON "CreditExpiry"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiry_tenantId_creditLotId_key" ON "CreditExpiry"("tenantId", "creditLotId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiry_tenantId_ledgerEntryId_key" ON "CreditExpiry"("tenantId", "ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiryReminder_outboxEventId_key" ON "CreditExpiryReminder"("outboxEventId");

-- CreateIndex
CREATE INDEX "CreditExpiryReminder_tenantId_reminderDate_idx" ON "CreditExpiryReminder"("tenantId", "reminderDate");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiryReminder_tenantId_id_key" ON "CreditExpiryReminder"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiryReminder_tenantId_customerId_reminderDate_key" ON "CreditExpiryReminder"("tenantId", "customerId", "reminderDate");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpiryReminder_tenantId_outboxEventId_key" ON "CreditExpiryReminder"("tenantId", "outboxEventId");

-- CreateIndex
CREATE INDEX "OfflineSyncAttempt_tenantId_status_syncedAt_idx" ON "OfflineSyncAttempt"("tenantId", "status", "syncedAt");

-- CreateIndex
CREATE INDEX "OfflineSyncAttempt_tenantId_branchId_syncedAt_idx" ON "OfflineSyncAttempt"("tenantId", "branchId", "syncedAt");

-- CreateIndex
CREATE INDEX "OfflineSyncAttempt_tenantId_cashierId_syncedAt_idx" ON "OfflineSyncAttempt"("tenantId", "cashierId", "syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineSyncAttempt_tenantId_deviceId_localId_key" ON "OfflineSyncAttempt"("tenantId", "deviceId", "localId");

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

-- CreateIndex
CREATE UNIQUE INDEX "FraudFlag_tenantId_dedupeKey_key" ON "FraudFlag"("tenantId", "dedupeKey");

-- CreateIndex
CREATE INDEX "ReportMaterializationState_tenantId_status_idx" ON "ReportMaterializationState"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReportMaterializationState_tenantId_scope_scopeKey_idx" ON "ReportMaterializationState"("tenantId", "scope", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReportMaterializationState_tenantId_scope_scopeKey_key" ON "ReportMaterializationState"("tenantId", "scope", "scopeKey");

-- CreateIndex
CREATE INDEX "ReportDailyFinancialSummary_tenantId_reportDate_idx" ON "ReportDailyFinancialSummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportDailyFinancialSummary_tenantId_scope_scopeKey_idx" ON "ReportDailyFinancialSummary"("tenantId", "scope", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReportDailyFinancialSummary_tenantId_scope_scopeKey_reportD_key" ON "ReportDailyFinancialSummary"("tenantId", "scope", "scopeKey", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCashierDailySummary_tenantId_reportDate_idx" ON "ReportCashierDailySummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCashierDailySummary_tenantId_cashierId_reportDate_idx" ON "ReportCashierDailySummary"("tenantId", "cashierId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCashierDailySummary_tenantId_scope_scopeKey_cashierId_key" ON "ReportCashierDailySummary"("tenantId", "scope", "scopeKey", "cashierId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCustomerSnapshot_tenantId_customerId_reportDate_idx" ON "ReportCustomerSnapshot"("tenantId", "customerId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCustomerSnapshot_tenantId_branchId_reportDate_idx" ON "ReportCustomerSnapshot"("tenantId", "branchId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCustomerSnapshot_tenantId_scope_scopeKey_customerId_r_key" ON "ReportCustomerSnapshot"("tenantId", "scope", "scopeKey", "customerId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportLiabilityBucket_tenantId_reportDate_idx" ON "ReportLiabilityBucket"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportLiabilityBucket_tenantId_branchId_reportDate_idx" ON "ReportLiabilityBucket"("tenantId", "branchId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportLiabilityBucket_tenantId_scope_scopeKey_reportDate_ex_key" ON "ReportLiabilityBucket"("tenantId", "scope", "scopeKey", "reportDate", "expiryMonth", "ageBucket");

-- CreateIndex
CREATE INDEX "ReportRedemptionDailySummary_tenantId_reportDate_idx" ON "ReportRedemptionDailySummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportRedemptionDailySummary_tenantId_branchId_reportDate_idx" ON "ReportRedemptionDailySummary"("tenantId", "branchId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportRedemptionDailySummary_tenantId_scope_scopeKey_report_key" ON "ReportRedemptionDailySummary"("tenantId", "scope", "scopeKey", "reportDate");

-- CreateIndex
CREATE INDEX "ReportSmsDailySummary_tenantId_reportDate_idx" ON "ReportSmsDailySummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportSmsDailySummary_tenantId_branchId_reportDate_idx" ON "ReportSmsDailySummary"("tenantId", "branchId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSmsDailySummary_tenantId_scope_scopeKey_reportDate_key" ON "ReportSmsDailySummary"("tenantId", "scope", "scopeKey", "reportDate");

-- AddForeignKey
ALTER TABLE "CreditExpiry" ADD CONSTRAINT "CreditExpiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpiry" ADD CONSTRAINT "CreditExpiry_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpiry" ADD CONSTRAINT "CreditExpiry_tenantId_creditLotId_fkey" FOREIGN KEY ("tenantId", "creditLotId") REFERENCES "CreditLot"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpiry" ADD CONSTRAINT "CreditExpiry_tenantId_ledgerEntryId_fkey" FOREIGN KEY ("tenantId", "ledgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpiryReminder" ADD CONSTRAINT "CreditExpiryReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpiryReminder" ADD CONSTRAINT "CreditExpiryReminder_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpiryReminder" ADD CONSTRAINT "CreditExpiryReminder_tenantId_outboxEventId_fkey" FOREIGN KEY ("tenantId", "outboxEventId") REFERENCES "OutboxEvent"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineSyncAttempt" ADD CONSTRAINT "OfflineSyncAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

