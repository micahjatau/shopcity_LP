## 1. Migration Hardening

- [x] 1.1 Update `prisma/migrations/20260720_receipt_integrity_gate/migration.sql` so legacy POS references are rejected when null, blank, or whitespace-only.
- [x] 1.2 Trim the backfilled `posReceiptNumber` value before it is written and keep the existing uniqueness/backfill sequence intact.

## 2. Upgrade Verification

- [x] 2.1 Add a dedicated receipt migration upgrade integration test that boots a pre-change schema, seeds legacy receipt data, and applies the patched migration.
- [x] 2.2 Verify the test covers preserved identity, dropped legacy columns, and null/blank/whitespace legacy reference handling.

## 3. Release Records and Regression Checks

- [x] 3.1 Update `docs/database/migration-tracker.md` after the upgrade-path verification passes.
- [x] 3.2 Run the targeted migration and receipt test coverage and fix any regressions discovered during verification.
