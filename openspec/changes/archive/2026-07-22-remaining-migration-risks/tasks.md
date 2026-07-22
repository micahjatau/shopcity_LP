## 1. Migration Safety

- [x] 1.1 Add a preflight check to the receipt migration that rejects duplicate normalized legacy physical receipt identities within the same tenant, branch, and receipt week.
- [x] 1.2 Ensure the validation runs before any destructive schema changes are applied.

## 2. Upgrade Harness

- [x] 2.1 Update the upgrade-test helper to stop copying migrations once it reaches the target migration.
- [x] 2.2 Confirm the target migration is still applied against the pre-upgrade schema state built from earlier migrations only.

## 3. Integration Coverage

- [x] 3.1 Add an integration test that proves the migration fails when duplicate legacy receipt identities are present.
- [x] 3.2 Add an integration test that proves the harness no longer replays later migrations before the target migration.

## 4. Verification

- [x] 4.1 Run the affected integration tests and confirm the change is ready for `/opsx-apply`.
