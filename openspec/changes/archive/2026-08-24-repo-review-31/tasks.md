## 1. Restore and migration verification

- [x] 1.1 Replace the fake restore test with a harness that restores a shared-database backup into isolation and compares `_prisma_migrations`, committed migration folders, checksums, and SQL object inventory.
- [x] 1.2 Make the forward repair migration fail closed or recreate every prerequisite function and trigger it depends on.
- [x] 1.3 Add historical-row restore checks so missing backfill, trigger, or guard effects fail the verification run.

## 2. Adjustment integrity

- [x] 2.1 Enforce that committed adjustments match their source ledger entry on tenant, customer, kind, amount, effective date, and ledger relationship.
- [x] 2.2 Add the explicit non-committed adjustment state or guard so draft adjustments cannot be finalized without a ledger link.
- [x] 2.3 Add migration preflight checks that scan existing adjustment and ledger rows and fail closed on historical mismatches.

## 3. Receipt quarantine safety

- [x] 3.1 Rewrite duplicate-receipt handling to produce a read-only report first and accept only an approved-ID staging list for remediation.
- [x] 3.2 Remove automatic deletion of duplicate receipt rows that are merely ranked after the first record.
- [x] 3.3 Add tests that prove unreviewed duplicates are preserved and only approved IDs can be quarantined or deleted.

## 4. Evidence and closeout

- [x] 4.1 Update migration-tracker and release-closeout guidance so repo-review and migration claims stay open until linked workflow, restore, or object-inventory evidence exists.
- [x] 4.2 Refresh the release evidence artifacts for the new restore and verification flow.
- [x] 4.3 Re-run the targeted migration-safety, adjustment, and receipt verification suites to confirm the new gates fail closed.
