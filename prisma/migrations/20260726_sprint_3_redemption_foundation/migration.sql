ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'REDEEM';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'REVERSAL';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

ALTER TYPE "LedgerEntryDirection" ADD VALUE IF NOT EXISTS 'DEBIT';

CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING_APPROVAL', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'REVERSED');
CREATE TYPE "AdjustmentKind" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "ApprovalTargetType" AS ENUM ('EARN', 'REDEEM');

ALTER TABLE "LoyaltyLedgerEntry"
  ALTER COLUMN "receiptId" DROP NOT NULL;

ALTER TABLE "Approval"
  ADD COLUMN "redemptionId" TEXT,
  ADD COLUMN "targetType" "ApprovalTargetType";

UPDATE "Approval"
SET "targetType" = 'EARN'
WHERE "targetType" IS NULL;

ALTER TABLE "Approval"
  ALTER COLUMN "targetType" SET NOT NULL;

CREATE TABLE "Redemption" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "requestedByTenantId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "requestedAmountKobo" BIGINT NOT NULL,
  "basketAmountKobo" BIGINT NOT NULL,
  "maximumAllowedKobo" BIGINT NOT NULL,
  "confirmedAmountKobo" BIGINT,
  "status" "RedemptionStatus" NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Adjustment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "kind" "AdjustmentKind" NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdByTenantId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RedemptionAllocation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "redemptionId" TEXT,
  "adjustmentId" TEXT,
  "redemptionLedgerEntryId" TEXT NOT NULL,
  "creditLotId" TEXT NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "allocationOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RedemptionAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllocationRestoration" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "allocationId" TEXT NOT NULL,
  "reversalLedgerEntryId" TEXT NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllocationRestoration_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Redemption"
  ADD CONSTRAINT "Redemption_requestedAmountKobo_positive_check" CHECK ("requestedAmountKobo" > 0),
  ADD CONSTRAINT "Redemption_basketAmountKobo_positive_check" CHECK ("basketAmountKobo" > 0),
  ADD CONSTRAINT "Redemption_maximumAllowedKobo_nonnegative_check" CHECK ("maximumAllowedKobo" >= 0),
  ADD CONSTRAINT "Redemption_confirmedAmountKobo_positive_check" CHECK ("confirmedAmountKobo" IS NULL OR "confirmedAmountKobo" > 0);

ALTER TABLE "Adjustment"
  ADD CONSTRAINT "Adjustment_amountKobo_positive_check" CHECK ("amountKobo" > 0),
  ADD CONSTRAINT "Adjustment_reason_nonempty_check" CHECK (length(btrim("reason")) > 0);

ALTER TABLE "RedemptionAllocation"
  ADD CONSTRAINT "RedemptionAllocation_amountKobo_positive_check" CHECK ("amountKobo" > 0),
  ADD CONSTRAINT "RedemptionAllocation_target_xor_check" CHECK (("redemptionId" IS NOT NULL)::int + ("adjustmentId" IS NOT NULL)::int = 1);

ALTER TABLE "AllocationRestoration"
  ADD CONSTRAINT "AllocationRestoration_amountKobo_positive_check" CHECK ("amountKobo" > 0);

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_target_xor_check" CHECK (
    ("targetType" = 'EARN' AND "receiptId" IS NOT NULL AND "redemptionId" IS NULL)
    OR ("targetType" = 'REDEEM' AND "receiptId" IS NULL AND "redemptionId" IS NOT NULL)
  );

CREATE UNIQUE INDEX "CreditLot_tenantId_id_key" ON "CreditLot"("tenantId", "id");

CREATE UNIQUE INDEX "Redemption_tenantId_id_key" ON "Redemption"("tenantId", "id");
CREATE UNIQUE INDEX "Redemption_receiptId_key" ON "Redemption"("receiptId");
CREATE UNIQUE INDEX "Redemption_ledgerEntryId_key" ON "Redemption"("ledgerEntryId");
CREATE UNIQUE INDEX "Redemption_tenantId_receiptId_key" ON "Redemption"("tenantId", "receiptId");
CREATE UNIQUE INDEX "Redemption_tenantId_ledgerEntryId_key" ON "Redemption"("tenantId", "ledgerEntryId");
CREATE INDEX "Redemption_tenantId_customerId_requestedAt_idx" ON "Redemption"("tenantId", "customerId", "requestedAt");
CREATE INDEX "Redemption_tenantId_status_requestedAt_idx" ON "Redemption"("tenantId", "status", "requestedAt");

