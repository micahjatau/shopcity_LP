## Why

The latest review still blocks shared-database rollout because the receipt migration can accept blank legacy POS references and the upgrade path has not been proven against a populated pre-change schema. That makes the receipt-integrity gate safe for fresh installs, but not yet trustworthy for retained data.

## What Changes

- Tighten the receipt migration guard so legacy POS references must be non-empty after trimming before they are backfilled.
- Backfill historical receipt identities using the trimmed legacy POS reference instead of preserving incidental whitespace.
- Add a dedicated upgrade-path migration test that applies the pre-change schema, inserts legacy receipt rows, runs the migration, and verifies preserved identity plus legacy column removal.
- Record the successful migration verification in the migration tracker before the change is considered deployment-safe.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `receipt-integrity-gate`: legacy receipt migration must reject blank or whitespace-only POS references and must be verified through an upgrade-path migration test before shared deployment.

## Impact

- `prisma/migrations/20260720_receipt_integrity_gate/migration.sql` for the legacy receipt backfill guard.
- A focused migration verification integration test under `test/`.
- `docs/database/migration-tracker.md` to record the successful verification.
- Receipt-integrity documentation and review notes that describe shared-database readiness.
