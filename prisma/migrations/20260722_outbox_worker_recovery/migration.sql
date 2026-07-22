ALTER TYPE "OutboxEventStatus" ADD VALUE IF NOT EXISTS 'QUEUED';

CREATE TYPE "SmsMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SUPPRESSED');

CREATE TABLE "SmsMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "outboxEventId" TEXT NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "SmsMessageStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "suppressedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvent_tenantId_id_key" ON "OutboxEvent"("tenantId", "id");
CREATE UNIQUE INDEX "SmsMessage_tenantId_receiptId_key" ON "SmsMessage"("tenantId", "receiptId");
CREATE UNIQUE INDEX "SmsMessage_tenantId_outboxEventId_key" ON "SmsMessage"("tenantId", "outboxEventId");
CREATE INDEX "SmsMessage_tenantId_status_queuedAt_idx" ON "SmsMessage"("tenantId", "status", "queuedAt");

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_tenantId_receiptId_fkey"
  FOREIGN KEY ("tenantId", "receiptId") REFERENCES "Receipt"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmsMessage"
  ADD CONSTRAINT "SmsMessage_tenantId_outboxEventId_fkey"
  FOREIGN KEY ("tenantId", "outboxEventId") REFERENCES "OutboxEvent"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
