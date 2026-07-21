CREATE TYPE "ReceiptCaptureStatus" AS ENUM ('CAPTURED', 'FLAGGED', 'PENDING_APPROVAL');

ALTER TABLE "Session"
  ADD COLUMN "deviceId" TEXT;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "Device"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD COLUMN "captureStatus" "ReceiptCaptureStatus" NOT NULL DEFAULT 'CAPTURED',
  ADD COLUMN "approvalReasonCode" TEXT,
  ADD COLUMN "approvedByTenantId" TEXT,
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3);

ALTER TABLE "Receipt"
  DROP CONSTRAINT "Receipt_deviceId_fkey";

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_deviceId_fkey"
  FOREIGN KEY ("tenantId", "deviceId") REFERENCES "Device"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_approvedByTenantId_approvedBy_fkey"
  FOREIGN KEY ("approvedByTenantId", "approvedBy") REFERENCES "User"("tenantId", "id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IdempotencyRecord"
  ADD COLUMN "tenantId" TEXT;

UPDATE "IdempotencyRecord" i
SET "tenantId" = u."tenantId"
FROM "User" u
WHERE u."id" = i."actorId";

ALTER TABLE "IdempotencyRecord"
  ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "IdempotencyRecord"
  ADD CONSTRAINT "IdempotencyRecord_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "IdempotencyRecord_actorId_endpoint_idempotencyKey_key";

CREATE UNIQUE INDEX "IdempotencyRecord_tenantId_actorId_endpoint_idempotencyKey_key"
  ON "IdempotencyRecord"("tenantId", "actorId", "endpoint", "idempotencyKey");

CREATE INDEX "Receipt_approvedByTenantId_approvedBy_idx"
  ON "Receipt"("approvedByTenantId", "approvedBy");

CREATE INDEX "Session_deviceId_idx"
  ON "Session"("deviceId");
