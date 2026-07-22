## ADDED Requirements

### Requirement: Reject duplicate legacy receipt identities
The system MUST reject a receipt migration when legacy receipt rows contain duplicate normalized physical receipt identities within the same tenant, branch, and receipt week.

#### Scenario: Duplicate legacy receipts fail the migration
- **WHEN** two or more legacy receipt rows normalize to the same physical receipt identity in the same tenant, branch, and receipt week
- **THEN** the migration MUST fail before destructive schema changes are applied

#### Scenario: Unique legacy receipts allow the migration
- **WHEN** all legacy receipt rows normalize to unique physical receipt identities within their tenant, branch, and receipt week scope
- **THEN** the migration MUST continue

### Requirement: Replay only prior migrations in upgrade verification
The system MUST execute upgrade verification by applying only migrations that precede the migration under test.

#### Scenario: Later migrations are excluded from upgrade replay
- **WHEN** the upgrade test runs for a target migration
- **THEN** the harness MUST stop copying migrations once it reaches the target migration

#### Scenario: Target migration is validated against the intended predecessor set
- **WHEN** the target migration is applied during upgrade verification
- **THEN** only the earlier migrations that define the pre-upgrade schema state MUST be present
- **AND THEN** the target migration MUST be exercised against that state
