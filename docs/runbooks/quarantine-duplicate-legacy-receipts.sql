-- Quarantine duplicate legacy POS receipt identities before applying the
-- receipt integrity migration.
--
-- Safe on post-migration databases: it no-ops if Receipt.externalReceiptNumber
-- no longer exists.
--
-- Preflight:
-- 1. Run the missing-reference query below.
-- 2. If any rows are returned, stop and repair from backup or manual
--    reconciliation before applying the migration.
-- 3. Run the duplicate-identity query below.
-- 4. If duplicate groups are returned, review them manually and then run this
--    quarantine block only for the rows approved for quarantine.

BEGIN;

CREATE TABLE IF NOT EXISTS "ReceiptLegacyIdentityQuarantine" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "receiptWeekStart" TIMESTAMP(3) NOT NULL,
  "normalizedLegacyPosReceiptNumber" TEXT NOT NULL,
  "duplicateRank" INTEGER NOT NULL,
  "duplicateGroupSize" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "receiptRow" JSONB NOT NULL,
  "quarantinedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Receipt'
      AND column_name = 'externalReceiptNumber'
  ) THEN
    RAISE NOTICE 'Receipt.externalReceiptNumber is absent; skipping legacy receipt quarantine.';
    RETURN;
  END IF;

  EXECUTE $q$
    WITH ranked AS (
      SELECT
        r.*,
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
    ), duplicates AS (
      SELECT *
      FROM ranked
      WHERE duplicate_rank > 1
    )
    INSERT INTO "ReceiptLegacyIdentityQuarantine" (
      "id",
      "tenantId",
      "branchId",
      "receiptWeekStart",
      "normalizedLegacyPosReceiptNumber",
      "duplicateRank",
      "duplicateGroupSize",
      "reason",
      "receiptRow",
      "quarantinedAt"
    )
    SELECT
      d."id",
      d."tenantId",
      d."branchId",
      d."receiptWeekStart",
      d.normalized_legacy_pos_receipt_number,
      d.duplicate_rank,
      d.duplicate_group_size,
      'Duplicate legacy POS receipt identity quarantined before receipt integrity migration',
      to_jsonb(d),
      NOW()
    FROM duplicates d
    ON CONFLICT ("id") DO NOTHING
  $q$;

  EXECUTE $q$
    DELETE FROM "Receipt"
    WHERE "id" IN (
      SELECT d."id"
      FROM (
        SELECT
          r."id",
          ROW_NUMBER() OVER (
            PARTITION BY
              r."tenantId",
              r."branchId",
              r."receiptWeekStart",
              UPPER(BTRIM(r."externalReceiptNumber"))
            ORDER BY r."capturedAt" ASC, r."updatedAt" ASC, r."id" ASC
          ) AS duplicate_rank
        FROM "Receipt" r
        WHERE r."externalReceiptNumber" IS NOT NULL
          AND BTRIM(r."externalReceiptNumber") <> ''
      ) d
      WHERE d.duplicate_rank > 1
    )
  $q$;
END $$;

COMMIT;

-- Missing legacy receipt references:
-- SELECT
--   "tenantId", "branchId", "receiptWeekStart", COUNT(*) AS missing_count
-- FROM "Receipt"
-- WHERE "externalReceiptNumber" IS NULL OR BTRIM("externalReceiptNumber") = ''
-- GROUP BY 1, 2, 3
-- ORDER BY 1, 2, 3;

-- Duplicate legacy receipt identities:
-- SELECT
--   "tenantId", "branchId", "receiptWeekStart",
--   UPPER(BTRIM("externalReceiptNumber")) AS normalized_external_receipt_number,
--   COUNT(*)
-- FROM "Receipt"
-- WHERE "externalReceiptNumber" IS NOT NULL AND BTRIM("externalReceiptNumber") <> ''
-- GROUP BY 1, 2, 3, 4
-- HAVING COUNT(*) > 1;

-- Verification:
-- SELECT * FROM "ReceiptLegacyIdentityQuarantine" ORDER BY "quarantinedAt" DESC;