CREATE UNIQUE INDEX "Adjustment_ledgerEntryId_key" ON "Adjustment"("ledgerEntryId");
CREATE UNIQUE INDEX "Adjustment_tenantId_id_key" ON "Adjustment"("tenantId", "id");
CREATE UNIQUE INDEX "Adjustment_tenantId_ledgerEntryId_key" ON "Adjustment"("tenantId", "ledgerEntryId");
CREATE INDEX "Adjustment_tenantId_customerId_effectiveAt_idx" ON "Adjustment"("tenantId", "customerId", "effectiveAt");

CREATE UNIQUE INDEX "RedemptionAllocation_tenantId_id_key" ON "RedemptionAllocation"("tenantId", "id");
CREATE UNIQUE INDEX "RedemptionAllocation_tenantId_redemptionId_creditLotId_key" ON "RedemptionAllocation"("tenantId", "redemptionId", "creditLotId");
CREATE UNIQUE INDEX "RedemptionAllocation_tenantId_redemptionId_allocationOrder_key" ON "RedemptionAllocation"("tenantId", "redemptionId", "allocationOrder");
CREATE UNIQUE INDEX "RedemptionAllocation_tenantId_adjustmentId_creditLotId_key" ON "RedemptionAllocation"("tenantId", "adjustmentId", "creditLotId");
CREATE UNIQUE INDEX "RedemptionAllocation_tenantId_adjustmentId_allocationOrder_key" ON "RedemptionAllocation"("tenantId", "adjustmentId", "allocationOrder");
CREATE INDEX "RedemptionAllocation_tenantId_adjustmentId_idx" ON "RedemptionAllocation"("tenantId", "adjustmentId");
CREATE INDEX "RedemptionAllocation_tenantId_creditLotId_idx" ON "RedemptionAllocation"("tenantId", "creditLotId");
CREATE INDEX "RedemptionAllocation_tenantId_redemptionLedgerEntryId_idx" ON "RedemptionAllocation"("tenantId", "redemptionLedgerEntryId");

CREATE UNIQUE INDEX "AllocationRestoration_tenantId_id_key" ON "AllocationRestoration"("tenantId", "id");
CREATE UNIQUE INDEX "AllocationRestoration_tenantId_allocationId_reversalLedgerE_key" ON "AllocationRestoration"("tenantId", "allocationId", "reversalLedgerEntryId");
CREATE INDEX "AllocationRestoration_tenantId_reversalLedgerEntryId_idx" ON "AllocationRestoration"("tenantId", "reversalLedgerEntryId");

CREATE UNIQUE INDEX "Approval_redemptionId_key" ON "Approval"("redemptionId");
CREATE UNIQUE INDEX "Approval_tenantId_redemptionId_key" ON "Approval"("tenantId", "redemptionId");

