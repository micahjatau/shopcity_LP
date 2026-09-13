## ADDED Requirements

### Requirement: Report performance tests require a real branch fixture

The k6 report-isolation scenario MUST require and validate an existing `K6_REPORT_BRANCH_ID` before measuring report latency.

#### Scenario: Report fixture is valid

- **GIVEN** an authenticated k6 session and an existing configured branch
- **WHEN** setup completes
- **THEN** the report-isolation scenario runs against that branch
- **AND** its latency metrics represent valid report requests

#### Scenario: Report fixture is missing or invalid

- **GIVEN** no configured branch or a branch that does not exist or is inaccessible
- **WHEN** k6 setup runs
- **THEN** setup fails before scenario execution with an actionable configuration error
- **AND** the run is not reported as valid performance evidence
