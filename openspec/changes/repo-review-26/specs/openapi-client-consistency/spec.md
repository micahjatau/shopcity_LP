## ADDED Requirements

### Requirement: Generated client matches the committed OpenAPI contract

The system MUST regenerate the TypeScript client from the committed OpenAPI document and MUST keep the checked-in client clean relative to that generation.

#### Scenario: OpenAPI contract changes

- **WHEN** the OpenAPI document changes
- **THEN** the regenerated client matches the committed output or CI reports drift

#### Scenario: Client typecheck fails

- **WHEN** the regenerated client no longer typechecks against its consumers
- **THEN** the release gate fails

### Requirement: Client generation is enforced in CI

The system MUST run client generation and cleanliness checks in CI for the affected contract surface.

#### Scenario: Generated output differs

- **WHEN** running client generation produces a diff in the checked-in client artifact
- **THEN** CI fails before release evidence can be recorded

#### Scenario: Client output is clean

- **WHEN** client generation produces no diff and typechecking passes
- **THEN** the contract artifact is considered aligned for that commit
