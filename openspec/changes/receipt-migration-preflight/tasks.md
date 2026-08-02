## 1. Upgrade Harness

- [x] 1.1 Update the receipt migration upgrade helper so it stops copying migrations once the target migration is reached.
- [x] 1.2 Add or refresh the upgrade test coverage for missing and duplicate legacy POS receipt identities at the receipt integrity gate.

## 2. Repair Workflow

- [x] 2.1 Add or update the receipt legacy-data repair runbook with the diagnostic queries for missing and duplicate POS receipt identities.
- [x] 2.2 Make the repair workflow explicit about manual review and quarantine or resolution steps before applying the migration.

## 3. Evidence and Verification

- [x] 3.1 Update the migration tracker with the receipt legacy-data repair and verification evidence.
- [x] 3.2 Run the targeted receipt migration upgrade tests and the relevant integration gate to confirm the harness and repair path behave as expected.
