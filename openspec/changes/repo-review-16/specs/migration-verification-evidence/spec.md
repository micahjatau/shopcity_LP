## ADDED Requirements

### Requirement: Migration verification requires visible evidence
The migration tracker MUST only mark a migration as verified after a visible successful clean-database migration run has been recorded for the current head.

#### Scenario: unverified migrations stay unverified
- **WHEN** there is no visible successful clean-database migration run for the current head
- **THEN** the migration tracker MUST keep the migration in a not-run or unverified state

#### Scenario: successful migration evidence updates the tracker
- **WHEN** a clean-database migration run completes successfully and is visible in the verification record
- **THEN** the migration tracker MUST update the migration to verified

### Requirement: Verification records identify the executed chain
The verification evidence MUST identify the migration command or chain that was executed so the result can be audited later.

#### Scenario: the tracker records the executed migration chain
- **WHEN** a migration is verified
- **THEN** the evidence MUST include the executed migration path or command chain used for that verification
