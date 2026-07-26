## Purpose

Ensure production API and worker startup commands match built artifacts and are smoke-tested in verification gates.

## Requirements

### Requirement: Production entrypoints match build artifacts
The system SHALL start the production API and worker from JavaScript artifacts that are produced by the configured build.

#### Scenario: Production scripts use emitted files
- **WHEN** the application is built with the production build command
- **THEN** the configured API and worker production start scripts reference existing files in `dist/`

### Requirement: Build smoke checks verify API and worker artifacts
CI SHALL verify the production API and worker entrypoint artifacts immediately after build.

#### Scenario: Missing worker artifact fails verification
- **WHEN** the worker entrypoint artifact is absent after build
- **THEN** the verification job fails before release evidence can be recorded

#### Scenario: Worker help smoke succeeds
- **WHEN** the worker artifact exists after build
- **THEN** the verification job can execute the worker help or dry-run path without starting a long-running production worker
