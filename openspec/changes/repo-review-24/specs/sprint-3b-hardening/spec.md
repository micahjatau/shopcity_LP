## ADDED Requirements

### Requirement: Sprint 3B hardening gates block feature expansion

The project MUST treat Sprint 3B hardening gates as required before starting reversal execution or expanded manual adjustment development.

#### Scenario: Hardening gate remains incomplete

- **WHEN** any Sprint 3B exit gate is not verified against current runtime code, database constraints, API contracts, tests, and release evidence
- **THEN** reversal execution and manual adjustment expansion remain out of scope

#### Scenario: Hardening gate is complete

- **WHEN** all Sprint 3B exit gates are verified and recorded
- **THEN** the project may proceed with the next approved Sprint 3 financial work

### Requirement: Sprint 3B release evidence is current-head based

The project MUST record current-head evidence for the remaining Sprint 3 release gates before the hardening pass is considered complete.

#### Scenario: Current-head evidence is missing

- **WHEN** required HTTP, SMS, migration, CI, or smoke evidence is missing for current head
- **THEN** the hardening gate remains incomplete

#### Scenario: Current-head evidence is recorded

- **WHEN** all required current-head checks pass and the evidence is recorded
- **THEN** the Sprint 3B release gate is satisfied
