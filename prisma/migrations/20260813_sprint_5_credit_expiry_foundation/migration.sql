ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'EXPIRY';

CREATE TABLE "CreditExpiry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "creditLotId" TEXT NOT NULL,
  "ledgerEntryId" TEXT NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "expiredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditExpiry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreditExpiry_amountKobo_positive_check" CHECK ("amountKobo" > 0)
);

ALTER TABLE "CreditExpiry"
  ADD CONSTRAINT "CreditExpiry_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditExpiry_tenantId_customerId_fkey"
    FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditExpiry_tenantId_creditLotId_fkey"
    FOREIGN KEY ("tenantId", "creditLotId") REFERENCES "CreditLot"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditExpiry_tenantId_ledgerEntryId_fkey"
    FOREIGN KEY ("tenantId", "ledgerEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CreditExpiry_ledgerEntryId_key" ON "CreditExpiry"("ledgerEntryId");
CREATE UNIQUE INDEX "CreditExpiry_tenantId_id_key" ON "CreditExpiry"("tenantId", "id");
CREATE UNIQUE INDEX "CreditExpiry_tenantId_creditLotId_key" ON "CreditExpiry"("tenantId", "creditLotId");
CREATE UNIQUE INDEX "CreditExpiry_tenantId_ledgerEntryId_key" ON "CreditExpiry"("tenantId", "ledgerEntryId");
CREATE INDEX "CreditExpiry_tenantId_expiredAt_idx" ON "CreditExpiry"("tenantId", "expiredAt");
CREATE INDEX "CreditExpiry_tenantId_customerId_expiredAt_idx" ON "CreditExpiry"("tenantId", "customerId", "expiredAt");

CREATE OR REPLACE FUNCTION validate_credit_lot_balance_evidence_for_lot(
  p_tenant_id TEXT,
  p_credit_lot_id TEXT
)
RETURNS void AS $$
DECLARE
  lot_record RECORD;
  allocated_amount BIGINT;
  restored_amount BIGINT;
  expired_amount BIGINT;
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

  SELECT COALESCE(SUM(ce."amountKobo"), 0)
  INTO expired_amount
  FROM "CreditExpiry" ce
  WHERE ce."tenantId" = p_tenant_id
    AND ce."creditLotId" = p_credit_lot_id;

  expected_remaining := lot_record."originalAmountKobo"
    - allocated_amount
    + restored_amount
    - expired_amount;

  IF lot_record."remainingAmountKobo" IS DISTINCT FROM expected_remaining THEN
    RAISE EXCEPTION 'credit lot remaining balance must match allocation, restoration, and expiry evidence';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_credit_lot_balance_evidence()
RETURNS trigger AS $$
BEGIN
  PERFORM validate_credit_lot_balance_evidence_for_lot(
    NEW."tenantId",
    NEW."id"
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_credit_expiry_commit_state()
RETURNS trigger AS $$
DECLARE
  expiry_record RECORD;
BEGIN
  SELECT
    ce."tenantId",
    ce."customerId",
    ce."creditLotId",
    ce."ledgerEntryId",
    ce."amountKobo",
    ce."expiredAt",
    cl."customerId" AS "lotCustomerId",
    cl."expiresAt" AS "lotExpiresAt",
    le."customerId" AS "ledgerCustomerId",
    le."type"::text AS "ledgerType",
    le."direction"::text AS "ledgerDirection",
    le."amountKobo" AS "ledgerAmountKobo",
    le."receiptId" AS "ledgerReceiptId",
    le."effectiveAt" AS "ledgerEffectiveAt"
  INTO expiry_record
  FROM "CreditExpiry" ce
  JOIN "CreditLot" cl
    ON cl."tenantId" = ce."tenantId"
   AND cl."id" = ce."creditLotId"
  JOIN "LoyaltyLedgerEntry" le
    ON le."tenantId" = ce."tenantId"
   AND le."id" = ce."ledgerEntryId"
  WHERE ce."tenantId" = NEW."tenantId"
    AND ce."id" = NEW."id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit expiry evidence not found for commit validation';
  END IF;

  IF expiry_record."lotCustomerId" IS DISTINCT FROM expiry_record."customerId"
    OR expiry_record."ledgerCustomerId" IS DISTINCT FROM expiry_record."customerId"
  THEN
    RAISE EXCEPTION 'credit expiry customer must match credit lot and ledger entry';
  END IF;

  IF expiry_record."ledgerType" <> 'EXPIRY' OR expiry_record."ledgerDirection" <> 'DEBIT' THEN
    RAISE EXCEPTION 'credit expiry ledger entry must be EXPIRY DEBIT';
  END IF;

  IF expiry_record."ledgerReceiptId" IS NOT NULL THEN
    RAISE EXCEPTION 'expiry ledger entry must not reference a receipt';
  END IF;

  IF expiry_record."ledgerAmountKobo" IS DISTINCT FROM expiry_record."amountKobo" THEN
    RAISE EXCEPTION 'credit expiry amount must equal its ledger amount';
  END IF;

  IF expiry_record."lotExpiresAt" IS DISTINCT FROM expiry_record."expiredAt"
    OR expiry_record."ledgerEffectiveAt" IS DISTINCT FROM expiry_record."expiredAt"
  THEN
    RAISE EXCEPTION 'credit expiry timestamps must match the lot expiry instant';
  END IF;

  PERFORM validate_credit_lot_balance_evidence_for_lot(
    NEW."tenantId",
    NEW."creditLotId"
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

  expiry_customer_id TEXT;
  expiry_amount_kobo BIGINT;
  expiry_expired_at TIMESTAMP WITH TIME ZONE;
  expiry_ledger_effective_at TIMESTAMP WITH TIME ZONE;
  expiry_receipt_id TEXT;

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
  ELSIF ledger_type = 'EXPIRY' AND ledger_direction = 'DEBIT' THEN
    IF ledger_receipt_id IS NOT NULL THEN
      RAISE EXCEPTION 'expiry ledger entry must not reference a receipt';
    END IF;

    SELECT ce."customerId", ce."amountKobo", ce."expiredAt", le."effectiveAt", le."receiptId"
    INTO expiry_customer_id, expiry_amount_kobo, expiry_expired_at, expiry_ledger_effective_at, expiry_receipt_id
    FROM "CreditExpiry" ce
    JOIN "LoyaltyLedgerEntry" le
      ON le."tenantId" = ce."tenantId"
     AND le."id" = ce."ledgerEntryId"
    WHERE ce."tenantId" = NEW."tenantId"
      AND ce."ledgerEntryId" = NEW."id";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'expiry ledger entry must reference exactly one credit expiry row';
    END IF;

    IF expiry_customer_id IS DISTINCT FROM ledger_customer_id
      OR expiry_amount_kobo IS DISTINCT FROM ledger_amount_kobo
      OR expiry_expired_at IS DISTINCT FROM NEW."effectiveAt"
      OR expiry_ledger_effective_at IS DISTINCT FROM NEW."effectiveAt"
      OR expiry_receipt_id IS NOT NULL
    THEN
      RAISE EXCEPTION 'credit expiry evidence must match its ledger entry';
    END IF;
  ELSE
    RAISE EXCEPTION 'unsupported ledger type/direction combination';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_credit_expiry_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'credit expiry evidence is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "validate_credit_expiry_commit_state_insert" ON "CreditExpiry";
CREATE CONSTRAINT TRIGGER "validate_credit_expiry_commit_state_insert"
AFTER INSERT ON "CreditExpiry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_credit_expiry_commit_state();

DROP TRIGGER IF EXISTS "prevent_credit_expiry_update" ON "CreditExpiry";
CREATE TRIGGER "prevent_credit_expiry_update"
BEFORE UPDATE ON "CreditExpiry"
FOR EACH ROW
EXECUTE FUNCTION prevent_credit_expiry_mutation();

DROP TRIGGER IF EXISTS "prevent_credit_expiry_delete" ON "CreditExpiry";
CREATE TRIGGER "prevent_credit_expiry_delete"
BEFORE DELETE ON "CreditExpiry"
FOR EACH ROW
EXECUTE FUNCTION prevent_credit_expiry_mutation();

DROP TRIGGER IF EXISTS "validate_ledger_entry_commit_state_insert" ON "LoyaltyLedgerEntry";
CREATE CONSTRAINT TRIGGER "validate_ledger_entry_commit_state_insert"
AFTER INSERT ON "LoyaltyLedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_ledger_entry_commit_state();
