-- Additive workerless-scheduling evidence and cursor support. No existing rows are rewritten.
CREATE TABLE "ScheduledJobRun" (
  "id" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "flow" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "result" JSONB,
  "failureCategory" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledJobRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduledJobRun_environment_flow_idempotencyKey_key"
  ON "ScheduledJobRun"("environment", "flow", "idempotencyKey");
CREATE INDEX "ScheduledJobRun_environment_flow_startedAt_idx"
  ON "ScheduledJobRun"("environment", "flow", "startedAt");
CREATE INDEX "ScheduledJobRun_status_startedAt_idx"
  ON "ScheduledJobRun"("status", "startedAt");

CREATE TABLE "ScheduledJobCursor" (
  "jobKey" TEXT NOT NULL,
  "cursor" TEXT,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledJobCursor_pkey" PRIMARY KEY ("jobKey")
);

-- Scheduler evidence is backend-only; expose no PostgREST policies.
ALTER TABLE "ScheduledJobRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledJobCursor" ENABLE ROW LEVEL SECURITY;
