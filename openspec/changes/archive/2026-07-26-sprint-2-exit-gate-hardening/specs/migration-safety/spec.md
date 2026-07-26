## ADDED Requirements

### Requirement: Migration deployment verifies schema alignment
The system MUST verify deployed Prisma migrations create the expected SmsMessage and OutboxEvent indexes and constraints.

#### Scenario: Migration deploy runs on a clean database
- **WHEN** migrations are applied to an empty database
- **THEN** the resulting schema includes the expected unique indexes and enum values

#### Scenario: Schema drift is detected
- **WHEN** the SQL migration output does not match the Prisma model
- **THEN** the deployment test fails

### Requirement: Historical outbox rows remain recoverable after upgrade
The system MUST ensure outbox rows created before the SMS model change can still be processed after deployment.

#### Scenario: Pre-migration outbox data exists
- **WHEN** a database contains legacy PENDING outbox rows at upgrade time
- **THEN** recovery can process them after deployment without manual database surgery

### Requirement: Migration defects are reported
The system MUST surface malformed historical payloads or incompatible data during upgrade verification instead of silently discarding them.

#### Scenario: Historical payload cannot be backfilled
- **WHEN** an old outbox payload cannot be converted into an SMS delivery record
- **THEN** the upgrade test reports the incompatible row
