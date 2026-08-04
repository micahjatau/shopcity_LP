# sprint-2-closure-evidence Specification

## Purpose

TBD - created by archiving change sprint-2-credit-lot-lifecycle-closure. Update Purpose after archive.

## Requirements

### Requirement: Current-head Sprint 2 closure evidence

The system SHALL record visible current-head verification evidence before Sprint 2 is declared closed.

#### Scenario: Acceptance evidence recorded

- **WHEN** the lifecycle closure change is complete
- **THEN** the migration tracker and Sprint 2 issue evidence MUST record the commit SHA, date, and command or workflow references for the required verification suite

#### Scenario: Required checks covered

- **WHEN** Sprint 2 closure evidence is recorded
- **THEN** the evidence MUST cover migration deployment, integration tests for financial integrity, unit tests for retry mapping, OpenAPI generation/lint/diff, lint, build/typecheck, and any repo-required CI gates

#### Scenario: Missing evidence blocks closure

- **WHEN** current-head local or remote CI evidence is missing
- **THEN** Sprint 2 MUST remain open or explicitly document that closure is deferred

### Requirement: Sprint 2 issue reconciliation

The system SHALL reconcile the Sprint 2 issue checklist with the implemented closure state before closing the issue.

#### Scenario: Checklist updated

- **WHEN** the closure change has passing evidence
- **THEN** the Sprint 2 issue checklist MUST mark completed items, identify any deferred follow-ups, include final migration names, and reference CI or command evidence

#### Scenario: Issue remains open until blockers are resolved

- **WHEN** credit-lot lifecycle guards, retry classifier narrowing, OpenAPI error examples, or CI evidence are incomplete
- **THEN** the Sprint 2 issue MUST remain open
