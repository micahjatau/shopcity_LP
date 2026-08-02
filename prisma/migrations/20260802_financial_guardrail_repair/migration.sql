CREATE OR REPLACE FUNCTION validate_credit_lot_source()
RETURNS trigger AS $$
DECLARE
  ledger_row "LoyaltyLedgerEntry"%ROWTYPE;
BEGIN
  SELECT * INTO ledger_row
  FROM "LoyaltyLedgerEntry"
  WHERE "tenantId" = NEW."tenantId"
    AND "id" = NEW."earnLedgerEntryId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit lot must reference an existing credit ledger entry';
  END IF;

  IF ledger_row."customerId" IS DISTINCT FROM NEW."customerId"
    OR ledger_row."amountKobo" IS DISTINCT FROM NEW."originalAmountKobo"
    OR ledger_row."effectiveAt" IS DISTINCT FROM NEW."earnedAt"
    OR ledger_row."direction" <> 'CREDIT'
    OR ledger_row."type" NOT IN ('EARN', 'ADJUSTMENT')
  THEN
    RAISE EXCEPTION 'credit lot must match its credit ledger entry';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

  SELECT "type", "direction", "customerId", "reversesEntryId"
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

  IF reversal_ledger."reversesEntryId" IS DISTINCT FROM allocation_record."redemptionLedgerEntryId" THEN
    RAISE EXCEPTION 'allocation restoration must reference the original debit entry';
  END IF;

  PERFORM validate_credit_lot_balance_evidence_for_lot(
    NEW."tenantId",
    allocation_record."creditLotId"
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_ledger_entry_commit_state()
RETURNS trigger AS $$
DECLARE
  ledger_tenant_id TEXT;
  ledger_customer_id TEXT;
  ledger_type TEXT;
  ledger_direction TEXT;
  ledger_amount_kobo BIGINT;
  ledger_receipt_id TEXT;
  ledger_reverses_entry_id TEXT;

  adjustment_tenant_id TEXT;
  adjustment_customer_id TEXT;
  adjustment_kind TEXT;
  adjustment_amount_kobo BIGINT;
  adjustment_ledger_entry_id TEXT;
  adjustment_effective_at TIMESTAMP WITH TIME ZONE;

  original_direction TEXT;
  original_customer_id TEXT;
  allocated_amount BIGINT;
  restored_amount BIGINT;
  credit_lot_count INT;
BEGIN
  SELECT
    le."tenantId",
    le."customerId",
    le."type"::text,
    le."direction"::text,
    le."amountKobo",
    le."receiptId",
    le."reversesEntryId"
  INTO
    ledger_tenant_id,
    ledger_customer_id,
    ledger_type,
    ledger_direction,
    ledger_amount_kobo,
    ledger_receipt_id,
    ledger_reverses_entry_id
  FROM "LoyaltyLedgerEntry" le
  WHERE le."tenantId" = NEW."tenantId"
    AND le."id" = NEW."id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ledger entry not found for commit validation';
  END IF;

  IF ledger_type = 'EARN' AND ledger_direction = 'CREDIT' THEN
    IF ledger_receipt_id IS NULL THEN
      RAISE EXCEPTION 'earn ledger entry must reference a receipt';
    END IF;

    SELECT COUNT(*)
    INTO credit_lot_count
    FROM "CreditLot" cl
    WHERE cl."tenantId" = NEW."tenantId"
      AND cl."earnLedgerEntryId" = NEW."id";

    IF credit_lot_count <> 1 THEN
      RAISE EXCEPTION 'earn ledger entry must have exactly one credit lot';
    END IF;
  ELSIF ledger_type = 'REDEEM' AND ledger_direction = 'DEBIT' THEN
    IF ledger_receipt_id IS NULL THEN
      RAISE EXCEPTION 'redeem ledger entry must reference a receipt';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM "Redemption" r
      WHERE r."tenantId" = NEW."tenantId"
        AND r."ledgerEntryId" = NEW."id"
        AND r."customerId" = ledger_customer_id
        AND r."status" = 'CONFIRMED'
    ) THEN
      RAISE EXCEPTION 'redeem ledger entry must reference a confirmed redemption';
    END IF;

    SELECT COALESCE(SUM(ra."amountKobo"), 0)
    INTO allocated_amount
    FROM "RedemptionAllocation" ra
    WHERE ra."tenantId" = NEW."tenantId"
      AND ra."redemptionLedgerEntryId" = NEW."id";

    IF allocated_amount IS DISTINCT FROM ledger_amount_kobo THEN
      RAISE EXCEPTION 'redeem ledger allocation total must equal ledger amount';
    END IF;
  ELSIF ledger_type = 'ADJUSTMENT' AND ledger_direction = 'CREDIT' THEN
    SELECT
      a."tenantId",
      a."customerId",
      a."kind"::text,
      a."amountKobo",
      a."ledgerEntryId",
      a."effectiveAt"
    INTO
      adjustment_tenant_id,
      adjustment_customer_id,
      adjustment_kind,
      adjustment_amount_kobo,
      adjustment_ledger_entry_id,
      adjustment_effective_at
    FROM "Adjustment" a
    WHERE a."tenantId" = NEW."tenantId"
      AND a."ledgerEntryId" = NEW."id";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'credit adjustment ledger entry must reference an adjustment';
    END IF;

    IF adjustment_tenant_id IS DISTINCT FROM ledger_tenant_id
      OR adjustment_customer_id IS DISTINCT FROM ledger_customer_id
      OR adjustment_kind IS DISTINCT FROM ledger_direction
      OR adjustment_amount_kobo IS DISTINCT FROM ledger_amount_kobo
      OR adjustment_effective_at IS DISTINCT FROM NEW."effectiveAt"
      OR adjustment_ledger_entry_id IS DISTINCT FROM NEW."id"
    THEN
      RAISE EXCEPTION 'adjustment evidence must match its ledger entry';
    END IF;

    SELECT COUNT(*)
    INTO credit_lot_count
    FROM "CreditLot" cl
    WHERE cl."tenantId" = NEW."tenantId"
      AND cl."earnLedgerEntryId" = NEW."id";

    IF credit_lot_count <> 1 THEN
      RAISE EXCEPTION 'credit adjustment ledger entry must have exactly one credit lot';
    END IF;
  ELSIF ledger_type = 'ADJUSTMENT' AND ledger_direction = 'DEBIT' THEN
    SELECT
      a."tenantId",
      a."customerId",
      a."kind"::text,
      a."amountKobo",
      a."ledgerEntryId",
      a."effectiveAt"
    INTO
      adjustment_tenant_id,
      adjustment_customer_id,
      adjustment_kind,
      adjustment_amount_kobo,
      adjustment_ledger_entry_id,
      adjustment_effective_at
    FROM "Adjustment" a
    WHERE a."tenantId" = NEW."tenantId"
      AND a."ledgerEntryId" = NEW."id";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'debit adjustment ledger entry must reference an adjustment';
    END IF;

    IF adjustment_tenant_id IS DISTINCT FROM ledger_tenant_id
      OR adjustment_customer_id IS DISTINCT FROM ledger_customer_id
      OR adjustment_kind IS DISTINCT FROM ledger_direction
      OR adjustment_amount_kobo IS DISTINCT FROM ledger_amount_kobo
      OR adjustment_effective_at IS DISTINCT FROM NEW."effectiveAt"
      OR adjustment_ledger_entry_id IS DISTINCT FROM NEW."id"
    THEN
      RAISE EXCEPTION 'adjustment evidence must match its ledger entry';
    END IF;

    SELECT COALESCE(SUM(ra."amountKobo"), 0)
    INTO allocated_amount
    FROM "RedemptionAllocation" ra
    WHERE ra."tenantId" = NEW."tenantId"
      AND ra."redemptionLedgerEntryId" = NEW."id";

    IF allocated_amount IS DISTINCT FROM ledger_amount_kobo THEN
      RAISE EXCEPTION 'debit adjustment ledger allocation total must equal ledger amount';
    END IF;
  ELSIF ledger_type = 'REVERSAL' AND ledger_direction = 'CREDIT' THEN
    IF ledger_reverses_entry_id IS NULL THEN
      RAISE EXCEPTION 'reversal ledger entry must reference the original debit entry';
    END IF;

    SELECT base."direction"::text, base."customerId"
    INTO original_direction, original_customer_id
    FROM "LoyaltyLedgerEntry" base
    WHERE base."tenantId" = NEW."tenantId"
      AND base."id" = ledger_reverses_entry_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reversal ledger source entry not found';
    END IF;

    IF original_direction <> 'DEBIT' THEN
      RAISE EXCEPTION 'reversal ledger must reverse a debit entry';
    END IF;

    IF original_customer_id IS DISTINCT FROM ledger_customer_id THEN
      RAISE EXCEPTION 'reversal ledger customer must match the original debit customer';
    END IF;

    SELECT COALESCE(SUM(ar."amountKobo"), 0)
    INTO restored_amount
    FROM "AllocationRestoration" ar
    WHERE ar."tenantId" = NEW."tenantId"
      AND ar."reversalLedgerEntryId" = NEW."id";

    IF restored_amount IS DISTINCT FROM ledger_amount_kobo THEN
      RAISE EXCEPTION 'reversal restorations must equal reversal ledger amount';
    END IF;
  ELSE
    RAISE EXCEPTION 'unsupported ledger type/direction combination';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_adjustment_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."tenantId" IS DISTINCT FROM NEW."tenantId"
    OR OLD."customerId" IS DISTINCT FROM NEW."customerId"
    OR OLD."kind" IS DISTINCT FROM NEW."kind"
    OR OLD."amountKobo" IS DISTINCT FROM NEW."amountKobo"
    OR OLD."reason" IS DISTINCT FROM NEW."reason"
    OR OLD."createdByTenantId" IS DISTINCT FROM NEW."createdByTenantId"
    OR OLD."createdBy" IS DISTINCT FROM NEW."createdBy"
    OR OLD."ledgerEntryId" IS DISTINCT FROM NEW."ledgerEntryId"
    OR OLD."effectiveAt" IS DISTINCT FROM NEW."effectiveAt"
    OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt"
  THEN
    RAISE EXCEPTION 'adjustment evidence fields are immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "validate_credit_lot_source_insert" ON "CreditLot";
