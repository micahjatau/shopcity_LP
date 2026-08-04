## Why

Repo review 31 shows the project is still blocked on evidence gaps, not just implementation gaps: the restore test does not actually restore, migration checksums are not compared against committed SQL, one repair migration assumes old objects already exist, and receipt duplicate cleanup can delete data that was supposed to be manually reviewed.

## What Changes

- Replace fake restore verification with a real backup/restore check that compares committed migration checksums and restored database objects before release.
- Require forward repair migrations to be self-contained or to fail closed with an explicit missing-dependency inventory.
- Add preflight validation for historical adjustment mismatches and close the orphan-adjustment gap with an explicit linkage rule or lifecycle decision.
- Rewrite receipt duplicate handling into a reviewed-ID quarantine flow instead of automatic deletion.
- Keep review and migration closure claims open until evidence is linked and visible.

## Capabilities

### New Capabilities

- `migration-restore-verification`: restore-based migration validation, checksum comparison, and dependency inventory checks for repair migrations.
- `adjustment-ledger-linkage`: adjustment rows must be linked to their source ledger entry or remain in an explicit non-committed state, and historical mismatches must fail preflight.
- `receipt-quarantine-safety`: receipt duplicate review must use an approved-ID staging flow before any quarantine or delete action.

### Modified Capabilities

- `migration-safety`: shared-database verification must compare restored database objects, committed migration checksums, and historical effects, not only a clean migration run.
- `sprint-2-release-evidence`: migration and repo-review completion claims must stay unproven until linked evidence exists.

## Impact

Migration verification tests, repair migration SQL, Prisma migration checksum handling, adjustment integrity rules, receipt remediation runbooks and SQL, migration-tracker evidence, and release-closeout reporting.
