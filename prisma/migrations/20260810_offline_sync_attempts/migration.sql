-- Add offline sync evidence without changing financial history.
CREATE TYPE "OfflineSyncStatus" AS ENUM (
  'CONFIRMED',
  'PENDING_APPROVAL',
  'REJECTED',
  'RETRYABLE'
);

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

  CONSTRAINT "OfflineSyncAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfflineSyncAttempt_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OfflineSyncAttempt_tenantId_deviceId_localId_key"
  ON "OfflineSyncAttempt"("tenantId", "deviceId", "localId");

CREATE INDEX "OfflineSyncAttempt_tenantId_status_syncedAt_idx"
  ON "OfflineSyncAttempt"("tenantId", "status", "syncedAt");

CREATE INDEX "OfflineSyncAttempt_tenantId_branchId_syncedAt_idx"
  ON "OfflineSyncAttempt"("tenantId", "branchId", "syncedAt");

CREATE INDEX "OfflineSyncAttempt_tenantId_cashierId_syncedAt_idx"
  ON "OfflineSyncAttempt"("tenantId", "cashierId", "syncedAt");
