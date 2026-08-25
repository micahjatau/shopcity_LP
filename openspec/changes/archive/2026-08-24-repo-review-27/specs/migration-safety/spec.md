## ADDED Requirements

### Requirement: Shared migration release evidence proves ledger alignment

The system MUST require release evidence that compares the shared database migration ledger with the committed Prisma migration directories and verifies a restore-based deploy on a separate database.

#### Scenario: Migration ledger diverges from the repository

- **WHEN** `_prisma_migrations` does not match the committed migration directories
- **THEN** the verification process MUST report the mismatch and keep the change out of release-ready status until the divergence is resolved

#### Scenario: Restored backup is upgraded

- **WHEN** a backup of the shared database is restored into a separate verification database
- **THEN** `prisma migrate deploy` MUST complete successfully or fail with a reproducible migration defect on the restored copy

#### Scenario: Restore evidence is recorded

- **WHEN** release evidence is gathered for a shared-environment schema change
- **THEN** the evidence MUST include the backup/restore verification outcome and the migration ledger comparison result
