## MODIFIED Requirements

### Requirement: Migration deployment verifies schema alignment

The system MUST verify deployed Prisma migrations create the expected SmsMessage and OutboxEvent indexes and constraints, and the actual shared database migration history MUST reconcile with the committed migration set before release.

#### Scenario: Migration deploy runs on a clean database

- **WHEN** migrations are applied to an empty database
- **THEN** the resulting schema includes the expected unique indexes and enum values

#### Scenario: Shared migration history is reconciled

- **WHEN** the actual shared database is backed up and restored into an isolated database
- **THEN** `prisma migrate status`, `_prisma_migrations` rows, checksums, and committed migration folders are compared and any drift fails verification

#### Scenario: Schema drift is detected

- **WHEN** the SQL migration output does not match the Prisma model or the shared migration ledger
- **THEN** the deployment test fails
