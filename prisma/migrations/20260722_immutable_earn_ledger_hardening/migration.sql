ALTER TABLE "LoyaltyLedgerEntry"
  ADD COLUMN "createdByTenantId" TEXT;

UPDATE "LoyaltyLedgerEntry"
SET "createdByTenantId" = "tenantId"
WHERE "createdByTenantId" IS NULL;

ALTER TABLE "LoyaltyLedgerEntry"
  ALTER COLUMN "createdByTenantId" SET NOT NULL;

ALTER TABLE "LoyaltyLedgerEntry"
  ADD CONSTRAINT "LoyaltyLedgerEntry_createdByTenantId_createdBy_fkey"
  FOREIGN KEY ("createdByTenantId", "createdBy") REFERENCES "User"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyLedgerEntry"
  ADD CONSTRAINT "LoyaltyLedgerEntry_amountKobo_positive_check"
  CHECK ("amountKobo" > 0);

ALTER TABLE "CreditLot"
  ADD CONSTRAINT "CreditLot_originalAmountKobo_positive_check"
  CHECK ("originalAmountKobo" > 0);

ALTER TABLE "CreditLot"
  ADD CONSTRAINT "CreditLot_remainingAmountKobo_nonnegative_check"
  CHECK ("remainingAmountKobo" >= 0);

ALTER TABLE "CreditLot"
  ADD CONSTRAINT "CreditLot_remainingAmountKobo_not_exceed_original_check"
  CHECK ("remainingAmountKobo" <= "originalAmountKobo");

ALTER TABLE "LoyaltyLedgerEntry"
  ADD CONSTRAINT "LoyaltyLedgerEntry_reversesEntryId_fkey"
  FOREIGN KEY ("tenantId", "reversesEntryId") REFERENCES "LoyaltyLedgerEntry"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_requestedByTenantId_requestedBy_fkey"
  FOREIGN KEY ("requestedByTenantId", "requestedBy") REFERENCES "User"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_decisionByTenantId_decisionBy_fkey"
  FOREIGN KEY ("decisionByTenantId", "decisionBy") REFERENCES "User"("tenantId", "id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_confirmed_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'confirmed ledger entries are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "prevent_confirmed_ledger_update"
BEFORE UPDATE ON "LoyaltyLedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION prevent_confirmed_ledger_mutation();

CREATE TRIGGER "prevent_confirmed_ledger_delete"
BEFORE DELETE ON "LoyaltyLedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION prevent_confirmed_ledger_mutation();
