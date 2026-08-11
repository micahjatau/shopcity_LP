## ADDED Requirements

### Requirement: OpenAPI, client, Bruno, and OpenSpec artifacts match runtime behavior

The system SHALL keep OpenAPI, generated client, Bruno collections, and OpenSpec artifacts aligned with the runtime behavior validated by the final-gate change.

#### Scenario: Contract artifacts are regenerated after behavior changes

- **WHEN** runtime behavior changes in a way that affects request or response surfaces
- **THEN** the corresponding OpenAPI, generated client, Bruno, and OpenSpec artifacts are updated to match the runtime

### Requirement: Final release validation covers the full gate set

The change SHALL not be considered complete until the final immutable SHA passes fresh migration, upgrade migration, unit, integration, HTTP/E2E, lint, typecheck, architecture, and build validation.

#### Scenario: Final SHA is promoted only after all gates pass

- **WHEN** the release candidate is evaluated for promotion
- **THEN** all required validation gates are green on the same immutable SHA before the change is closed
