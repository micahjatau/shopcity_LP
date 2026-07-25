## ADDED Requirements

### Requirement: Sprint 2 acceptance evidence
The system SHALL record visible current-head evidence before Sprint 2 is declared closed.

#### Scenario: Acceptance suite passes
- **WHEN** Sprint 2 closure is proposed
- **THEN** formatting, lint, typecheck, architecture, unit, e2e, integration, migration deployment, OpenAPI generation/lint/diff, app build, and worker build checks MUST pass for the current head

#### Scenario: Evidence recorded
- **WHEN** the acceptance suite passes
- **THEN** the migration tracker and Sprint 2 issue evidence MUST record the commit SHA, workflow/run or command reference, date, and relevant artifact references

#### Scenario: Evidence missing
- **WHEN** no visible current-head acceptance evidence exists
- **THEN** Sprint 2 MUST NOT be marked formally closed

### Requirement: Migration tracker accuracy
The system SHALL keep migration verification claims aligned with actual current-head evidence.

#### Scenario: New closure migration tracked
- **WHEN** the financial integrity closure migration is added
- **THEN** `docs/database/migration-tracker.md` MUST include the migration name, verification command or workflow reference, and backup/restore status

#### Scenario: Pending evidence remains pending
- **WHEN** a migration has verification code but no visible current-head run evidence
- **THEN** the tracker MUST state that evidence is pending rather than verified

### Requirement: Sprint 2 issue reconciliation
The system SHALL reconcile the Sprint 2 issue checklist before closing the sprint.

#### Scenario: Checklist updated
- **WHEN** the closure change is complete
- **THEN** the Sprint 2 issue checklist MUST distinguish completed items, deferred follow-ups, final migration names, CI evidence, OpenAPI artifacts, and the exit-gate decision

#### Scenario: Closure blocked by missing evidence
- **WHEN** checklist evidence or current-head CI evidence is missing
- **THEN** the issue MUST remain open or clearly state why closure is deferred
