-- Enforce committed-only adjustment records.
ALTER TABLE "Adjustment"
  ALTER COLUMN "ledgerEntryId" SET NOT NULL;
