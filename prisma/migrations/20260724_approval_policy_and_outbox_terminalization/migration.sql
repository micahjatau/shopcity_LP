ALTER TABLE "Approval"
  ADD COLUMN "policyVersion" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "Approval"
SET
  "policyVersion" = COALESCE("policyVersion", 'legacy'),
  "expiresAt" = COALESCE("expiresAt", "requestedAt" + INTERVAL '24 hours');

ALTER TABLE "Approval"
  ALTER COLUMN "policyVersion" SET NOT NULL,
  ALTER COLUMN "expiresAt" SET NOT NULL;

ALTER TABLE "OutboxEvent"
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3),
  ADD COLUMN "failureCategory" TEXT;
