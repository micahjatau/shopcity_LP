## ADDED Requirements

### Requirement: Immutable receipt purchase evidence
The system SHALL prevent updates to receipt purchase-evidence fields after insertion.

#### Scenario: Purchase amount mutation rejected
- **WHEN** a database update attempts to change a receipt's `purchaseAmountKobo`
- **THEN** the database MUST reject the update

#### Scenario: Receipt identity mutation rejected
- **WHEN** a database update attempts to change a receipt's POS receipt number, occurrence timestamp, customer, card, branch, device, or capture actor
- **THEN** the database MUST reject the update

#### Scenario: Workflow metadata remains mutable
- **WHEN** approval or review workflow code updates receipt review status, reviewer identity, approval identity, review timestamp, or approval timestamp
- **THEN** the database MUST allow the update when all other constraints pass

### Requirement: Positive receipt purchase amount
The system SHALL enforce positive receipt purchase amounts at the database layer.

#### Scenario: Non-positive receipt amount rejected
- **WHEN** a receipt insert or update attempts to store `purchaseAmountKobo` less than or equal to zero
- **THEN** the database MUST reject the write

### Requirement: Receipt evidence regression coverage
The system SHALL include regression tests proving receipt evidence immutability and workflow metadata mutability.

#### Scenario: Evidence update test
- **WHEN** the integration suite attempts to update immutable receipt evidence fields directly through Prisma or SQL
- **THEN** each mutation MUST fail and the original values MUST remain unchanged

#### Scenario: Approval workflow still works
- **WHEN** a pending approval is approved or rejected after receipt immutability is enabled
- **THEN** the workflow MUST still update allowed receipt review metadata successfully
