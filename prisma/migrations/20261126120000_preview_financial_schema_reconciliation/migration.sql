-- Reconcile financial schema safeguards missing from Preview. No financial rows are rewritten.
-- Source: reviewed definitions from the full Prisma migration chain on PostgreSQL 17.6.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';
SET LOCAL search_path = public;

-- Preflight existing financial links and balances; fail closed on historical inconsistency.
DO $financial_preflight$
BEGIN
  IF EXISTS (
    WITH allocated AS (SELECT "tenantId", "creditLotId", SUM("amountKobo") AS amount FROM public."RedemptionAllocation" GROUP BY 1, 2),
         restored AS (SELECT ra."tenantId", ra."creditLotId", SUM(ar."amountKobo") AS amount FROM public."AllocationRestoration" ar JOIN public."RedemptionAllocation" ra ON ra."tenantId" = ar."tenantId" AND ra."id" = ar."allocationId" GROUP BY 1, 2),
         expired AS (SELECT "tenantId", "creditLotId", SUM("amountKobo") AS amount FROM public."CreditExpiry" GROUP BY 1, 2)
    SELECT 1 FROM public."CreditLot" cl
    LEFT JOIN allocated a ON a."tenantId" = cl."tenantId" AND a."creditLotId" = cl."id"
    LEFT JOIN restored r ON r."tenantId" = cl."tenantId" AND r."creditLotId" = cl."id"
    LEFT JOIN expired e ON e."tenantId" = cl."tenantId" AND e."creditLotId" = cl."id"
    WHERE cl."remainingAmountKobo" IS DISTINCT FROM cl."originalAmountKobo" - COALESCE(a.amount, 0) + COALESCE(r.amount, 0) - COALESCE(e.amount, 0)
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: credit lot balance evidence mismatch'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."CreditLot" cl LEFT JOIN public."LoyaltyLedgerEntry" le ON le."tenantId" = cl."tenantId" AND le."id" = cl."earnLedgerEntryId"
    WHERE le."id" IS NULL OR le."customerId" IS DISTINCT FROM cl."customerId" OR le."amountKobo" IS DISTINCT FROM cl."originalAmountKobo" OR le."effectiveAt" IS DISTINCT FROM cl."earnedAt" OR le."direction" <> 'CREDIT' OR le."type" NOT IN ('EARN', 'ADJUSTMENT')
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: credit lot source mismatch'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."CreditExpiry" ce
    LEFT JOIN public."CreditLot" cl ON cl."tenantId" = ce."tenantId" AND cl."id" = ce."creditLotId"
    LEFT JOIN public."LoyaltyLedgerEntry" le ON le."tenantId" = ce."tenantId" AND le."id" = ce."ledgerEntryId"
    WHERE cl."id" IS NULL OR le."id" IS NULL OR cl."customerId" IS DISTINCT FROM ce."customerId" OR le."customerId" IS DISTINCT FROM ce."customerId" OR le."type" <> 'EXPIRY' OR le."direction" <> 'DEBIT' OR le."amountKobo" IS DISTINCT FROM ce."amountKobo" OR le."receiptId" IS NOT NULL OR cl."expiresAt" IS DISTINCT FROM ce."expiredAt" OR le."effectiveAt" IS DISTINCT FROM ce."expiredAt"
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: credit expiry evidence mismatch'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."LoyaltyLedgerEntry" le LEFT JOIN public."CreditExpiry" ce ON ce."tenantId" = le."tenantId" AND ce."ledgerEntryId" = le."id"
    WHERE le."type" = 'EXPIRY' AND (le."direction" <> 'DEBIT' OR ce."id" IS NULL)
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: expiry ledger entry has no matching expiry evidence'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."LoyaltyLedgerEntry" le
    WHERE NOT ((le."type" = 'EARN' AND le."direction" = 'CREDIT') OR (le."type" = 'REDEEM' AND le."direction" = 'DEBIT') OR (le."type" = 'ADJUSTMENT' AND le."direction" IN ('CREDIT', 'DEBIT')) OR (le."type" = 'REVERSAL' AND le."direction" = 'CREDIT') OR (le."type" = 'EXPIRY' AND le."direction" = 'DEBIT'))
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: unsupported ledger type/direction'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."LoyaltyLedgerEntry" le LEFT JOIN (SELECT "tenantId", "redemptionLedgerEntryId", SUM("amountKobo") AS amount FROM public."RedemptionAllocation" GROUP BY 1, 2) a ON a."tenantId" = le."tenantId" AND a."redemptionLedgerEntryId" = le."id"
    WHERE le."direction" = 'DEBIT' AND le."type" IN ('REDEEM', 'ADJUSTMENT') AND le."amountKobo" IS DISTINCT FROM COALESCE(a.amount, 0)
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: debit allocation total mismatch'; END IF;
  IF EXISTS (
    SELECT 1 FROM (SELECT "tenantId", "allocationId", SUM("amountKobo") AS amount FROM public."AllocationRestoration" GROUP BY 1, 2) ar
    JOIN public."RedemptionAllocation" ra ON ra."tenantId" = ar."tenantId" AND ra."id" = ar."allocationId"
    WHERE ar.amount > ra."amountKobo"
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: restoration exceeds allocation'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."AuditLog" WHERE ("actorTenantId" IS NULL) <> ("actorId" IS NULL) OR ("actorTenantId" IS NOT NULL AND "actorTenantId" IS DISTINCT FROM "tenantId")
  ) THEN RAISE EXCEPTION 'financial schema reconciliation preflight: audit actor tenant mismatch'; END IF;
END
$financial_preflight$;

-- Restore missing or stale canonical functions.
CREATE OR REPLACE FUNCTION public.prevent_allocation_restoration_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'allocation restorations are immutable';
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_confirmed_ledger_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'confirmed ledger entries are append-only';
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_credit_expiry_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'credit expiry evidence is immutable';
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_credit_lot_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'credit lots cannot be deleted';
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_receipt_evidence_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_redemption_allocation_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'redemption allocations are immutable';
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_redemption_evidence_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_allocation_restoration_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_credit_expiry_commit_state()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_credit_lot_balance_evidence()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM validate_credit_lot_balance_evidence_for_lot(
    NEW."tenantId",
    NEW."id"
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_credit_lot_balance_evidence_for_lot(p_tenant_id text, p_credit_lot_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_credit_lot_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_debit_allocation_invariants_for_ledger(p_tenant_id text, p_ledger_entry_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_ledger_entry_commit_state()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_redemption_allocation_commit_state()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

-- Add missing checks without bypassing validation of existing rows.
DO $ensure_checks$
DECLARE
  item record;
  existing_definition text;
  existing_oid oid;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('Adjustment', 'Adjustment_amountKobo_positive_check', $check$CHECK ("amountKobo" > 0)$check$)
      , ('Adjustment', 'Adjustment_reason_nonempty_check', $check$CHECK (length(btrim(reason)) > 0)$check$)
      , ('AllocationRestoration', 'AllocationRestoration_amountKobo_positive_check', $check$CHECK ("amountKobo" > 0)$check$)
      , ('Approval', 'Approval_financial_state_machine_check', $check$CHECK (status = 'PENDING'::"ApprovalStatus" AND "decisionByTenantId" IS NULL AND "decisionBy" IS NULL AND "decisionReason" IS NULL AND "decidedAt" IS NULL AND "executedAt" IS NULL OR status = 'APPROVED'::"ApprovalStatus" AND "decisionByTenantId" IS NOT NULL AND "decisionBy" IS NOT NULL AND "decisionReason" IS NOT NULL AND "decidedAt" IS NOT NULL AND "executedAt" IS NULL OR status = 'EXECUTED'::"ApprovalStatus" AND "decisionByTenantId" IS NOT NULL AND "decisionBy" IS NOT NULL AND "decisionReason" IS NOT NULL AND "decidedAt" IS NOT NULL AND "executedAt" IS NOT NULL OR status = 'REJECTED'::"ApprovalStatus" AND "decisionByTenantId" IS NOT NULL AND "decisionBy" IS NOT NULL AND "decisionReason" IS NOT NULL AND "decidedAt" IS NOT NULL AND "executedAt" IS NULL OR status = 'EXPIRED'::"ApprovalStatus" AND "decisionReason" IS NOT NULL AND "decidedAt" IS NOT NULL AND "executedAt" IS NULL)$check$)
      , ('Approval', 'Approval_target_xor_check', $check$CHECK ("targetType" = 'EARN'::"ApprovalTargetType" AND "receiptId" IS NOT NULL AND "redemptionId" IS NULL OR "targetType" = 'REDEEM'::"ApprovalTargetType" AND "receiptId" IS NULL AND "redemptionId" IS NOT NULL)$check$)
      , ('AuditLog', 'AuditLog_actor_pair_check', $check$CHECK (("actorTenantId" IS NULL) = ("actorId" IS NULL))$check$)
      , ('AuditLog', 'AuditLog_actor_tenant_match_check', $check$CHECK ("actorTenantId" IS NULL OR "actorTenantId" = "tenantId")$check$)
      , ('CreditExpiry', 'CreditExpiry_amountKobo_positive_check', $check$CHECK ("amountKobo" > 0)$check$)
      , ('CreditLot', 'CreditLot_originalAmountKobo_positive_check', $check$CHECK ("originalAmountKobo" > 0)$check$)
      , ('CreditLot', 'CreditLot_remainingAmountKobo_nonnegative_check', $check$CHECK ("remainingAmountKobo" >= 0)$check$)
      , ('CreditLot', 'CreditLot_remainingAmountKobo_not_exceed_original_check', $check$CHECK ("remainingAmountKobo" <= "originalAmountKobo")$check$)
      , ('LoyaltyLedgerEntry', 'LoyaltyLedgerEntry_amountKobo_positive_check', $check$CHECK ("amountKobo" > 0)$check$)
      , ('Receipt', 'Receipt_purchaseAmountKobo_positive_check', $check$CHECK ("purchaseAmountKobo" > 0)$check$)
      , ('Redemption', 'Redemption_basketAmountKobo_positive_check', $check$CHECK ("basketAmountKobo" > 0)$check$)
      , ('Redemption', 'Redemption_confirmedAmountKobo_positive_check', $check$CHECK ("confirmedAmountKobo" IS NULL OR "confirmedAmountKobo" > 0)$check$)
      , ('Redemption', 'Redemption_financial_state_machine_check', $check$CHECK (status = 'PENDING_APPROVAL'::"RedemptionStatus" AND "ledgerEntryId" IS NULL AND "confirmedAmountKobo" IS NULL AND "confirmedAt" IS NULL AND "rejectedAt" IS NULL AND "reversedAt" IS NULL OR status = 'CONFIRMED'::"RedemptionStatus" AND "ledgerEntryId" IS NOT NULL AND "confirmedAmountKobo" = "requestedAmountKobo" AND "confirmedAt" IS NOT NULL AND "rejectedAt" IS NULL OR status = 'REJECTED'::"RedemptionStatus" AND "ledgerEntryId" IS NULL AND "confirmedAmountKobo" IS NULL AND "rejectedAt" IS NOT NULL OR status = 'EXPIRED'::"RedemptionStatus" AND "ledgerEntryId" IS NULL AND "confirmedAmountKobo" IS NULL OR status = 'REVERSED'::"RedemptionStatus" AND "ledgerEntryId" IS NOT NULL AND "confirmedAmountKobo" IS NOT NULL AND "reversedAt" IS NOT NULL)$check$)
      , ('Redemption', 'Redemption_maximumAllowedKobo_nonnegative_check', $check$CHECK ("maximumAllowedKobo" >= 0)$check$)
      , ('Redemption', 'Redemption_requestedAmountKobo_positive_check', $check$CHECK ("requestedAmountKobo" > 0)$check$)
      , ('RedemptionAllocation', 'RedemptionAllocation_amountKobo_positive_check', $check$CHECK ("amountKobo" > 0)$check$)
      , ('RedemptionAllocation', 'RedemptionAllocation_target_xor_check', $check$CHECK ((("redemptionId" IS NOT NULL)::integer + ("adjustmentId" IS NOT NULL)::integer) = 1)$check$)
    ) AS checks(table_name, constraint_name, definition)
  LOOP
    existing_oid := NULL;
    existing_definition := NULL;
    SELECT con.oid, pg_get_constraintdef(con.oid, true)
      INTO existing_oid, existing_definition
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
     WHERE ns.nspname = 'public' AND tbl.relname = item.table_name AND con.conname = item.constraint_name;
    IF existing_oid IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s NOT VALID', item.table_name, item.constraint_name, item.definition);
    ELSIF regexp_replace(existing_definition, '\s+', '', 'g') <> regexp_replace(item.definition, '\s+', '', 'g') THEN
      RAISE EXCEPTION 'financial schema reconciliation found a conflicting definition for %.%', item.table_name, item.constraint_name;
    END IF;
  END LOOP;
END
$ensure_checks$;

ALTER TABLE public."Adjustment" VALIDATE CONSTRAINT "Adjustment_amountKobo_positive_check";
ALTER TABLE public."Adjustment" VALIDATE CONSTRAINT "Adjustment_reason_nonempty_check";
ALTER TABLE public."AllocationRestoration" VALIDATE CONSTRAINT "AllocationRestoration_amountKobo_positive_check";
ALTER TABLE public."Approval" VALIDATE CONSTRAINT "Approval_financial_state_machine_check";
ALTER TABLE public."Approval" VALIDATE CONSTRAINT "Approval_target_xor_check";
ALTER TABLE public."AuditLog" VALIDATE CONSTRAINT "AuditLog_actor_pair_check";
ALTER TABLE public."AuditLog" VALIDATE CONSTRAINT "AuditLog_actor_tenant_match_check";
ALTER TABLE public."CreditExpiry" VALIDATE CONSTRAINT "CreditExpiry_amountKobo_positive_check";
ALTER TABLE public."CreditLot" VALIDATE CONSTRAINT "CreditLot_originalAmountKobo_positive_check";
ALTER TABLE public."CreditLot" VALIDATE CONSTRAINT "CreditLot_remainingAmountKobo_nonnegative_check";
ALTER TABLE public."CreditLot" VALIDATE CONSTRAINT "CreditLot_remainingAmountKobo_not_exceed_original_check";
ALTER TABLE public."LoyaltyLedgerEntry" VALIDATE CONSTRAINT "LoyaltyLedgerEntry_amountKobo_positive_check";
ALTER TABLE public."Receipt" VALIDATE CONSTRAINT "Receipt_purchaseAmountKobo_positive_check";
ALTER TABLE public."Redemption" VALIDATE CONSTRAINT "Redemption_basketAmountKobo_positive_check";
ALTER TABLE public."Redemption" VALIDATE CONSTRAINT "Redemption_confirmedAmountKobo_positive_check";
ALTER TABLE public."Redemption" VALIDATE CONSTRAINT "Redemption_financial_state_machine_check";
ALTER TABLE public."Redemption" VALIDATE CONSTRAINT "Redemption_maximumAllowedKobo_nonnegative_check";
ALTER TABLE public."Redemption" VALIDATE CONSTRAINT "Redemption_requestedAmountKobo_positive_check";
ALTER TABLE public."RedemptionAllocation" VALIDATE CONSTRAINT "RedemptionAllocation_amountKobo_positive_check";
ALTER TABLE public."RedemptionAllocation" VALIDATE CONSTRAINT "RedemptionAllocation_target_xor_check";

-- Create missing canonical triggers; preserve any existing trigger unless its definition differs.
DO $ensure_triggers$
DECLARE
  item record;
  existing_definition text;
  existing_enabled char;
  existing_deferrable boolean;
  existing_deferred boolean;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('Adjustment', 'prevent_adjustment_evidence_update', $trigger$CREATE TRIGGER prevent_adjustment_evidence_update BEFORE UPDATE ON "Adjustment" FOR EACH ROW EXECUTE FUNCTION prevent_adjustment_evidence_mutation()$trigger$, 'O', false, false)
      , ('Adjustment', 'prevent_adjustment_orphan_insert_update', $trigger$CREATE TRIGGER prevent_adjustment_orphan_insert_update BEFORE INSERT OR UPDATE ON "Adjustment" FOR EACH ROW EXECUTE FUNCTION prevent_adjustment_orphan_mutation()$trigger$, 'O', false, false)
      , ('Adjustment', 'validate_adjustment_ledger_source_insert_update', $trigger$CREATE TRIGGER validate_adjustment_ledger_source_insert_update BEFORE INSERT OR UPDATE ON "Adjustment" FOR EACH ROW EXECUTE FUNCTION validate_adjustment_ledger_source()$trigger$, 'O', false, false)
      , ('AllocationRestoration', 'prevent_allocation_restoration_delete', $trigger$CREATE TRIGGER prevent_allocation_restoration_delete BEFORE DELETE ON "AllocationRestoration" FOR EACH ROW EXECUTE FUNCTION prevent_allocation_restoration_mutation()$trigger$, 'O', false, false)
      , ('AllocationRestoration', 'prevent_allocation_restoration_update', $trigger$CREATE TRIGGER prevent_allocation_restoration_update BEFORE UPDATE ON "AllocationRestoration" FOR EACH ROW EXECUTE FUNCTION prevent_allocation_restoration_mutation()$trigger$, 'O', false, false)
      , ('AllocationRestoration', 'validate_allocation_restoration_commit_state_insert', $trigger$CREATE CONSTRAINT TRIGGER validate_allocation_restoration_commit_state_insert AFTER INSERT ON "AllocationRestoration" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_allocation_restoration_commit_state()$trigger$, 'O', true, true)
      , ('AllocationRestoration', 'validate_allocation_restoration_total_insert', $trigger$CREATE CONSTRAINT TRIGGER validate_allocation_restoration_total_insert AFTER INSERT ON "AllocationRestoration" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_allocation_restoration_total()$trigger$, 'O', true, true)
      , ('CreditExpiry', 'prevent_credit_expiry_delete', $trigger$CREATE TRIGGER prevent_credit_expiry_delete BEFORE DELETE ON "CreditExpiry" FOR EACH ROW EXECUTE FUNCTION prevent_credit_expiry_mutation()$trigger$, 'O', false, false)
      , ('CreditExpiry', 'prevent_credit_expiry_update', $trigger$CREATE TRIGGER prevent_credit_expiry_update BEFORE UPDATE ON "CreditExpiry" FOR EACH ROW EXECUTE FUNCTION prevent_credit_expiry_mutation()$trigger$, 'O', false, false)
      , ('CreditExpiry', 'validate_credit_expiry_commit_state_insert', $trigger$CREATE CONSTRAINT TRIGGER validate_credit_expiry_commit_state_insert AFTER INSERT ON "CreditExpiry" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_credit_expiry_commit_state()$trigger$, 'O', true, true)
      , ('CreditLot', 'prevent_credit_lot_delete', $trigger$CREATE TRIGGER prevent_credit_lot_delete BEFORE DELETE ON "CreditLot" FOR EACH ROW EXECUTE FUNCTION prevent_credit_lot_delete()$trigger$, 'O', false, false)
      , ('CreditLot', 'prevent_credit_lot_source_update', $trigger$CREATE TRIGGER prevent_credit_lot_source_update BEFORE UPDATE ON "CreditLot" FOR EACH ROW EXECUTE FUNCTION prevent_credit_lot_source_mutation()$trigger$, 'O', false, false)
      , ('CreditLot', 'validate_credit_lot_balance_evidence_update', $trigger$CREATE CONSTRAINT TRIGGER validate_credit_lot_balance_evidence_update AFTER UPDATE OF "remainingAmountKobo" ON "CreditLot" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_credit_lot_balance_evidence()$trigger$, 'O', true, true)
      , ('CreditLot', 'validate_credit_lot_lifecycle_insert', $trigger$CREATE TRIGGER validate_credit_lot_lifecycle_insert BEFORE INSERT ON "CreditLot" FOR EACH ROW EXECUTE FUNCTION validate_credit_lot_lifecycle()$trigger$, 'O', false, false)
      , ('CreditLot', 'validate_credit_lot_lifecycle_update', $trigger$CREATE TRIGGER validate_credit_lot_lifecycle_update BEFORE UPDATE ON "CreditLot" FOR EACH ROW EXECUTE FUNCTION validate_credit_lot_lifecycle()$trigger$, 'O', false, false)
      , ('CreditLot', 'validate_credit_lot_source_insert', $trigger$CREATE TRIGGER validate_credit_lot_source_insert BEFORE INSERT ON "CreditLot" FOR EACH ROW EXECUTE FUNCTION validate_credit_lot_source()$trigger$, 'O', false, false)
      , ('CreditLot', 'validate_credit_lot_source_update', $trigger$CREATE TRIGGER validate_credit_lot_source_update BEFORE UPDATE ON "CreditLot" FOR EACH ROW EXECUTE FUNCTION validate_credit_lot_source()$trigger$, 'O', false, false)
      , ('LoyaltyLedgerEntry', 'prevent_confirmed_ledger_delete', $trigger$CREATE TRIGGER prevent_confirmed_ledger_delete BEFORE DELETE ON "LoyaltyLedgerEntry" FOR EACH ROW EXECUTE FUNCTION prevent_confirmed_ledger_mutation()$trigger$, 'O', false, false)
      , ('LoyaltyLedgerEntry', 'prevent_confirmed_ledger_update', $trigger$CREATE TRIGGER prevent_confirmed_ledger_update BEFORE UPDATE ON "LoyaltyLedgerEntry" FOR EACH ROW EXECUTE FUNCTION prevent_confirmed_ledger_mutation()$trigger$, 'O', false, false)
      , ('LoyaltyLedgerEntry', 'validate_ledger_entry_commit_state_insert', $trigger$CREATE CONSTRAINT TRIGGER validate_ledger_entry_commit_state_insert AFTER INSERT ON "LoyaltyLedgerEntry" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_ledger_entry_commit_state()$trigger$, 'O', true, true)
      , ('Receipt', 'prevent_receipt_evidence_update', $trigger$CREATE TRIGGER prevent_receipt_evidence_update BEFORE UPDATE ON "Receipt" FOR EACH ROW EXECUTE FUNCTION prevent_receipt_evidence_mutation()$trigger$, 'O', false, false)
      , ('Redemption', 'prevent_redemption_evidence_update', $trigger$CREATE TRIGGER prevent_redemption_evidence_update BEFORE UPDATE ON "Redemption" FOR EACH ROW EXECUTE FUNCTION prevent_redemption_evidence_mutation()$trigger$, 'O', false, false)
      , ('RedemptionAllocation', 'prevent_redemption_allocation_delete', $trigger$CREATE TRIGGER prevent_redemption_allocation_delete BEFORE DELETE ON "RedemptionAllocation" FOR EACH ROW EXECUTE FUNCTION prevent_redemption_allocation_mutation()$trigger$, 'O', false, false)
      , ('RedemptionAllocation', 'prevent_redemption_allocation_update', $trigger$CREATE TRIGGER prevent_redemption_allocation_update BEFORE UPDATE ON "RedemptionAllocation" FOR EACH ROW EXECUTE FUNCTION prevent_redemption_allocation_mutation()$trigger$, 'O', false, false)
      , ('RedemptionAllocation', 'validate_redemption_allocation_commit_state_insert', $trigger$CREATE CONSTRAINT TRIGGER validate_redemption_allocation_commit_state_insert AFTER INSERT ON "RedemptionAllocation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_redemption_allocation_commit_state()$trigger$, 'O', true, true)
    ) AS triggers(table_name, trigger_name, definition, enabled, is_deferrable, initially_deferred)
  LOOP
    existing_definition := NULL;
    SELECT pg_get_triggerdef(t.oid, true), t.tgenabled, t.tgdeferrable, t.tginitdeferred
      INTO existing_definition, existing_enabled, existing_deferrable, existing_deferred
      FROM pg_trigger t
      JOIN pg_class tbl ON tbl.oid = t.tgrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
     WHERE ns.nspname = 'public' AND tbl.relname = item.table_name AND t.tgname = item.trigger_name AND NOT t.tgisinternal;
    IF existing_definition IS NULL THEN
      EXECUTE item.definition;
    ELSIF regexp_replace(existing_definition, '\s+', '', 'g') <> regexp_replace(item.definition, '\s+', '', 'g') OR existing_enabled::text <> item.enabled OR existing_deferrable <> item.is_deferrable OR existing_deferred <> item.initially_deferred THEN
      RAISE EXCEPTION 'financial schema reconciliation found a conflicting definition for %.%', item.table_name, item.trigger_name;
    END IF;
  END LOOP;
END
$ensure_triggers$;

COMMIT;
