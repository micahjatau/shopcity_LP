BEGIN;

-- Replace __BATCH_ID__ with the staged batch id before execution.

DO $$
DECLARE
  batch_id TEXT;
  executed_by TEXT;
  incident_reference_id TEXT;
  approval_reason TEXT;
  expected_count INTEGER;
  insert_count INTEGER;
  delete_count INTEGER;
  has_conflicting_dependency BOOLEAN := FALSE;
  conflict_sql TEXT := 'SELECT EXISTS (SELECT 1 FROM "ReceiptLegacyIdentityQuarantineStage" s WHERE s."batchId" = $1 AND COALESCE(NULLIF(BTRIM(s."reconciliationPlan"), ''''), '''') = '''' AND (';
  needs_or BOOLEAN := FALSE;
BEGIN
  batch_id := '__BATCH_ID__';
  executed_by := '__EXECUTED_BY__';
  incident_reference_id := '__INCIDENT_REFERENCE_ID__';
  approval_reason := '__APPROVAL_REASON__';

  IF NOT EXISTS (
    SELECT 1
    FROM "ReceiptLegacyIdentityQuarantineBatch" b
    WHERE b."id" = batch_id
      AND b."status" = 'STAGED'
  ) THEN
    RAISE EXCEPTION 'staged approved receipt batch is missing or not staged';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "ReceiptLegacyIdentityQuarantineBatch" b
    WHERE b."id" = batch_id
      AND b."incidentReferenceId" = incident_reference_id
      AND COALESCE(b."approvalReason", '') = approval_reason
  ) THEN
    RAISE EXCEPTION 'quarantine batch metadata does not match the supplied operator context';
  END IF;

  PERFORM 1
  FROM "ReceiptLegacyIdentityQuarantineStage" s
  WHERE s."batchId" = batch_id
  FOR UPDATE;

  GET DIAGNOSTICS expected_count = ROW_COUNT;

  IF expected_count = 0 THEN
    RAISE EXCEPTION 'staged approved receipt list is empty';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReceiptLegacyIdentityQuarantineStage" s
    LEFT JOIN (
      WITH ranked AS (
        SELECT
          r."id",
          r."tenantId",
          r."branchId",
          r."receiptWeekStart",
          UPPER(BTRIM(r."externalReceiptNumber")) AS normalized_legacy_pos_receipt_number,
          ROW_NUMBER() OVER (
            PARTITION BY
              r."tenantId",
              r."branchId",
              r."receiptWeekStart",
              UPPER(BTRIM(r."externalReceiptNumber"))
            ORDER BY r."capturedAt" ASC, r."updatedAt" ASC, r."id" ASC
          ) AS duplicate_rank,
          COUNT(*) OVER (
            PARTITION BY
              r."tenantId",
              r."branchId",
              r."receiptWeekStart",
              UPPER(BTRIM(r."externalReceiptNumber"))
          ) AS duplicate_group_size
        FROM "Receipt" r
        WHERE r."externalReceiptNumber" IS NOT NULL
          AND BTRIM(r."externalReceiptNumber") <> ''
      )
      SELECT *
      FROM ranked
      WHERE duplicate_rank > 1
    ) d ON d."id" = s."id"
    WHERE s."batchId" = batch_id
      AND d."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'staged receipt IDs must exist in the duplicate report';
  END IF;

  IF to_regclass('"LoyaltyLedgerEntry"') IS NOT NULL THEN
    conflict_sql := conflict_sql || 'EXISTS (SELECT 1 FROM "LoyaltyLedgerEntry" le WHERE le."tenantId" = s."tenantId" AND le."receiptId" = s."id" AND le."status" = ''CONFIRMED'')';
    needs_or := TRUE;
  END IF;

  IF to_regclass('"Redemption"') IS NOT NULL THEN
    IF needs_or THEN
      conflict_sql := conflict_sql || ' OR ';
    END IF;
    conflict_sql := conflict_sql || 'EXISTS (SELECT 1 FROM "Redemption" r WHERE r."tenantId" = s."tenantId" AND r."receiptId" = s."id" AND r."status" = ''CONFIRMED'')';
    needs_or := TRUE;
  END IF;

  IF needs_or THEN
    conflict_sql := conflict_sql || '))';
    EXECUTE conflict_sql INTO has_conflicting_dependency USING batch_id;

    IF has_conflicting_dependency THEN
      RAISE EXCEPTION 'staged receipt requires a reconciliation plan';
    END IF;
  END IF;

  INSERT INTO "ReceiptLegacyIdentityQuarantine" (
    "batchId",
    "id",
    "tenantId",
    "branchId",
    "receiptWeekStart",
    "normalizedLegacyPosReceiptNumber",
    "duplicateRank",
    "duplicateGroupSize",
    "reconciliationPlan",
    "reason",
    "receiptRow",
    "quarantinedAt"
  )
  SELECT
    s."batchId",
    s."id",
    s."tenantId",
    s."branchId",
    s."receiptWeekStart",
    s."normalizedLegacyPosReceiptNumber",
    s."duplicateRank",
    s."duplicateGroupSize",
    s."reconciliationPlan",
    'Duplicate legacy POS receipt identity quarantined after explicit approval',
    to_jsonb(r),
    NOW()
  FROM "ReceiptLegacyIdentityQuarantineStage" s
  JOIN "Receipt" r
    ON r."id" = s."id"
  WHERE s."batchId" = batch_id
  ON CONFLICT ("batchId", "id") DO UPDATE
  SET
    "batchId" = EXCLUDED."batchId",
    "tenantId" = EXCLUDED."tenantId",
    "branchId" = EXCLUDED."branchId",
    "receiptWeekStart" = EXCLUDED."receiptWeekStart",
    "normalizedLegacyPosReceiptNumber" = EXCLUDED."normalizedLegacyPosReceiptNumber",
    "duplicateRank" = EXCLUDED."duplicateRank",
    "duplicateGroupSize" = EXCLUDED."duplicateGroupSize",
    "reconciliationPlan" = EXCLUDED."reconciliationPlan",
    "reason" = EXCLUDED."reason",
    "receiptRow" = EXCLUDED."receiptRow",
    "quarantinedAt" = EXCLUDED."quarantinedAt";

  GET DIAGNOSTICS insert_count = ROW_COUNT;

  IF insert_count <> expected_count THEN
    RAISE EXCEPTION 'quarantine write count did not match staged row count';
  END IF;

  DELETE FROM "Receipt"
  WHERE "id" IN (
    SELECT s."id"
    FROM "ReceiptLegacyIdentityQuarantineStage" s
    WHERE s."batchId" = batch_id
  );

  GET DIAGNOSTICS delete_count = ROW_COUNT;

  IF delete_count <> expected_count THEN
    RAISE EXCEPTION 'receipt delete count did not match staged row count';
  END IF;

  UPDATE "ReceiptLegacyIdentityQuarantineBatch"
  SET
    "status" = 'EXECUTED',
    "approvalReason" = approval_reason,
    "executedBy" = executed_by,
    "executedAt" = NOW()
  WHERE "id" = batch_id
    AND "status" = 'STAGED';

  GET DIAGNOSTICS insert_count = ROW_COUNT;

  IF insert_count <> 1 THEN
    RAISE EXCEPTION 'staged approved receipt batch transition did not update exactly one row';
  END IF;
END;
$$;

COMMIT;
