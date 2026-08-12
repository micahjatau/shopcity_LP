## ADDED Requirements

### Requirement: Backup and restore are pilot launch gates

The system SHALL require a verified restore workflow before pilot launch.

#### Scenario: Restore drill is measured and acceptable

- **WHEN** a current backup is restored into an isolated environment and invariant verification completes successfully
- **THEN** the recorded evidence includes the source backup time, restore completion time, verification completion time, observed RPO, observed RTO, and the tested release artifact

#### Scenario: Restore evidence is missing or exceeds limits

- **WHEN** restore proof is absent or the observed RPO/RTO exceeds the accepted pilot thresholds
- **THEN** the production-readiness gate fails

### Requirement: Restored databases preserve financial integrity objects and data invariants

The system SHALL verify more than table presence after restore.

#### Scenario: Restored invariant verification passes

- **WHEN** the restored-database verification script runs
- **THEN** it confirms expected migrations, financial constraints, triggers/functions, non-negative lot balances, authoritative lot equations, and report rebuild viability

#### Scenario: Recoverable background work remains intact

- **GIVEN** financially relevant outbox or operational recovery work existed in the source database
- **WHEN** the restored environment is verified
- **THEN** that work remains present and recoverable according to the designed recovery rules

### Requirement: Backup ownership is explicit

The system SHALL document provider-managed backup responsibility in addition to repository drill scripts.

#### Scenario: Scripted drill does not replace provider backups

- **WHEN** backup and restore procedures are documented for pilot operations
- **THEN** the documentation explicitly distinguishes verification scripts from the required provider-managed encrypted scheduled backup or PITR controls
