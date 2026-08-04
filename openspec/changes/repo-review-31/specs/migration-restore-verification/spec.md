## ADDED Requirements

### Requirement: Restore-based migration validation compares real shared database state

The system MUST restore the actual shared database backup into an isolated verification database and compare committed migration checksums, `_prisma_migrations` rows, and expected SQL objects before release.

#### Scenario: Restore verification succeeds

- **WHEN** the shared database is backed up and restored into an isolated verification database
- **THEN** the verification run compares the restored migration history, committed migration checksums, and expected SQL objects and passes only when they match

#### Scenario: Restore verification detects drift

- **WHEN** the restored database is missing a committed migration effect or its recorded checksum differs from the repository file
- **THEN** the verification run fails closed and reports the mismatch

### Requirement: Forward repair migrations are self-contained or fail closed

The system MUST ensure a forward repair migration recreates every prerequisite function and trigger it depends on, or fails immediately with an explicit missing-dependency inventory.

#### Scenario: Repair prerequisites exist

- **WHEN** a repair migration invokes a helper function and recreates its trigger
- **THEN** the migration succeeds only if the helper function and trigger prerequisites are present or recreated in the same change set

#### Scenario: Repair prerequisites are missing

- **WHEN** a repair migration depends on a function or trigger that is not present in the restored database
- **THEN** the migration fails closed and reports the missing dependency list
