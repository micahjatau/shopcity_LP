## ADDED Requirements

### Requirement: Repository validation covers all tracked release-critical files
The system SHALL configure linting, formatting, contract checks, and CI validation so new tests, docs, OpenSpec artifacts, API contracts, and SQL runbooks cannot be added outside validation scope.

#### Scenario: New test file is linted automatically
- **WHEN** a new tracked `test/**/*.ts` file is added
- **THEN** repository lint or test-lint validation MUST include it without requiring manual enumeration in `package.json`.

#### Scenario: New docs or OpenSpec artifact is formatted automatically
- **WHEN** a new tracked file is added under `docs/**/*` or `openspec/**/*`
- **THEN** formatting validation MUST include it.

### Requirement: Operational SQL is validated
The system SHALL lint operational SQL or verify it through parse/execution tests suitable for the runbook context.

#### Scenario: SQL runbook syntax regresses
- **WHEN** a tracked operational SQL file has invalid syntax for its target database context
- **THEN** repository validation MUST fail before release.

### Requirement: CI detects validation-scope gaps
The system SHALL provide a CI check that fails when tracked source, docs, contracts, generated artifacts, or operational files are outside declared validation scope.

#### Scenario: Uncovered tracked file is introduced
- **WHEN** a release-critical tracked file path is not covered by any validation rule
- **THEN** CI MUST fail with a report identifying the uncovered path.
