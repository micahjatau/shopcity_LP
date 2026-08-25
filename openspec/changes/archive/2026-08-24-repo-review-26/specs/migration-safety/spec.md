## MODIFIED Requirements

### Requirement: Migration deployment verifies schema alignment and deployable history

The system MUST verify shared-environment Prisma migrations through deployable migration history, recorded evidence, and expected schema alignment.

#### Scenario: Migration deploy runs on a clean database

- **WHEN** migrations are applied to an empty database
- **THEN** the resulting schema includes the expected indexes, constraints, and enum values

#### Scenario: Schema drift is detected

- **WHEN** the SQL migration output does not match the Prisma model
- **THEN** the deployment test fails

#### Scenario: Migration history is incomplete

- **WHEN** the schema appears correct but the migration ledger or deploy evidence is missing
- **THEN** the migration is not considered complete

### Requirement: Historical rows remain recoverable after upgrade

The system MUST ensure historical rows that predate a migration can still be processed after deployment.

#### Scenario: Pre-migration data exists

- **WHEN** a database contains legacy rows at upgrade time
- **THEN** recovery can process them after deployment without manual database surgery

### Requirement: Migration defects are reported

The system MUST surface malformed historical payloads or incompatible data during upgrade verification instead of silently discarding them.

#### Scenario: Historical payload cannot be backfilled

- **WHEN** an old payload cannot be converted into a valid post-migration record
- **THEN** the upgrade test reports the incompatible row
