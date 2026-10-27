-- A physical receipt can now have one EARN effect and one REDEEM effect.
-- Keep typed effect uniqueness explicit and preserve receipt-level uniqueness
-- on the Receipt table itself.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "LoyaltyLedgerEntry"
    WHERE "receiptId" IS NOT NULL
      AND "type" IN ('EARN', 'REDEEM')
    GROUP BY "tenantId", "receiptId", "type"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate typed ledger effects exist for a receipt';
  END IF;
END $$;

DROP INDEX "LoyaltyLedgerEntry_receiptId_key";

CREATE INDEX "LoyaltyLedgerEntry_tenantId_receiptId_idx"
  ON "LoyaltyLedgerEntry"("tenantId", "receiptId");

CREATE UNIQUE INDEX "LoyaltyLedgerEntry_one_earn_per_receipt_key"
  ON "LoyaltyLedgerEntry"("tenantId", "receiptId")
  WHERE "receiptId" IS NOT NULL AND "type" = 'EARN';

CREATE UNIQUE INDEX "LoyaltyLedgerEntry_one_redeem_per_receipt_key"
  ON "LoyaltyLedgerEntry"("tenantId", "receiptId")
  WHERE "receiptId" IS NOT NULL AND "type" = 'REDEEM';
