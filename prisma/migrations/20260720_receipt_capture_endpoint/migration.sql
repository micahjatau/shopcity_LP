CREATE TYPE "IdempotencyRecordStatus" AS ENUM ('PENDING', 'COMPLETED');

ALTER TABLE "Receipt"
  ADD COLUMN "tenantId" TEXT NOT NULL,
  ADD COLUMN "customerId" TEXT NOT NULL,
  ADD COLUMN "cardId" TEXT NOT NULL,
  ADD COLUMN "deviceId" TEXT,
  ADD COLUMN "externalReceiptNumber" TEXT,
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL,
  ADD COLUMN "capturedByTenantId" TEXT NOT NULL,
  ADD COLUMN "capturedBy" TEXT NOT NULL,
  ADD COLUMN "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_customerId_fkey"
  FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_cardId_fkey"
  FOREIGN KEY ("tenantId", "cardId") REFERENCES "Card"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "Device"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_capturedBy_fkey"
  FOREIGN KEY ("capturedByTenantId", "capturedBy") REFERENCES "User"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Receipt_tenantId_id_key"
  ON "Receipt"("tenantId", "id");

CREATE INDEX "Receipt_tenantId_branchId_receiptWeekStart_idx"
  ON "Receipt"("tenantId", "branchId", "receiptWeekStart");

CREATE INDEX "Receipt_tenantId_cardId_occurredAt_idx"
  ON "Receipt"("tenantId", "cardId", "occurredAt");

CREATE INDEX "Receipt_capturedByTenantId_capturedBy_idx"
  ON "Receipt"("capturedByTenantId", "capturedBy");

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseJson" JSONB,
  "status" "IdempotencyRecordStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyRecord_actorId_endpoint_idempotencyKey_key"
  ON "IdempotencyRecord"("actorId", "endpoint", "idempotencyKey");

CREATE INDEX "IdempotencyRecord_expiresAt_idx"
  ON "IdempotencyRecord"("expiresAt");
