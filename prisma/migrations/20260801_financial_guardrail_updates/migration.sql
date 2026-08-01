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
