## Why

The receipt migration is now functionally correct, but two deployment risks remain: duplicate legacy POS references in populated databases and an upgrade-test harness that can become unsafe as later migrations land. This change hardens the migration path before the system starts accumulating more ledger-era schema changes.

## What Changes

- Add a preflight check that rejects duplicate normalized legacy POS receipt references before the receipt migration runs.
- Tighten the upgrade test harness so it only replays migrations that precede the target migration.
- Add coverage for duplicate legacy receipt references in the upgrade path.
- Keep the receipt migration behavior safe for populated databases before deployment.

## Capabilities

### New Capabilities
- `receipt-migration-safety`: protects receipt schema upgrades by validating legacy receipt identities and keeping migration replay tests aligned with the intended upgrade path.

### Modified Capabilities

## Impact

- Receipt migration SQL and related migration sequencing.
- Testcontainers-backed integration tests for schema upgrades.
- Deployment readiness for databases with existing receipt history.
