## 1. Migration Safety

- [x] 1.1 Restore the original committed repair migration content and move the follow-up SQL into a new forward migration.
- [x] 1.2 Add checksum and migration-history checks for both fresh deployment and upgrade-from-previous-fix paths.
- [x] 1.3 Update the migration tracker with the new migration and any backup/restore verification notes.

## 2. Adjustment Validation

- [x] 2.1 Add a dedicated `validate_adjustment_ledger_source` guard for Adjustment insert and update writes.
- [x] 2.2 Extend historical Adjustment preflight to reject non-Adjustment ledger links and mismatched tenant, customer, direction, amount, or effective date values.
- [x] 2.3 Add integration coverage for Adjustment attempts against EARN, REDEEM, and mismatched Adjustment ledger rows.

## 3. Receipt Quarantine

- [x] 3.1 Replace the destructive duplicate-receipt SQL with separate report, stage, and execute scripts.
- [x] 3.2 Make the execute path reject empty approval sets and unapproved IDs.
- [x] 3.3 Add integration tests proving unapproved duplicate rows remain untouched.

## 4. Restore Verification

- [x] 4.1 Update the restore test to restore the shared Supabase backup into a clean Postgres instance.
- [x] 4.2 Expand the restored-object inventory to include the new Adjustment and quarantine helpers and triggers.
- [x] 4.3 Verify restored financial history and migration checksums against the repository state.

## 5. Release Evidence And Docs

- [x] 5.1 Update release evidence notes so the issue state matches the actual verification status.
- [x] 5.2 Replace any unsafe production database deployment guidance with the forward-only migration workflow.
- [x] 5.3 Run the relevant verification commands and record the resulting evidence in the tracker.
