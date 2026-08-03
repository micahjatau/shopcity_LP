BEGIN;

CREATE TABLE IF NOT EXISTS "ReceiptLegacyIdentityQuarantineBatch" (
  "id" TEXT PRIMARY KEY,
  "incidentReferenceId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "executedBy" TEXT,
  "executedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "ReceiptLegacyIdentityQuarantineApproval" (
  "batchId" TEXT NOT NULL,
  "id" TEXT PRIMARY KEY,
  "reconciliationPlan" TEXT,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ReceiptLegacyIdentityQuarantineStage" (
  "batchId" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "receiptWeekStart" TIMESTAMP(3) NOT NULL,
  "normalizedLegacyPosReceiptNumber" TEXT NOT NULL,
  "duplicateRank" INTEGER NOT NULL,
  "duplicateGroupSize" INTEGER NOT NULL,
  "reconciliationPlan" TEXT,
  "stagedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("batchId", "id")
);

CREATE TABLE IF NOT EXISTS "ReceiptLegacyIdentityQuarantine" (
  "batchId" TEXT NOT NULL,
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "receiptWeekStart" TIMESTAMP(3) NOT NULL,
  "normalizedLegacyPosReceiptNumber" TEXT NOT NULL,
  "duplicateRank" INTEGER NOT NULL,
  "duplicateGroupSize" INTEGER NOT NULL,
  "reconciliationPlan" TEXT,
  "reason" TEXT NOT NULL,
  "receiptRow" JSONB NOT NULL,
  "quarantinedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  approved_batch RECORD;
  approved_batch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO approved_batch_count
  FROM "ReceiptLegacyIdentityQuarantineBatch"
  WHERE "status" = 'APPROVED';

  IF approved_batch_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one approved quarantine batch';
  END IF;

  SELECT *
  INTO approved_batch
  FROM "ReceiptLegacyIdentityQuarantineBatch"
  WHERE "status" = 'APPROVED'
  ORDER BY COALESCE("approvedAt", "createdAt") DESC, "createdAt" DESC, "id" ASC
  LIMIT 1;

  IF approved_batch."id" IS NULL THEN
    RAISE EXCEPTION 'approved quarantine batch is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "ReceiptLegacyIdentityQuarantineApproval" a WHERE a."batchId" = approved_batch."id"
  ) THEN
    RAISE EXCEPTION 'approved receipt list is empty';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReceiptLegacyIdentityQuarantineApproval" a
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
    ) d ON d."id" = a."id"
    WHERE a."batchId" = approved_batch."id"
      AND d."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'approved receipt IDs must exist in the duplicate report';
  END IF;
END;
$$;

WITH approved_batch AS (
  SELECT "id"
  FROM "ReceiptLegacyIdentityQuarantineBatch"
  WHERE "status" = 'APPROVED'
  ORDER BY COALESCE("approvedAt", "createdAt") DESC, "createdAt" DESC, "id" ASC
  LIMIT 1
), ranked AS (
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
), duplicates AS (
  SELECT *
  FROM ranked
  WHERE duplicate_rank > 1
), approved AS (
  SELECT
    a."batchId",
    d."id",
    d."tenantId",
    d."branchId",
    d."receiptWeekStart",
    d.normalized_legacy_pos_receipt_number,
    d.duplicate_rank,
    d.duplicate_group_size,
    a."reconciliationPlan"
  FROM duplicates d
  JOIN "ReceiptLegacyIdentityQuarantineApproval" a
    ON a."id" = d."id"
   AND a."batchId" = (SELECT "id" FROM approved_batch)
)
INSERT INTO "ReceiptLegacyIdentityQuarantineStage" (
  "batchId",
  "id",
  "tenantId",
  "branchId",
  "receiptWeekStart",
  "normalizedLegacyPosReceiptNumber",
  "duplicateRank",
  "duplicateGroupSize",
  "reconciliationPlan",
  "stagedAt"
)
SELECT
  a."batchId",
  a."id",
  a."tenantId",
  a."branchId",
  a."receiptWeekStart",
  a.normalized_legacy_pos_receipt_number,
  a.duplicate_rank,
  a.duplicate_group_size,
  a."reconciliationPlan",
  NOW()
FROM approved a
ON CONFLICT ("batchId", "id") DO UPDATE
SET
  "tenantId" = EXCLUDED."tenantId",
  "branchId" = EXCLUDED."branchId",
  "receiptWeekStart" = EXCLUDED."receiptWeekStart",
  "normalizedLegacyPosReceiptNumber" = EXCLUDED."normalizedLegacyPosReceiptNumber",
  "duplicateRank" = EXCLUDED."duplicateRank",
  "duplicateGroupSize" = EXCLUDED."duplicateGroupSize",
  "reconciliationPlan" = EXCLUDED."reconciliationPlan",
  "stagedAt" = EXCLUDED."stagedAt";

UPDATE "ReceiptLegacyIdentityQuarantineBatch"
SET "status" = 'STAGED'
WHERE "id" = (
  SELECT "id"
  FROM "ReceiptLegacyIdentityQuarantineBatch"
  WHERE "status" = 'APPROVED'
  ORDER BY COALESCE("approvedAt", "createdAt") DESC, "createdAt" DESC, "id" ASC
  LIMIT 1
);

COMMIT;
