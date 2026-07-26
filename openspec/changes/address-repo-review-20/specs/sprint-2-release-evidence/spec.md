## ADDED Requirements

### Requirement: Sprint 2 closure requires visible CI evidence
Sprint 2 SHALL NOT be marked formally closed until visible CI evidence exists for the target commit.

#### Scenario: CI evidence is recorded
- **WHEN** the Sprint 2 closeout commit has green CI
- **THEN** release documentation records the commit SHA, workflow run, static job, E2E job, integration job, OpenAPI generation result, and build confirmation

### Requirement: Migration tracker reflects remote verification status
The migration tracker SHALL distinguish local migration verification from CI or remote verification and SHALL be updated when visible evidence is obtained.

#### Scenario: Latest migrations are verified in CI
- **WHEN** the CI workflow verifies the latest migrations
- **THEN** the migration tracker records the workflow evidence and no longer describes those migrations as awaiting visible CI evidence

### Requirement: Issue closure depends on evidence
Issue #1 SHALL remain open until the required Sprint 2 exit-gate evidence is recorded.

#### Scenario: Evidence is incomplete
- **WHEN** any required CI or migration evidence is missing
- **THEN** Issue #1 remains open or blocked rather than being closed as complete
