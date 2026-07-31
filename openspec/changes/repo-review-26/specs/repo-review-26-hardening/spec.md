## ADDED Requirements

### Requirement: Sprint 3B hardening gate stays blocked until evidence is current
The project MUST keep the Sprint 3B hardening gate incomplete until current-head evidence confirms the generated client, CI checks, and migration history are aligned with the committed contract.

#### Scenario: Required evidence is missing
- **WHEN** the generated client has not been regenerated and typechecked, or the current-head release evidence is absent
- **THEN** the hardening gate remains blocked for reversal work and manual-adjustment expansion

#### Scenario: Required evidence is recorded
- **WHEN** the generated client is clean, the required release checks pass, and the migration evidence is recorded
- **THEN** the hardening gate may be marked ready for the next approved release step

### Requirement: Release evidence is tracked truthfully
The project MUST record current-head evidence for the remaining release checks instead of marking those checks complete by intent.

#### Scenario: Evidence is incomplete
- **WHEN** any required current-head check fails or is not recorded
- **THEN** the tracker remains open or blocked

#### Scenario: Evidence is complete
- **WHEN** all required current-head checks pass
- **THEN** the tracker records the commit SHA and the completed evidence
