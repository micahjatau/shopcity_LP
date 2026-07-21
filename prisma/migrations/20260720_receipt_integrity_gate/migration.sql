ALTER TABLE "Receipt"
  RENAME COLUMN "receiptNumber" TO "posReceiptNumber";

ALTER TABLE "Receipt"
  ADD COLUMN "normalizedPosReceiptNumber" TEXT;

UPDATE "Receipt"
SET "posReceiptNumber" = "externalReceiptNumber"
WHERE "externalReceiptNumber" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Receipt"
    WHERE "externalReceiptNumber" IS NULL
  ) THEN
    RAISE EXCEPTION 'Receipt legacy POS references are missing';
  END IF;
END $$;

UPDATE "Receipt"
SET "normalizedPosReceiptNumber" = UPPER(TRIM("posReceiptNumber"));

ALTER TABLE "Receipt"
  ALTER COLUMN "normalizedPosReceiptNumber" SET NOT NULL;

ALTER TABLE "Receipt"
  DROP COLUMN "cashierId";

ALTER TABLE "Receipt"
  DROP COLUMN "externalReceiptNumber";

ALTER TABLE "Receipt"
  DROP CONSTRAINT "Receipt_branchId_fkey";

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_branchId_fkey"
  FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Device_tenantId_id_key"
  ON "Device"("tenantId", "id");

ALTER TABLE "Receipt"
  DROP CONSTRAINT "Receipt_deviceId_fkey";

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_deviceId_fkey"
  FOREIGN KEY ("tenantId", "deviceId") REFERENCES "Device"("tenantId", "id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX "Receipt_branchId_receiptNumber_receiptWeekStart_key";

CREATE UNIQUE INDEX "Receipt_tenantId_branchId_receiptWeekStart_normalizedPosReceiptNumber_key"
  ON "Receipt"("tenantId", "branchId", "receiptWeekStart", "normalizedPosReceiptNumber");
