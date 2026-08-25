## ADDED Requirements

### Requirement: Sprint 4 release evidence names one certified SHA

The system SHALL identify one immutable Sprint 4 release-candidate SHA and use that exact SHA across release evidence, trackers, and CI certification.

#### Scenario: Placeholder evidence is replaced by an immutable SHA

- **GIVEN** Sprint 4 closure implementation is complete
- **WHEN** final release evidence is prepared
- **THEN** `_pending final commit and CI run_` is replaced with the exact commit SHA being certified

### Requirement: Sprint 4 release evidence records green GitHub CI on the same SHA

The system SHALL record the GitHub Actions run URL and required green gates for the same SHA named in the evidence document.

#### Scenario: GitHub CI and evidence refer to the same commit

- **GIVEN** the final Sprint 4 candidate SHA has been pushed
- **WHEN** Static Checks, Integration Tests, End-to-End Tests, and GitNexus complete successfully
- **THEN** the evidence document records the GitHub Actions run URL
- **AND** the recorded SHA matches the SHA that passed CI

### Requirement: Remaining Review 44 work is clearly identified as certification-only

The system SHALL keep Sprint 4 trackers aligned so unresolved items are limited to certification/evidence tasks, not reopened feature work.

#### Scenario: Tracker notes distinguish engineering closure from certification closure

- **GIVEN** Review 44 marks Sprint 4 as an engineering pass
- **WHEN** tracker notes are updated
- **THEN** the remaining open items are clearly labeled as release-certification or evidence polish only
