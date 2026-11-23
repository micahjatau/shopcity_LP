-- Repair historical rows before enforcing the terminal processing invariant.
UPDATE "OutboxEvent"
SET "status" = 'COMPLETED',
    "processedAt" = COALESCE("processedAt", "updatedAt"),
    "nextAttemptAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "processedAt" IS NOT NULL
  AND "status" <> 'COMPLETED'
  AND "deadLetteredAt" IS NULL;

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_processedAt_requires_completed_check"
  CHECK ("processedAt" IS NULL OR "status" = 'COMPLETED');
