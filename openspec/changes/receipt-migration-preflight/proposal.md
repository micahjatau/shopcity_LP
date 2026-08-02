## Why

The receipt integrity gate now fails closed on dirty historical data, but the repository still lacks a complete, documented preflight and repair path for shared databases with legacy POS receipt problems. This change closes that gap before future migration work builds on the same upgrade path.

## What Changes

- Add a documented repair/preflight workflow for legacy receipt data that is missing POS references or contains duplicate legacy POS identities.
- Tighten receipt migration upgrade verification so it exercises only the migrations that precede the target migration and reports legacy-data defects clearly.
- Record the upgrade evidence and any required repair steps in the migration tracker and runbooks.

## Capabilities

### New Capabilities
- 

### Modified Capabilities
- `migration-safety`: the upgrade contract now includes receipt legacy-data preflight, repair guidance, and targeted upgrade-test coverage for the receipt integrity gate.

## Impact

- `prisma/migrations/20260720_receipt_integrity_gate/migration.sql` and its upgrade-path verification.
- Receipt migration upgrade tests under `test/`.
- `docs/database/migration-tracker.md`.
- New or updated runbook content for legacy receipt repair.
- Shared-database migration operations for the receipt integrity gate.
