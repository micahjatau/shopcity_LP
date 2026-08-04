## MODIFIED Requirements

### Requirement: Physical POS receipt identity must be required and unique per receipt week

The system MUST require a physical POS receipt number when capturing a receipt, MUST preserve that physical identity through migration of legacy receipts, and MUST treat the normalized weekly physical receipt identity as the uniqueness boundary. Legacy receipt migration MUST reject blank or whitespace-only stored POS references instead of fabricating an identity.

#### Scenario: Missing physical receipt number is rejected

- **WHEN** a cashier submits a receipt capture without a POS receipt number
- **THEN** the system rejects the request

#### Scenario: Blank legacy receipt reference is rejected

- **WHEN** a legacy receipt row contains only whitespace in its stored POS reference
- **THEN** the migration or validation path rejects the row instead of backfilling a blank identity

#### Scenario: Duplicate receipt number within the same week is rejected

- **WHEN** two receipt submissions use the same normalized POS receipt number for the same tenant, branch, and receipt week
- **THEN** the second submission is rejected even if it uses a different idempotency key, cashier, or card

#### Scenario: Week boundary allows a new weekly receipt sequence

- **WHEN** the same physical POS receipt number occurs in a different receipt week
- **THEN** the system accepts it if the week calculation places it in a different unique scope

#### Scenario: Legacy receipts preserve their physical identity

- **WHEN** an existing receipt row is migrated from the legacy schema and contains a trustworthy stored POS reference
- **THEN** the migrated record keeps the original physical POS receipt identity instead of a generated UUID

#### Scenario: Unmappable legacy receipt rows are not fabricated

- **WHEN** a legacy receipt row does not contain a trustworthy POS receipt reference
- **THEN** the migration or validation path quarantines the row instead of inventing a replacement identity

## ADDED Requirements

### Requirement: Receipt-integrity migrations must be verified before shared deployment

The system MUST prove the receipt-integrity migration against a populated pre-change schema before the migration is treated as safe for shared or production deployment.

#### Scenario: Upgrade-path migration test validates preserved identity

- **WHEN** the test database is created from the pre-change receipt schema, a legacy receipt row with a real stored external reference is inserted, and the receipt-integrity migration is applied
- **THEN** the migrated receipt retains the trimmed physical POS receipt identity and the legacy column is removed

#### Scenario: Upgrade-path migration test covers null and blank references

- **WHEN** the upgrade test encounters legacy receipt rows with null, blank, or whitespace-only external references
- **THEN** the test verifies those rows are rejected, quarantined, or otherwise prevented from becoming trustworthy POS identities