ALTER TABLE "Redemption"
  ADD CONSTRAINT "Redemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Redemption_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Redemption_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Redemption_tenantId_cardId_fkey" FOREIGN KEY ("tenantId", "cardId") REFERENCES "Card"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Redemption_tenantId_branchId_deviceId_fkey" FOREIGN KEY ("tenantId", "branchId", "deviceId") REFERENCES "Device"("tenantId", "branchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Redemption_tenantId_receiptId_fkey" FOREIGN KEY ("tenantId", "receiptId") REFERENCES "Receipt"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Redemption_requestedByTenantId_requestedBy_fkey" FOREIGN KEY ("requestedByTenantId", "requestedBy") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Redemption_tenantId_ledgerEntryId_fkey" FOREIGN KEY ("tenantId", "ledgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Adjustment"
  ADD CONSTRAINT "Adjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Adjustment_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Adjustment_createdByTenantId_createdBy_fkey" FOREIGN KEY ("createdByTenantId", "createdBy") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Adjustment_tenantId_ledgerEntryId_fkey" FOREIGN KEY ("tenantId", "ledgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RedemptionAllocation"
  ADD CONSTRAINT "RedemptionAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RedemptionAllocation_tenantId_redemptionId_fkey" FOREIGN KEY ("tenantId", "redemptionId") REFERENCES "Redemption"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RedemptionAllocation_tenantId_adjustmentId_fkey" FOREIGN KEY ("tenantId", "adjustmentId") REFERENCES "Adjustment"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RedemptionAllocation_tenantId_redemptionLedgerEntryId_fkey" FOREIGN KEY ("tenantId", "redemptionLedgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RedemptionAllocation_tenantId_creditLotId_fkey" FOREIGN KEY ("tenantId", "creditLotId") REFERENCES "CreditLot"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AllocationRestoration"
  ADD CONSTRAINT "AllocationRestoration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AllocationRestoration_tenantId_allocationId_fkey" FOREIGN KEY ("tenantId", "allocationId") REFERENCES "RedemptionAllocation"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AllocationRestoration_tenantId_reversalLedgerEntryId_fkey" FOREIGN KEY ("tenantId", "reversalLedgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_tenantId_redemptionId_fkey" FOREIGN KEY ("tenantId", "redemptionId") REFERENCES "Redemption"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_credit_lot_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF NEW."expiresAt" IS DISTINCT FROM derive_credit_lot_expires_at(NEW."earnedAt") THEN
    RAISE EXCEPTION 'credit lot expiry must be derived from earned timestamp';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."expiresAt" IS DISTINCT FROM NEW."expiresAt" THEN
      RAISE EXCEPTION 'credit lot expiry is immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_credit_lot_balance_evidence()
RETURNS trigger AS $$
DECLARE
  allocated_amount BIGINT;
  restored_amount BIGINT;
  expected_remaining BIGINT;
BEGIN
  SELECT COALESCE(SUM(ra."amountKobo"), 0)
  INTO allocated_amount
  FROM "RedemptionAllocation" ra
  WHERE ra."tenantId" = NEW."tenantId"
    AND ra."creditLotId" = NEW."id";

  SELECT COALESCE(SUM(ar."amountKobo"), 0)
  INTO restored_amount
  FROM "AllocationRestoration" ar
  JOIN "RedemptionAllocation" ra
    ON ra."tenantId" = ar."tenantId"
   AND ra."id" = ar."allocationId"
  WHERE ra."tenantId" = NEW."tenantId"
    AND ra."creditLotId" = NEW."id";

  expected_remaining := NEW."originalAmountKobo" - allocated_amount + restored_amount;

  IF NEW."remainingAmountKobo" IS DISTINCT FROM expected_remaining THEN
    RAISE EXCEPTION 'credit lot remaining balance must match immutable allocation and restoration evidence';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "validate_credit_lot_balance_evidence_update"
AFTER UPDATE OF "remainingAmountKobo" ON "CreditLot"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_credit_lot_balance_evidence();

CREATE OR REPLACE FUNCTION prevent_redemption_allocation_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'redemption allocations are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "prevent_redemption_allocation_update"
BEFORE UPDATE ON "RedemptionAllocation"
FOR EACH ROW
EXECUTE FUNCTION prevent_redemption_allocation_mutation();

CREATE TRIGGER "prevent_redemption_allocation_delete"
BEFORE DELETE ON "RedemptionAllocation"
FOR EACH ROW
EXECUTE FUNCTION prevent_redemption_allocation_mutation();

CREATE OR REPLACE FUNCTION prevent_allocation_restoration_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'allocation restorations are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "prevent_allocation_restoration_update"
BEFORE UPDATE ON "AllocationRestoration"
FOR EACH ROW
EXECUTE FUNCTION prevent_allocation_restoration_mutation();

CREATE TRIGGER "prevent_allocation_restoration_delete"
BEFORE DELETE ON "AllocationRestoration"
FOR EACH ROW
EXECUTE FUNCTION prevent_allocation_restoration_mutation();

CREATE OR REPLACE FUNCTION validate_allocation_restoration_total()
RETURNS trigger AS $$
DECLARE
  allocation_amount BIGINT;
  restored_amount BIGINT;
BEGIN
  SELECT ra."amountKobo"
  INTO allocation_amount
  FROM "RedemptionAllocation" ra
  WHERE ra."tenantId" = NEW."tenantId"
    AND ra."id" = NEW."allocationId";

  SELECT COALESCE(SUM(ar."amountKobo"), 0)
  INTO restored_amount
  FROM "AllocationRestoration" ar
  WHERE ar."tenantId" = NEW."tenantId"
    AND ar."allocationId" = NEW."allocationId";

  IF restored_amount > allocation_amount THEN
    RAISE EXCEPTION 'allocation restoration total cannot exceed allocation amount';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "validate_allocation_restoration_total_insert"
AFTER INSERT ON "AllocationRestoration"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_allocation_restoration_total();
