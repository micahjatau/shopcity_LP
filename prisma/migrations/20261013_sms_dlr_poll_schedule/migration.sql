-- Add scheduling metadata so provider DLR lookups are paced and fair.
ALTER TABLE "SmsMessage" ADD COLUMN "nextDeliveryReportPollAt" TIMESTAMP(3);

CREATE INDEX "SmsMessage_status_nextDeliveryReportPollAt_sentAt_idx"
  ON "SmsMessage"("status", "nextDeliveryReportPollAt", "sentAt");
