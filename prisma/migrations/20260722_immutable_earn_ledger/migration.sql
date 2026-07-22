CREATE TYPE "LedgerEntryStatus" AS ENUM ('CONFIRMED');

CREATE TYPE "LedgerEntryType" AS ENUM ('EARN');

CREATE TYPE "LedgerEntryDirection" AS ENUM ('CREDIT');

CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED', 'EXPIRED');

CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

CREATE TABLE "LoyaltyLedgerEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "type" "LedgerEntryType" NOT NULL,
  "direction" "LedgerEntryDirection" NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "status" "LedgerEntryStatus" NOT NULL DEFAULT 'CONFIRMED',
  "correlationId" TEXT NOT NULL,
  "reversesEntryId" TEXT,
  "createdBy" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditLot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "earnLedgerEntryId" TEXT NOT NULL,
  "originalAmountKobo" BIGINT NOT NULL,
  "remainingAmountKobo" BIGINT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Approval" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedByTenantId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "reasonCode" TEXT,
  "decisionByTenantId" TEXT,
  "decisionBy" TEXT,
  "decisionReason" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyLedgerEntry_receiptId_key" ON "LoyaltyLedgerEntry"("receiptId");
CREATE UNIQUE INDEX "LoyaltyLedgerEntry_correlationId_key" ON "LoyaltyLedgerEntry"("correlationId");
CREATE UNIQUE INDEX "LoyaltyLedgerEntry_reversesEntryId_key" ON "LoyaltyLedgerEntry"("reversesEntryId");
CREATE UNIQUE INDEX "LoyaltyLedgerEntry_tenantId_id_key" ON "LoyaltyLedgerEntry"("tenantId", "id");
CREATE UNIQUE INDEX "CreditLot_earnLedgerEntryId_key" ON "CreditLot"("earnLedgerEntryId");
CREATE UNIQUE INDEX "CreditLot_tenantId_earnLedgerEntryId_key" ON "CreditLot"("tenantId", "earnLedgerEntryId");
CREATE UNIQUE INDEX "Approval_receiptId_key" ON "Approval"("receiptId");

CREATE INDEX "LoyaltyLedgerEntry_tenantId_customerId_effectiveAt_idx" ON "LoyaltyLedgerEntry"("tenantId", "customerId", "effectiveAt");
CREATE INDEX "LoyaltyLedgerEntry_tenantId_createdAt_idx" ON "LoyaltyLedgerEntry"("tenantId", "createdAt");
CREATE INDEX "CreditLot_tenantId_customerId_expiresAt_idx" ON "CreditLot"("tenantId", "customerId", "expiresAt");
CREATE INDEX "Approval_tenantId_status_requestedAt_idx" ON "Approval"("tenantId", "status", "requestedAt");
CREATE INDEX "OutboxEvent_tenantId_status_nextAttemptAt_idx" ON "OutboxEvent"("tenantId", "status", "nextAttemptAt");

ALTER TABLE "LoyaltyLedgerEntry"
  ADD CONSTRAINT "LoyaltyLedgerEntry_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyLedgerEntry"
  ADD CONSTRAINT "LoyaltyLedgerEntry_tenantId_customerId_fkey"
  FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyLedgerEntry"
  ADD CONSTRAINT "LoyaltyLedgerEntry_tenantId_receiptId_fkey"
  FOREIGN KEY ("tenantId", "receiptId") REFERENCES "Receipt"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditLot"
  ADD CONSTRAINT "CreditLot_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditLot"
  ADD CONSTRAINT "CreditLot_tenantId_customerId_fkey"
  FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditLot"
  ADD CONSTRAINT "CreditLot_tenantId_earnLedgerEntryId_fkey"
  FOREIGN KEY ("tenantId", "earnLedgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_tenantId_receiptId_fkey"
  FOREIGN KEY ("tenantId", "receiptId") REFERENCES "Receipt"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
