CREATE TABLE "PolicyConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "defaultEarnRateBps" INTEGER NOT NULL,
    "minRedemptionKobo" BIGINT NOT NULL,
    "maxRedemptionBasketPercent" INTEGER NOT NULL,
    "purchaseFlagThresholdKobo" BIGINT NOT NULL,
    "purchaseApprovalThresholdKobo" BIGINT NOT NULL,
    "purchaseAmountCeilingKobo" BIGINT NOT NULL,
    "redemptionApprovalThresholdKobo" BIGINT NOT NULL,
    "offlineRedemptionDisabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PolicyConfiguration_tenantId_branchId_key" ON "PolicyConfiguration"("tenantId", "branchId");
CREATE INDEX "PolicyConfiguration_tenantId_version_idx" ON "PolicyConfiguration"("tenantId", "version");

ALTER TABLE "PolicyConfiguration" ADD CONSTRAINT "PolicyConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PolicyConfiguration" ADD CONSTRAINT "PolicyConfiguration_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
