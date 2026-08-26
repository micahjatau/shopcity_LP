## ADDED Requirements

### Requirement: Migration history remains forward-only

The system SHALL preserve applied migration files as immutable records and SHALL introduce follow-up changes in new forward migrations.

#### Scenario: A deployed migration needs a fix

- **WHEN** a migration that has already been applied requires additional SQL
- **THEN** the change is delivered in a new migration and the original file remains unchanged

### Requirement: Restore verification uses the shared backup path

The system SHALL restore the shared Supabase backup into a clean Postgres instance and verify the restored database against repository migration history and expected objects.

#### Scenario: Shared backup is restored

- **WHEN** the verification job restores the shared backup
- **THEN** it confirms migration checksums, required functions, triggers, and expected financial history are present

### Requirement: Adjustment writes validate their ledger source

The system SHALL reject Adjustment inserts or updates unless the linked ledger entry is an Adjustment record for the same tenant, customer, direction, amount, and effective date.

#### Scenario: Adjustment points at an EARN ledger

- **WHEN** an Adjustment is written against an existing EARN ledger entry
- **THEN** the write fails validation

### Requirement: Historical Adjustment links are preflighted

The system SHALL fail migration preflight when existing Adjustment links are missing, mismatched, or reference a non-Adjustment ledger entry.

#### Scenario: Historical data links to the wrong ledger type

- **WHEN** the preflight finds an Adjustment row linked to a non-Adjustment ledger entry
- **THEN** the migration fails before the new guards are installed

### Requirement: Receipt quarantine requires explicit approval

The system SHALL produce a read-only duplicate report, stage only approved receipt IDs, and delete only staged IDs.

#### Scenario: An unapproved duplicate remains in the source table

- **WHEN** the execution step runs without that receipt ID in the approval stage
- **THEN** the receipt row remains untouched

### Requirement: Release evidence reflects verified readiness

The system SHALL keep release evidence and issue closure state aligned with the verified migration and restore checks.

#### Scenario: Required evidence is missing

- **WHEN** the current head does not have the required migration and restore evidence
- **THEN** the release evidence remains incomplete and the release issue stays open
