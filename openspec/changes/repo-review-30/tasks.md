## 1. Shared-database repair and verification

- [x] 1.1 Add a forward repair migration or SQL change that recreates the required financial functions, triggers, constraints, and indexes idempotently.
- [x] 1.2 Extend restore-based migration verification to compare `_prisma_migrations`, checksums, committed migration folders, `pg_constraint`, `pg_trigger`, and `pg_proc`.
- [x] 1.3 Add historical-row checks that fail when expected backfill, trigger, or guard effects are missing after restore.

## 2. Adjustment integrity enforcement

- [x] 2.1 Add database validation that rejects adjustment rows when tenant, customer, kind, amount, effective date, or ledger type diverge from the source ledger entry.
- [x] 2.2 Make adjustment evidence fields immutable after creation.
- [x] 2.3 Expand integration tests to cover valid adjustment credits and mismatch failures.

## 3. Evidence and closeout

- [x] 3.1 Update release-tracker logic and docs so repo-review and migration items stay open without proof.
- [x] 3.2 Refresh evidence checks and capture the current restored-db/object-inventory results.
- [x] 3.3 Re-run the migration safety and adjustment integrity suites to confirm the new gates fail closed.
