-- CreateTable
CREATE TABLE "PilotOperationsSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "outboxBacklogCount" INTEGER NOT NULL,
    "outboxStaleCount" INTEGER NOT NULL,
    "smsFailedCount" INTEGER NOT NULL,
    "offlineSyncFailureCount" INTEGER NOT NULL,
    "fraudOpenCount" INTEGER NOT NULL,
    "staleReportCount" INTEGER NOT NULL,
    "reconciliationHealthy" BOOLEAN NOT NULL,
    "reconciliationMismatchCount" INTEGER NOT NULL,

    CONSTRAINT "PilotOperationsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PilotOperationsSnapshot_capturedAt_idx" ON "PilotOperationsSnapshot"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PilotOperationsSnapshot_tenantId_bucketStart_key" ON "PilotOperationsSnapshot"("tenantId", "bucketStart");

-- AddForeignKey
ALTER TABLE "PilotOperationsSnapshot" ADD CONSTRAINT "PilotOperationsSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep this public-schema telemetry table inaccessible to browser/Data API roles.
ALTER TABLE "PilotOperationsSnapshot" ENABLE ROW LEVEL SECURITY;
