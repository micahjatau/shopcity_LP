CREATE OR REPLACE FUNCTION validate_debit_allocation_invariants_for_ledger(
  p_tenant_id TEXT,
  p_ledger_entry_id TEXT
)
RETURNS void AS $$
DECLARE
  ledger_record RECORD;
  allocated_amount BIGINT;
BEGIN
  SELECT "id", "tenantId", "customerId", "type", "direction", "amountKobo"
  INTO ledger_record
  FROM "LoyaltyLedgerEntry"
  WHERE "tenantId" = p_tenant_id
    AND "id" = p_ledger_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'debit allocation ledger entry not found';
  END IF;

  IF ledger_record."direction" <> 'DEBIT' THEN
    RAISE EXCEPTION 'debit allocation ledger entry must have DEBIT direction';
  END IF;

  IF ledger_record."type" NOT IN ('REDEEM', 'ADJUSTMENT') THEN
    RAISE EXCEPTION 'debit allocation ledger entry must be REDEEM or ADJUSTMENT';
  END IF;

  SELECT COALESCE(SUM(ra."amountKobo"), 0)
  INTO allocated_amount
  FROM "RedemptionAllocation" ra
  WHERE ra."tenantId" = p_tenant_id
    AND ra."redemptionLedgerEntryId" = p_ledger_entry_id;

  IF allocated_amount IS DISTINCT FROM ledger_record."amountKobo" THEN
    RAISE EXCEPTION 'debit allocation total must equal ledger amount';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "RedemptionAllocation" ra
    JOIN "CreditLot" cl
      ON cl."tenantId" = ra."tenantId"
     AND cl."id" = ra."creditLotId"
    WHERE ra."tenantId" = p_tenant_id
      AND ra."redemptionLedgerEntryId" = p_ledger_entry_id
      AND cl."customerId" <> ledger_record."customerId"
  ) THEN
    RAISE EXCEPTION 'allocation credit lot customer must match debit ledger customer';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "RedemptionAllocation" ra
    JOIN "Redemption" r
      ON r."tenantId" = ra."tenantId"
     AND r."id" = ra."redemptionId"
    WHERE ra."tenantId" = p_tenant_id
      AND ra."redemptionLedgerEntryId" = p_ledger_entry_id
      AND ra."redemptionId" IS NOT NULL
      AND (
        r."ledgerEntryId" IS DISTINCT FROM ra."redemptionLedgerEntryId"
        OR r."customerId" <> ledger_record."customerId"
      )
  ) THEN
    RAISE EXCEPTION 'redemption allocation must match redemption ledger and customer';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "RedemptionAllocation" ra
    JOIN "Adjustment" a
      ON a."tenantId" = ra."tenantId"
     AND a."id" = ra."adjustmentId"
    WHERE ra."tenantId" = p_tenant_id
      AND ra."redemptionLedgerEntryId" = p_ledger_entry_id
      AND ra."adjustmentId" IS NOT NULL
      AND (
        a."ledgerEntryId" IS DISTINCT FROM ra."redemptionLedgerEntryId"
        OR a."customerId" <> ledger_record."customerId"
      )
  ) THEN
    RAISE EXCEPTION 'adjustment allocation must match adjustment ledger and customer';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_credit_lot_balance_evidence_for_lot(
  p_tenant_id TEXT,
  p_credit_lot_id TEXT
)
RETURNS void AS $$
DECLARE
  lot_record RECORD;
  allocated_amount BIGINT;
  restored_amount BIGINT;
  expected_remaining BIGINT;
BEGIN
  SELECT "originalAmountKobo", "remainingAmountKobo"
  INTO lot_record
  FROM "CreditLot"
  WHERE "tenantId" = p_tenant_id
    AND "id" = p_credit_lot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit lot not found for allocation evidence';
  END IF;

  SELECT COALESCE(SUM(ra."amountKobo"), 0)
  INTO allocated_amount
  FROM "RedemptionAllocation" ra
  WHERE ra."tenantId" = p_tenant_id
    AND ra."creditLotId" = p_credit_lot_id;

  SELECT COALESCE(SUM(ar."amountKobo"), 0)
  INTO restored_amount
  FROM "AllocationRestoration" ar
  JOIN "RedemptionAllocation" ra
    ON ra."tenantId" = ar."tenantId"
   AND ra."id" = ar."allocationId"
  WHERE ra."tenantId" = p_tenant_id
    AND ra."creditLotId" = p_credit_lot_id;

  expected_remaining := lot_record."originalAmountKobo" - allocated_amount + restored_amount;

  IF lot_record."remainingAmountKobo" IS DISTINCT FROM expected_remaining THEN
    RAISE EXCEPTION 'credit lot remaining balance must match allocation and restoration evidence';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_redemption_allocation_commit_state()
RETURNS trigger AS $$
BEGIN
  PERFORM validate_debit_allocation_invariants_for_ledger(
    NEW."tenantId",
    NEW."redemptionLedgerEntryId"
  );

  PERFORM validate_credit_lot_balance_evidence_for_lot(
    NEW."tenantId",
    NEW."creditLotId"
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "validate_redemption_allocation_commit_state_insert" ON "RedemptionAllocation";
CREATE CONSTRAINT TRIGGER "validate_redemption_allocation_commit_state_insert"
AFTER INSERT ON "RedemptionAllocation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_redemption_allocation_commit_state();

CREATE OR REPLACE FUNCTION validate_allocation_restoration_commit_state()
RETURNS trigger AS $$
DECLARE
  allocation_record RECORD;
  reversal_ledger RECORD;
BEGIN
  SELECT ra."tenantId", ra."creditLotId", ra."redemptionLedgerEntryId"
  INTO allocation_record
  FROM "RedemptionAllocation" ra
  WHERE ra."tenantId" = NEW."tenantId"
    AND ra."id" = NEW."allocationId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'allocation restoration target not found';
  END IF;

  SELECT "type", "direction", "customerId"
  INTO reversal_ledger
  FROM "LoyaltyLedgerEntry"
  WHERE "tenantId" = NEW."tenantId"
    AND "id" = NEW."reversalLedgerEntryId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'allocation restoration reversal ledger not found';
  END IF;

  IF reversal_ledger."type" <> 'REVERSAL' OR reversal_ledger."direction" <> 'CREDIT' THEN
    RAISE EXCEPTION 'allocation restoration ledger must be REVERSAL CREDIT';
  END IF;

  PERFORM validate_credit_lot_balance_evidence_for_lot(
    NEW."tenantId",
    allocation_record."creditLotId"
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "validate_allocation_restoration_commit_state_insert" ON "AllocationRestoration";
CREATE CONSTRAINT TRIGGER "validate_allocation_restoration_commit_state_insert"
AFTER INSERT ON "AllocationRestoration"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_allocation_restoration_commit_state();
