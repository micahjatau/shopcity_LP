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
  CONSTRAINT "CreditExpiryReminder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreditExpiryReminder_totalExpiringKobo_positive_check" CHECK ("totalExpiringKobo" > 0),
  CONSTRAINT "CreditExpiryReminder_expiry_window_check" CHECK ("earliestExpiresAt" <= "latestExpiresAt")
);

ALTER TABLE "CreditExpiryReminder"
  ADD CONSTRAINT "CreditExpiryReminder_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditExpiryReminder_tenantId_customerId_fkey"
    FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditExpiryReminder_tenantId_outboxEventId_fkey"
    FOREIGN KEY ("tenantId", "outboxEventId") REFERENCES "OutboxEvent"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CreditExpiryReminder_outboxEventId_key" ON "CreditExpiryReminder"("outboxEventId");
CREATE UNIQUE INDEX "CreditExpiryReminder_tenantId_id_key" ON "CreditExpiryReminder"("tenantId", "id");
CREATE UNIQUE INDEX "CreditExpiryReminder_tenantId_customerId_reminderDate_key"
  ON "CreditExpiryReminder"("tenantId", "customerId", "reminderDate");
CREATE UNIQUE INDEX "CreditExpiryReminder_tenantId_outboxEventId_key"
  ON "CreditExpiryReminder"("tenantId", "outboxEventId");
CREATE INDEX "CreditExpiryReminder_tenantId_reminderDate_idx"
  ON "CreditExpiryReminder"("tenantId", "reminderDate");

ALTER TABLE "SmsMessage"
  DROP CONSTRAINT IF EXISTS "SmsMessage_financial_reference_present_check";

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_financial_reference_present_check" CHECK (
    "receiptId" IS NOT NULL
    OR "ledgerEntryId" IS NOT NULL
    OR "redemptionId" IS NOT NULL
    OR "adjustmentId" IS NOT NULL
    OR "template" = 'credit-expiry-reminder-v1'
  );
