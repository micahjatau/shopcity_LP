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

CREATE OR REPLACE FUNCTION prevent_credit_lot_source_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."tenantId" IS DISTINCT FROM NEW."tenantId"
    OR OLD."customerId" IS DISTINCT FROM NEW."customerId"
    OR OLD."earnLedgerEntryId" IS DISTINCT FROM NEW."earnLedgerEntryId"
    OR OLD."originalAmountKobo" IS DISTINCT FROM NEW."originalAmountKobo"
    OR OLD."earnedAt" IS DISTINCT FROM NEW."earnedAt"
  THEN
    RAISE EXCEPTION 'credit lot source fields are immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_adjustment_orphan_mutation()
RETURNS trigger AS $$
BEGIN
  IF NEW."ledgerEntryId" IS NULL THEN
    RAISE EXCEPTION 'adjustment must reference a ledger entry';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_adjustment_ledger_source()
RETURNS trigger AS $$
DECLARE
  ledger_row "LoyaltyLedgerEntry"%ROWTYPE;
BEGIN
  IF NEW."ledgerEntryId" IS NULL THEN
    RAISE EXCEPTION 'adjustment must reference a ledger entry';
  END IF;

  SELECT * INTO ledger_row
  FROM "LoyaltyLedgerEntry"
  WHERE "tenantId" = NEW."tenantId"
    AND "id" = NEW."ledgerEntryId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'adjustment must reference an existing adjustment ledger entry';
  END IF;

  IF ledger_row."type" <> 'ADJUSTMENT'
    OR ledger_row."tenantId" IS DISTINCT FROM NEW."tenantId"
    OR ledger_row."customerId" IS DISTINCT FROM NEW."customerId"
    OR ledger_row."direction"::text IS DISTINCT FROM NEW."kind"::text
    OR ledger_row."amountKobo" IS DISTINCT FROM NEW."amountKobo"
    OR ledger_row."effectiveAt" IS DISTINCT FROM NEW."effectiveAt"
  THEN
    RAISE EXCEPTION 'adjustment must match its adjustment ledger entry';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Adjustment" a
    LEFT JOIN "LoyaltyLedgerEntry" le
      ON le."tenantId" = a."tenantId"
     AND le."id" = a."ledgerEntryId"
    WHERE a."ledgerEntryId" IS NULL
       OR le."id" IS NULL
       OR le."type" <> 'ADJUSTMENT'
       OR a."customerId" IS DISTINCT FROM le."customerId"
       OR a."kind"::text IS DISTINCT FROM le."direction"::text
       OR a."amountKobo" IS DISTINCT FROM le."amountKobo"
       OR a."effectiveAt" IS DISTINCT FROM le."effectiveAt"
  ) THEN
    RAISE EXCEPTION 'historical adjustment evidence mismatch found';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS "prevent_adjustment_orphan_insert_update" ON "Adjustment";
CREATE TRIGGER "prevent_adjustment_orphan_insert_update"
BEFORE INSERT OR UPDATE ON "Adjustment"
FOR EACH ROW
EXECUTE FUNCTION prevent_adjustment_orphan_mutation();

DROP TRIGGER IF EXISTS "validate_adjustment_ledger_source_insert_update" ON "Adjustment";
CREATE TRIGGER "validate_adjustment_ledger_source_insert_update"
BEFORE INSERT OR UPDATE ON "Adjustment"
FOR EACH ROW
EXECUTE FUNCTION validate_adjustment_ledger_source();
