DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Redemption"
    WHERE (
      "status" = 'PENDING_APPROVAL'
      AND (
        "ledgerEntryId" IS NOT NULL
        OR "confirmedAmountKobo" IS NOT NULL
        OR "confirmedAt" IS NOT NULL
        OR "rejectedAt" IS NOT NULL
        OR "reversedAt" IS NOT NULL
      )
    ) OR (
      "status" = 'CONFIRMED'
      AND (
        "ledgerEntryId" IS NULL
        OR "confirmedAmountKobo" IS DISTINCT FROM "requestedAmountKobo"
        OR "confirmedAt" IS NULL
        OR "rejectedAt" IS NOT NULL
      )
    ) OR (
      "status" = 'REJECTED'
      AND (
        "ledgerEntryId" IS NOT NULL
        OR "confirmedAmountKobo" IS NOT NULL
        OR "rejectedAt" IS NULL
      )
    ) OR (
      "status" = 'EXPIRED'
      AND (
        "ledgerEntryId" IS NOT NULL
        OR "confirmedAmountKobo" IS NOT NULL
      )
    ) OR (
      "status" = 'REVERSED'
      AND (
        "ledgerEntryId" IS NULL
        OR "confirmedAmountKobo" IS NULL
        OR "reversedAt" IS NULL
      )
    )
  ) THEN
    RAISE EXCEPTION 'redemption rows violate the financial state machine';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Approval"
    WHERE (
      "status" = 'PENDING'
      AND (
        "decisionByTenantId" IS NOT NULL
        OR "decisionBy" IS NOT NULL
        OR "decisionReason" IS NOT NULL
        OR "decidedAt" IS NOT NULL
        OR "executedAt" IS NOT NULL
      )
    ) OR (
      "status" = 'APPROVED'
      AND (
        "decisionByTenantId" IS NULL
        OR "decisionBy" IS NULL
        OR "decisionReason" IS NULL
        OR "decidedAt" IS NULL
        OR "executedAt" IS NOT NULL
      )
    ) OR (
      "status" = 'EXECUTED'
      AND (
        "decisionByTenantId" IS NULL
        OR "decisionBy" IS NULL
        OR "decisionReason" IS NULL
        OR "decidedAt" IS NULL
        OR "executedAt" IS NULL
      )
    ) OR (
      "status" = 'REJECTED'
      AND (
        "decisionByTenantId" IS NULL
        OR "decisionBy" IS NULL
        OR "decisionReason" IS NULL
        OR "decidedAt" IS NULL
        OR "executedAt" IS NOT NULL
      )
    ) OR (
      "status" = 'EXPIRED'
      AND (
        "decisionReason" IS NULL
        OR "decidedAt" IS NULL
        OR "executedAt" IS NOT NULL
      )
    )
  ) THEN
    RAISE EXCEPTION 'approval rows violate the financial state machine';
  END IF;
END;
$$;

ALTER TABLE "Redemption"
  ADD CONSTRAINT "Redemption_financial_state_machine_check"
  CHECK (
    (
      "status" = 'PENDING_APPROVAL'
      AND "ledgerEntryId" IS NULL
      AND "confirmedAmountKobo" IS NULL
      AND "confirmedAt" IS NULL
      AND "rejectedAt" IS NULL
      AND "reversedAt" IS NULL
    ) OR (
      "status" = 'CONFIRMED'
      AND "ledgerEntryId" IS NOT NULL
      AND "confirmedAmountKobo" = "requestedAmountKobo"
      AND "confirmedAt" IS NOT NULL
      AND "rejectedAt" IS NULL
    ) OR (
      "status" = 'REJECTED'
      AND "ledgerEntryId" IS NULL
      AND "confirmedAmountKobo" IS NULL
      AND "rejectedAt" IS NOT NULL
    ) OR (
      "status" = 'EXPIRED'
      AND "ledgerEntryId" IS NULL
      AND "confirmedAmountKobo" IS NULL
    ) OR (
      "status" = 'REVERSED'
      AND "ledgerEntryId" IS NOT NULL
      AND "confirmedAmountKobo" IS NOT NULL
      AND "reversedAt" IS NOT NULL
    )
  );

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_financial_state_machine_check"
  CHECK (
    (
      "status" = 'PENDING'
      AND "decisionByTenantId" IS NULL
      AND "decisionBy" IS NULL
      AND "decisionReason" IS NULL
      AND "decidedAt" IS NULL
      AND "executedAt" IS NULL
    ) OR (
      "status" = 'APPROVED'
      AND "decisionByTenantId" IS NOT NULL
      AND "decisionBy" IS NOT NULL
      AND "decisionReason" IS NOT NULL
      AND "decidedAt" IS NOT NULL
      AND "executedAt" IS NULL
    ) OR (
      "status" = 'EXECUTED'
      AND "decisionByTenantId" IS NOT NULL
      AND "decisionBy" IS NOT NULL
      AND "decisionReason" IS NOT NULL
      AND "decidedAt" IS NOT NULL
      AND "executedAt" IS NOT NULL
    ) OR (
      "status" = 'REJECTED'
      AND "decisionByTenantId" IS NOT NULL
      AND "decisionBy" IS NOT NULL
      AND "decisionReason" IS NOT NULL
      AND "decidedAt" IS NOT NULL
      AND "executedAt" IS NULL
    ) OR (
      "status" = 'EXPIRED'
      AND "decisionReason" IS NOT NULL
      AND "decidedAt" IS NOT NULL
      AND "executedAt" IS NULL
    )
  );

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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "validate_ledger_entry_commit_state_insert" ON "LoyaltyLedgerEntry";
CREATE CONSTRAINT TRIGGER "validate_ledger_entry_commit_state_insert"
AFTER INSERT ON "LoyaltyLedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_ledger_entry_commit_state();

CREATE OR REPLACE FUNCTION prevent_redemption_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."tenantId" IS DISTINCT FROM NEW."tenantId"
    OR OLD."branchId" IS DISTINCT FROM NEW."branchId"
    OR OLD."customerId" IS DISTINCT FROM NEW."customerId"
    OR OLD."cardId" IS DISTINCT FROM NEW."cardId"
    OR OLD."deviceId" IS DISTINCT FROM NEW."deviceId"
    OR OLD."receiptId" IS DISTINCT FROM NEW."receiptId"
    OR OLD."requestedAmountKobo" IS DISTINCT FROM NEW."requestedAmountKobo"
    OR OLD."basketAmountKobo" IS DISTINCT FROM NEW."basketAmountKobo"
    OR OLD."maximumAllowedKobo" IS DISTINCT FROM NEW."maximumAllowedKobo"
    OR OLD."policyVersion" IS DISTINCT FROM NEW."policyVersion"
    OR OLD."requestedByTenantId" IS DISTINCT FROM NEW."requestedByTenantId"
    OR OLD."requestedBy" IS DISTINCT FROM NEW."requestedBy"
    OR OLD."requestedAt" IS DISTINCT FROM NEW."requestedAt"
  THEN
    RAISE EXCEPTION 'redemption evidence fields are immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "prevent_redemption_evidence_update" ON "Redemption";
CREATE TRIGGER "prevent_redemption_evidence_update"
BEFORE UPDATE ON "Redemption"
FOR EACH ROW
EXECUTE FUNCTION prevent_redemption_evidence_mutation();
