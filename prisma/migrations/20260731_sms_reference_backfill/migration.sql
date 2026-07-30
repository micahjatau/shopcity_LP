UPDATE "SmsMessage" sm
SET "receiptId" = COALESCE(
  sm."receiptId",
  NULLIF(oe."payload"->>'receiptId', ''),
  CASE WHEN oe."aggregateType" = 'receipt' THEN oe."aggregateId" ELSE NULL END
)
FROM "OutboxEvent" oe
WHERE sm."tenantId" = oe."tenantId"
  AND sm."outboxEventId" = oe."id"
  AND sm."receiptId" IS NULL
  AND (
    NULLIF(oe."payload"->>'receiptId', '') IS NOT NULL
    OR oe."aggregateType" = 'receipt'
  );

UPDATE "SmsMessage" sm
SET "ledgerEntryId" = COALESCE(
  sm."ledgerEntryId",
  NULLIF(oe."payload"->>'transactionId', '')
)
FROM "OutboxEvent" oe
WHERE sm."tenantId" = oe."tenantId"
  AND sm."outboxEventId" = oe."id"
  AND sm."ledgerEntryId" IS NULL
  AND NULLIF(oe."payload"->>'transactionId', '') IS NOT NULL;

UPDATE "SmsMessage" sm
SET "redemptionId" = COALESCE(
  sm."redemptionId",
  NULLIF(oe."payload"->>'redemptionId', '')
)
FROM "OutboxEvent" oe
WHERE sm."tenantId" = oe."tenantId"
  AND sm."outboxEventId" = oe."id"
  AND sm."redemptionId" IS NULL
  AND NULLIF(oe."payload"->>'redemptionId', '') IS NOT NULL;

UPDATE "SmsMessage" sm
SET "adjustmentId" = COALESCE(
  sm."adjustmentId",
  NULLIF(oe."payload"->>'adjustmentId', '')
)
FROM "OutboxEvent" oe
WHERE sm."tenantId" = oe."tenantId"
  AND sm."outboxEventId" = oe."id"
  AND sm."adjustmentId" IS NULL
  AND NULLIF(oe."payload"->>'adjustmentId', '') IS NOT NULL;
