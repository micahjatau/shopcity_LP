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
CREATE UNIQUE INDEX "ReportMaterializationState_tenantId_scope_scopeKey_key" ON "ReportMaterializationState"("tenantId", "scope", "scopeKey");

-- CreateIndex
CREATE INDEX "ReportMaterializationState_tenantId_status_idx" ON "ReportMaterializationState"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReportMaterializationState_tenantId_scope_scopeKey_idx" ON "ReportMaterializationState"("tenantId", "scope", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReportDailyFinancialSummary_tenantId_scope_scopeKey_reportD_key" ON "ReportDailyFinancialSummary"("tenantId", "scope", "scopeKey", "reportDate");

-- CreateIndex
CREATE INDEX "ReportDailyFinancialSummary_tenantId_reportDate_idx" ON "ReportDailyFinancialSummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportDailyFinancialSummary_tenantId_scope_scopeKey_idx" ON "ReportDailyFinancialSummary"("tenantId", "scope", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCashierDailySummary_tenantId_scope_scopeKey_cashierId_key" ON "ReportCashierDailySummary"("tenantId", "scope", "scopeKey", "cashierId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCashierDailySummary_tenantId_reportDate_idx" ON "ReportCashierDailySummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCashierDailySummary_tenantId_cashierId_reportDate_idx" ON "ReportCashierDailySummary"("tenantId", "cashierId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCustomerSnapshot_tenantId_scope_scopeKey_customerId_r_key" ON "ReportCustomerSnapshot"("tenantId", "scope", "scopeKey", "customerId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCustomerSnapshot_tenantId_customerId_reportDate_idx" ON "ReportCustomerSnapshot"("tenantId", "customerId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportCustomerSnapshot_tenantId_branchId_reportDate_idx" ON "ReportCustomerSnapshot"("tenantId", "branchId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportLiabilityBucket_tenantId_scope_scopeKey_reportDate_ex_key" ON "ReportLiabilityBucket"("tenantId", "scope", "scopeKey", "reportDate", "expiryMonth", "ageBucket");

-- CreateIndex
CREATE INDEX "ReportLiabilityBucket_tenantId_reportDate_idx" ON "ReportLiabilityBucket"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportLiabilityBucket_tenantId_branchId_reportDate_idx" ON "ReportLiabilityBucket"("tenantId", "branchId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportRedemptionDailySummary_tenantId_scope_scopeKey_report_key" ON "ReportRedemptionDailySummary"("tenantId", "scope", "scopeKey", "reportDate");

-- CreateIndex
CREATE INDEX "ReportRedemptionDailySummary_tenantId_reportDate_idx" ON "ReportRedemptionDailySummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportRedemptionDailySummary_tenantId_branchId_reportDate_idx" ON "ReportRedemptionDailySummary"("tenantId", "branchId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSmsDailySummary_tenantId_scope_scopeKey_reportDate_key" ON "ReportSmsDailySummary"("tenantId", "scope", "scopeKey", "reportDate");

-- CreateIndex
CREATE INDEX "ReportSmsDailySummary_tenantId_reportDate_idx" ON "ReportSmsDailySummary"("tenantId", "reportDate");

-- CreateIndex
CREATE INDEX "ReportSmsDailySummary_tenantId_branchId_reportDate_idx" ON "ReportSmsDailySummary"("tenantId", "branchId", "reportDate");
