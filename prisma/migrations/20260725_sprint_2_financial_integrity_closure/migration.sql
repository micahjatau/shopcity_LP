DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Receipt"
    WHERE "purchaseAmountKobo" <= 0
  ) THEN
    RAISE EXCEPTION 'Receipt purchase amounts must be positive before applying financial integrity closure';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CreditLot" cl
    JOIN "LoyaltyLedgerEntry" le
      ON le."tenantId" = cl."tenantId"
     AND le."id" = cl."earnLedgerEntryId"
    WHERE cl."tenantId" <> le."tenantId"
       OR cl."customerId" <> le."customerId"
       OR cl."originalAmountKobo" <> le."amountKobo"
       OR cl."earnedAt" <> le."effectiveAt"
       OR le."type" <> 'EARN'
       OR le."direction" <> 'CREDIT'
  ) THEN
    RAISE EXCEPTION 'Credit lots must match their earn ledger entries before applying financial integrity closure';
  END IF;
END;
$$;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_purchaseAmountKobo_positive_check"
  CHECK ("purchaseAmountKobo" > 0);

CREATE OR REPLACE FUNCTION prevent_receipt_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."tenantId" IS DISTINCT FROM NEW."tenantId"
    OR OLD."branchId" IS DISTINCT FROM NEW."branchId"
    OR OLD."customerId" IS DISTINCT FROM NEW."customerId"
    OR OLD."cardId" IS DISTINCT FROM NEW."cardId"
    OR OLD."deviceId" IS DISTINCT FROM NEW."deviceId"
    OR OLD."posReceiptNumber" IS DISTINCT FROM NEW."posReceiptNumber"
    OR OLD."normalizedPosReceiptNumber" IS DISTINCT FROM NEW."normalizedPosReceiptNumber"
    OR OLD."receiptWeekStart" IS DISTINCT FROM NEW."receiptWeekStart"
    OR OLD."purchaseAmountKobo" IS DISTINCT FROM NEW."purchaseAmountKobo"
    OR OLD."occurredAt" IS DISTINCT FROM NEW."occurredAt"
    OR OLD."capturedByTenantId" IS DISTINCT FROM NEW."capturedByTenantId"
    OR OLD."capturedBy" IS DISTINCT FROM NEW."capturedBy"
    OR OLD."capturedAt" IS DISTINCT FROM NEW."capturedAt"
  THEN
    RAISE EXCEPTION 'receipt purchase evidence is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "prevent_receipt_evidence_update"
BEFORE UPDATE ON "Receipt"
FOR EACH ROW
EXECUTE FUNCTION prevent_receipt_evidence_mutation();

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
    RAISE EXCEPTION 'credit lot must reference an existing earn ledger entry';
  END IF;

  IF ledger_row."customerId" IS DISTINCT FROM NEW."customerId"
    OR ledger_row."amountKobo" IS DISTINCT FROM NEW."originalAmountKobo"
    OR ledger_row."effectiveAt" IS DISTINCT FROM NEW."earnedAt"
    OR ledger_row."type" <> 'EARN'
    OR ledger_row."direction" <> 'CREDIT'
  THEN
    RAISE EXCEPTION 'credit lot must match its earn ledger entry';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "validate_credit_lot_source_insert"
BEFORE INSERT ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION validate_credit_lot_source();

CREATE TRIGGER "validate_credit_lot_source_update"
BEFORE UPDATE ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION validate_credit_lot_source();

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

CREATE TRIGGER "prevent_credit_lot_source_update"
BEFORE UPDATE ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION prevent_credit_lot_source_mutation();
