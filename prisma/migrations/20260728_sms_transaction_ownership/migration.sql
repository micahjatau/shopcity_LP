ALTER TABLE "SmsMessage"
  DROP CONSTRAINT IF EXISTS "SmsMessage_tenantId_receiptId_fkey";

DROP INDEX IF EXISTS "SmsMessage_tenantId_receiptId_key";

ALTER TABLE "SmsMessage"
  ALTER COLUMN "receiptId" DROP NOT NULL,
  ADD COLUMN "ledgerEntryId" TEXT,
  ADD COLUMN "redemptionId" TEXT,
  ADD COLUMN "adjustmentId" TEXT;

CREATE INDEX "SmsMessage_tenantId_receiptId_idx" ON "SmsMessage"("tenantId", "receiptId");
CREATE INDEX "SmsMessage_tenantId_ledgerEntryId_idx" ON "SmsMessage"("tenantId", "ledgerEntryId");
CREATE INDEX "SmsMessage_tenantId_redemptionId_idx" ON "SmsMessage"("tenantId", "redemptionId");
CREATE INDEX "SmsMessage_tenantId_adjustmentId_idx" ON "SmsMessage"("tenantId", "adjustmentId");

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_tenantId_receiptId_fkey" FOREIGN KEY ("tenantId", "receiptId") REFERENCES "Receipt"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmsMessage_tenantId_ledgerEntryId_fkey" FOREIGN KEY ("tenantId", "ledgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmsMessage_tenantId_redemptionId_fkey" FOREIGN KEY ("tenantId", "redemptionId") REFERENCES "Redemption"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmsMessage_tenantId_adjustmentId_fkey" FOREIGN KEY ("tenantId", "adjustmentId") REFERENCES "Adjustment"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_financial_reference_present_check" CHECK (
    "receiptId" IS NOT NULL
    OR "ledgerEntryId" IS NOT NULL
    OR "redemptionId" IS NOT NULL
    OR "adjustmentId" IS NOT NULL
  );
