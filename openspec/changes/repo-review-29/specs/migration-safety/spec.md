## MODIFIED Requirements

### Requirement: Migration deployment verifies schema alignment
The system MUST verify deployed Prisma migrations create the expected SmsMessage and OutboxEvent indexes and constraints, and the actual shared database MUST be restored into an isolated verification database where `_prisma_migrations` rows, checksums, committed migration folders, and custom SQL objects are compared before release.

#### Scenario: Migration deploy runs on a clean database
- **WHEN** migrations are applied to an empty database
- **THEN** the resulting schema includes the expected unique indexes and enum values

#### Scenario: Shared migration history is reconciled
- **WHEN** the actual shared database is backed up and restored into an isolated database
- **THEN** `prisma migrate status`, `_prisma_migrations` rows, checksums, committed migration folders, and expected custom SQL objects are compared and any drift fails verification

#### Scenario: Schema drift is detected
- **WHEN** the SQL migration output does not match the Prisma model, the restored custom SQL objects, or the shared migration ledger
- **THEN** the deployment test fails

## ADDED Requirements

### Requirement: Historical custom SQL effects are verified on restore
The system MUST verify representative historical rows still reflect the effects of custom SQL backfills, triggers, and guards after restore-based migration validation.

#### Scenario: Historical backfill effects remain present
- **WHEN** a restored shared database includes representative historical rows
- **THEN** the verification suite confirms the expected backfill and trigger effects are still present
