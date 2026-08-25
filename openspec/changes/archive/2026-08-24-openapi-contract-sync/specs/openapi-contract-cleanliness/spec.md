## ADDED Requirements

### Requirement: Committed OpenAPI output matches the generated contract

The repository MUST keep `docs/api/openapi.json` synchronized with the output of the OpenAPI export command used in CI.

#### Scenario: a regenerated contract matches the committed file

- **WHEN** the OpenAPI export command is run against the current source tree
- **THEN** the committed `docs/api/openapi.json` MUST match the generated output exactly

#### Scenario: API changes require a regenerated artifact

- **WHEN** controller schemas or envelope definitions change the generated OpenAPI document
- **THEN** the committed `docs/api/openapi.json` MUST be regenerated before the change is merged

### Requirement: OpenAPI drift fails CI

The CI workflow MUST fail when the generated OpenAPI document differs from the committed `docs/api/openapi.json`.

#### Scenario: stale committed OpenAPI data blocks the pipeline

- **WHEN** the generated OpenAPI document differs from the committed artifact
- **THEN** CI MUST fail on the cleanliness check

#### Scenario: a clean OpenAPI artifact passes the pipeline

- **WHEN** the generated OpenAPI document matches the committed artifact
- **THEN** the cleanliness check MUST pass
