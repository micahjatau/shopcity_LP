-- Report duplicate legacy POS receipt identities without changing data.

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
SELECT
  d."id",
  d."tenantId",
  d."branchId",
  d."receiptWeekStart",
  d.normalized_legacy_pos_receipt_number,
  d.duplicate_rank,
  d.duplicate_group_size,
  to_jsonb(d) AS "receiptRow"
FROM duplicates d
ORDER BY
  d."tenantId",
  d."branchId",
  d."receiptWeekStart",
  d.normalized_legacy_pos_receipt_number,
  d.duplicate_rank;
