BEGIN;

DO $$
DECLARE
  has_conflicting_dependency BOOLEAN := FALSE;
  conflict_sql TEXT := 'SELECT EXISTS (SELECT 1 FROM "ReceiptLegacyIdentityQuarantineStage" s WHERE COALESCE(NULLIF(BTRIM(s."reconciliationPlan"), ''''), '''') = '''' AND (';
  needs_or BOOLEAN := FALSE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ReceiptLegacyIdentityQuarantineStage"
  ) THEN
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
    WHERE d."id" IS NULL
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
    EXECUTE conflict_sql INTO has_conflicting_dependency;

    IF has_conflicting_dependency THEN
      RAISE EXCEPTION 'staged receipt requires a reconciliation plan';
    END IF;
  END IF;
END;
$$;

INSERT INTO "ReceiptLegacyIdentityQuarantine" (
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
ON CONFLICT ("id") DO NOTHING;

DELETE FROM "Receipt"
WHERE "id" IN (
  SELECT "id"
  FROM "ReceiptLegacyIdentityQuarantineStage"
);

COMMIT;
