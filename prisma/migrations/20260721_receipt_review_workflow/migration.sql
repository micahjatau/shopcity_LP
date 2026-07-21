CREATE TYPE "ReceiptReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Device"
  ADD CONSTRAINT "Device_tenantId_branchId_id_key"
  UNIQUE ("tenantId", "branchId", "id");

ALTER TABLE "Receipt"
  ADD COLUMN "reviewStatus" "ReceiptReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByTenantId" TEXT,
  ADD COLUMN "reviewedBy" TEXT;

ALTER TABLE "Receipt"
  DROP CONSTRAINT "Receipt_deviceId_fkey";

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_deviceId_fkey"
  FOREIGN KEY ("tenantId", "branchId", "deviceId") REFERENCES "Device"("tenantId", "branchId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_reviewedByTenantId_reviewedBy_fkey"
  FOREIGN KEY ("reviewedByTenantId", "reviewedBy") REFERENCES "User"("tenantId", "id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Receipt_reviewedByTenantId_reviewedBy_idx"
  ON "Receipt"("reviewedByTenantId", "reviewedBy");
