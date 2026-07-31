CREATE OR REPLACE FUNCTION validate_ledger_entry_commit_state()
RETURNS trigger AS $$
DECLARE
  ledger_record RECORD;
  allocated_amount BIGINT;
  restored_amount BIGINT;
  credit_lot_count INT;
  original_entry RECORD;
BEGIN
  SELECT
    le."id",
    le."tenantId",
    le."customerId",
    le."type",
    le."direction",
    le."amountKobo",
    le."receiptId",
    le."reversesEntryId"
  INTO ledger_record
  FROM "LoyaltyLedgerEntry" le
  WHERE le."tenantId" = NEW."tenantId"
    AND le."id" = NEW."id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ledger entry not found for commit validation';
  END IF;

  IF ledger_record."type" = 'EARN' AND ledger_record."direction" = 'CREDIT' THEN
    IF ledger_record."receiptId" IS NULL THEN
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
  ELSIF ledger_record."type" = 'REDEEM' AND ledger_record."direction" = 'DEBIT' THEN
    IF ledger_record."receiptId" IS NULL THEN
      RAISE EXCEPTION 'redeem ledger entry must reference a receipt';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM "Redemption" r
      WHERE r."tenantId" = NEW."tenantId"
        AND r."ledgerEntryId" = NEW."id"
        AND r."customerId" = ledger_record."customerId"
        AND r."status" = 'CONFIRMED'
    ) THEN
      RAISE EXCEPTION 'redeem ledger entry must reference a confirmed redemption';
    END IF;

    SELECT COALESCE(SUM(ra."amountKobo"), 0)
    INTO allocated_amount
    FROM "RedemptionAllocation" ra
    WHERE ra."tenantId" = NEW."tenantId"
      AND ra."redemptionLedgerEntryId" = NEW."id";

    IF allocated_amount IS DISTINCT FROM ledger_record."amountKobo" THEN
      RAISE EXCEPTION 'redeem ledger allocation total must equal ledger amount';
    END IF;
  ELSIF ledger_record."type" = 'ADJUSTMENT' AND ledger_record."direction" = 'CREDIT' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "Adjustment" a
      WHERE a."tenantId" = NEW."tenantId"
        AND a."ledgerEntryId" = NEW."id"
        AND a."customerId" = ledger_record."customerId"
    ) THEN
      RAISE EXCEPTION 'credit adjustment ledger entry must reference an adjustment';
    END IF;

    SELECT COUNT(*)
    INTO credit_lot_count
    FROM "CreditLot" cl
    WHERE cl."tenantId" = NEW."tenantId"
      AND cl."earnLedgerEntryId" = NEW."id";

    IF credit_lot_count <> 1 THEN
      RAISE EXCEPTION 'credit adjustment ledger entry must have exactly one credit lot';
    END IF;
  ELSIF ledger_record."type" = 'ADJUSTMENT' AND ledger_record."direction" = 'DEBIT' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "Adjustment" a
      WHERE a."tenantId" = NEW."tenantId"
        AND a."ledgerEntryId" = NEW."id"
        AND a."customerId" = ledger_record."customerId"
    ) THEN
      RAISE EXCEPTION 'debit adjustment ledger entry must reference an adjustment';
    END IF;

    SELECT COALESCE(SUM(ra."amountKobo"), 0)
    INTO allocated_amount
    FROM "RedemptionAllocation" ra
    WHERE ra."tenantId" = NEW."tenantId"
      AND ra."redemptionLedgerEntryId" = NEW."id";

    IF allocated_amount IS DISTINCT FROM ledger_record."amountKobo" THEN
      RAISE EXCEPTION 'debit adjustment ledger allocation total must equal ledger amount';
    END IF;
  ELSIF ledger_record."type" = 'REVERSAL' AND ledger_record."direction" = 'CREDIT' THEN
    IF ledger_record."reversesEntryId" IS NULL THEN
      RAISE EXCEPTION 'reversal ledger entry must reference the original debit entry';
    END IF;

    SELECT *
    INTO original_entry
    FROM "LoyaltyLedgerEntry" base
    WHERE base."tenantId" = NEW."tenantId"
      AND base."id" = ledger_record."reversesEntryId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reversal ledger source entry not found';
    END IF;

    IF original_entry."direction" <> 'DEBIT' THEN
      RAISE EXCEPTION 'reversal ledger must reverse a debit entry';
    END IF;

    IF original_entry."customerId" IS DISTINCT FROM ledger_record."customerId" THEN
      RAISE EXCEPTION 'reversal ledger customer must match the original debit customer';
    END IF;

    SELECT COALESCE(SUM(ar."amountKobo"), 0)
    INTO restored_amount
    FROM "AllocationRestoration" ar
    WHERE ar."tenantId" = NEW."tenantId"
      AND ar."reversalLedgerEntryId" = NEW."id";

    IF restored_amount IS DISTINCT FROM ledger_record."amountKobo" THEN
      RAISE EXCEPTION 'reversal restorations must equal reversal ledger amount';
    END IF;
  ELSE
    RAISE EXCEPTION 'unsupported ledger type/direction combination';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
