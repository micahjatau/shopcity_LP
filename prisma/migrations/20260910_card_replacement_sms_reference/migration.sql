ALTER TABLE "SmsMessage"
  ADD COLUMN "cardId" TEXT;

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_tenantId_cardId_fkey"
  FOREIGN KEY ("tenantId", "cardId")
  REFERENCES "Card"("tenantId", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE INDEX "SmsMessage_tenantId_cardId_idx"
  ON "SmsMessage"("tenantId", "cardId");

ALTER TABLE "SmsMessage"
  DROP CONSTRAINT IF EXISTS "SmsMessage_financial_reference_present_check";

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_financial_reference_present_check" CHECK (
    "receiptId" IS NOT NULL
    OR "ledgerEntryId" IS NOT NULL
    OR "redemptionId" IS NOT NULL
    OR "adjustmentId" IS NOT NULL
    OR "cardId" IS NOT NULL
    OR "template" = 'credit-expiry-reminder-v1'
  );
