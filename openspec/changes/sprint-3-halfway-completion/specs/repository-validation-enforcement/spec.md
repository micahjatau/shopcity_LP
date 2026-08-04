# repository-validation-enforcement Specification

## ADDED Requirements

### Requirement: Validation scope is based on release-critical files

The system MUST maintain a release-critical file universe that is independent from the validator mapping used to cover those files.

#### Scenario: New critical file is added

- **WHEN** a new critical file path is introduced without a validator rule
- **THEN** the validation-scope check reports the file as uncovered

### Requirement: Validation-scope rules verify real commands and jobs

The system MUST verify that every referenced package script exists and that every mandatory release command appears in a non-optional CI job.

#### Scenario: Package script is missing

- **WHEN** a coverage rule references a script name that does not exist in `package.json`
- **THEN** the validation-scope check fails with a missing-command report

#### Scenario: CI omits a mandatory release command

- **WHEN** a mandatory release command is absent from all required CI jobs
- **THEN** the validation-scope check fails

### Requirement: Negative regression coverage protects the gate

The system MUST include failing tests for uncovered critical paths, missing commands, and optionalized mandatory jobs.

#### Scenario: Required CI step is optionalized

- **WHEN** a required workflow step is marked `continue-on-error: true`
- **THEN** the regression test fails
