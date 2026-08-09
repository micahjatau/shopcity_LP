## ADDED Requirements

### Requirement: Sprint 3A hardening gates block new financial feature work

The project MUST treat Sprint 3A hardening gates as required before starting real reversal execution or expanded manual adjustment development.

#### Scenario: Hardening gate remains incomplete

- **WHEN** any Sprint 3A exit gate is not verified against current runtime code, database constraints, API contracts, tests, and release evidence
- **THEN** reversal execution and manual adjustment expansion remain out of scope

#### Scenario: Hardening gate is complete

- **WHEN** all Sprint 3A exit gates are verified and recorded
- **THEN** Sprint 3 redemption and approval work can be marked complete and subsequent financial feature work may proceed

### Requirement: Sprint task trackers reflect verified completion

The project MUST mark Sprint 3 tasks complete only when the runtime implementation, database enforcement, tests, API contract, and release evidence support that status.

#### Scenario: Checked task lacks implementation evidence

- **WHEN** a checked Sprint 3 task is contradicted by runtime behavior, tests, migrations, OpenAPI, or release evidence
- **THEN** the task is reopened or split into complete and remaining subtasks

#### Scenario: Migration evidence is partial

- **WHEN** a migration has only local verification evidence
- **THEN** shared deployment, CI verification, and backup/restore or forward-fix rehearsal remain separate incomplete tasks

### Requirement: Release evidence is current-head based

The project MUST record release evidence from the current head before declaring Sprint 3A complete.

#### Scenario: Current-head checks are missing

- **WHEN** static checks, unit tests, e2e tests, integration tests, OpenAPI checks, architecture checks, staging migration, smoke tests, or SMS-provider verification are missing for the current head
- **THEN** the Sprint 3A release gate remains incomplete

#### Scenario: Current-head checks pass

- **WHEN** all required current-head checks pass and evidence is recorded
- **THEN** the release evidence gate is satisfied

### Requirement: Financial tests use deterministic time

Financial tests MUST use deterministic clock control for receipt week derivation, lot expiry, approval expiry, transaction timestamps, and retry response timestamps where relevant.

#### Scenario: Financial test needs current time

- **WHEN** a financial unit, HTTP, e2e, or integration test depends on the current time
- **THEN** the test uses an injected or fixed clock instead of uncontrolled wall-clock time
