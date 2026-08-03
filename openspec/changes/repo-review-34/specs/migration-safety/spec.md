## ADDED Requirements

### Requirement: Shared backup restore verification uses the actual backup
The system SHALL provide a protected shared-database restore verification that requires actual schema and data dump paths and never falls back to a generated fixture when the shared backup is unavailable.

#### Scenario: Shared backup paths are missing
- **WHEN** the shared restore verification is invoked without the required actual schema or data dump paths
- **THEN** the verification MUST fail fast and MUST NOT generate or restore a synthetic substitute.

#### Scenario: Shared backup is restored isolated
- **WHEN** actual shared backup paths are provided
- **THEN** the verification MUST restore them into an isolated PostgreSQL instance and preserve the restored `_prisma_migrations` table.

### Requirement: Migration history is reconciled before repair
The system SHALL read original restored migration rows before any repair command and compare them to repository migrations by name, SHA-256 checksum, finished timestamp, rolled-back timestamp, and applied-step count.

#### Scenario: Migration checksum differs
- **WHEN** a restored migration row checksum differs from the matching repository migration file
- **THEN** verification MUST fail before any `migrate resolve` or repair command is executed.

#### Scenario: Extra or missing migrations are detected
- **WHEN** the database contains migrations absent from the repository or the repository contains committed migrations absent from the database after deployment
- **THEN** verification MUST fail with a machine-readable reconciliation report.

### Requirement: Shared restore verifies database objects and financial behaviour
The system SHALL verify required functions, triggers, constraints, indexes, migration-object effects, and historical financial rows after restoring the shared backup.

#### Scenario: Applied migration lacks expected object
- **WHEN** a migration is recorded as applied but its expected function, trigger, constraint, or index is missing
- **THEN** shared restore verification MUST fail.

#### Scenario: Historical financial evidence violates invariants
- **WHEN** restored Receipt, loyalty ledger, credit lot, redemption allocation, allocation restoration, Adjustment, Approval, outbox event, or SMS rows violate current invariants
- **THEN** shared restore verification MUST fail and report the violated probe.

### Requirement: Synthetic migration testing is labelled separately
The system SHALL keep synthetic upgrade-path testing but identify it as synthetic and not as shared-backup restore evidence.

#### Scenario: Synthetic test completes
- **WHEN** the synthetic upgrade-path test passes
- **THEN** release evidence MUST NOT describe it as proof that the actual shared Supabase backup was restored.