CREATE TRIGGER "validate_credit_lot_source_insert"
BEFORE INSERT ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION validate_credit_lot_source();

DROP TRIGGER IF EXISTS "validate_credit_lot_source_update" ON "CreditLot";
CREATE TRIGGER "validate_credit_lot_source_update"
BEFORE UPDATE ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION validate_credit_lot_source();

DROP TRIGGER IF EXISTS "prevent_credit_lot_source_update" ON "CreditLot";
CREATE TRIGGER "prevent_credit_lot_source_update"
BEFORE UPDATE ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION prevent_credit_lot_source_mutation();

DROP TRIGGER IF EXISTS "validate_allocation_restoration_commit_state_insert" ON "AllocationRestoration";
CREATE CONSTRAINT TRIGGER "validate_allocation_restoration_commit_state_insert"
AFTER INSERT ON "AllocationRestoration"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_allocation_restoration_commit_state();

DROP TRIGGER IF EXISTS "validate_ledger_entry_commit_state_insert" ON "LoyaltyLedgerEntry";
CREATE CONSTRAINT TRIGGER "validate_ledger_entry_commit_state_insert"
AFTER INSERT ON "LoyaltyLedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_ledger_entry_commit_state();

DROP TRIGGER IF EXISTS "prevent_adjustment_evidence_update" ON "Adjustment";
CREATE TRIGGER "prevent_adjustment_evidence_update"
BEFORE UPDATE ON "Adjustment"
FOR EACH ROW
EXECUTE FUNCTION prevent_adjustment_evidence_mutation();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RedemptionAllocation_target_xor_check'
      AND conrelid = '"RedemptionAllocation"'::regclass
  ) THEN
    ALTER TABLE "RedemptionAllocation"
      ADD CONSTRAINT "RedemptionAllocation_target_xor_check"
      CHECK (("redemptionId" IS NOT NULL)::int + ("adjustmentId" IS NOT NULL)::int = 1);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Adjustment_tenantId_ledgerEntryId_key"
  ON "Adjustment"("tenantId", "ledgerEntryId");

CREATE INDEX IF NOT EXISTS "Adjustment_tenantId_customerId_effectiveAt_idx"
  ON "Adjustment"("tenantId", "customerId", "effectiveAt");

CREATE INDEX IF NOT EXISTS "RedemptionAllocation_tenantId_adjustmentId_idx"
  ON "RedemptionAllocation"("tenantId", "adjustmentId");
