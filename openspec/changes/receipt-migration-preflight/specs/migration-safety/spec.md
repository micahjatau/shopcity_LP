## ADDED Requirements

### Requirement: Receipt legacy data must be preflighted before the integrity gate applies

The migration-safety workflow MUST surface missing or duplicate legacy POS receipt identities before applying the receipt integrity gate to a populated database.

#### Scenario: Legacy receipt references are missing

- **WHEN** an upgrade database contains receipt rows that no longer have the legacy POS receipt references required by the integrity gate
- **THEN** the upgrade verification reports the missing legacy receipt rows and does not present the database as ready for direct deployment

#### Scenario: Duplicate legacy receipt identities are present

- **WHEN** two or more legacy receipt rows normalize to the same POS receipt identity in the same tenant and receipt week
- **THEN** the upgrade verification reports the duplicate identities and requires repair before the receipt integrity gate is applied

### Requirement: Receipt migration upgrade harness stops at the target migration

The migration-safety upgrade harness MUST copy and apply only the migrations that precede the target migration being tested.

#### Scenario: The target migration is receipt integrity gate

- **WHEN** the upgrade harness is building a pre-change schema for `20260720_receipt_integrity_gate`
- **THEN** it applies only the migrations that come before that target and does not apply later receipt or ledger migrations first

#### Scenario: Later migrations are added to the repository

- **WHEN** new migrations are introduced after the target migration
- **THEN** the upgrade harness still stops at the target migration and continues to test the receipt integrity gate against the intended historical schema
