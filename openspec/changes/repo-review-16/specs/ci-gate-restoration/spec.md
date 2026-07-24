## ADDED Requirements

### Requirement: Static verification runs before release gates
The CI pipeline MUST run formatting checks, ESLint, and full TypeScript typechecking on the main verification path before release gates can be reported as successful.

#### Scenario: formatting drift blocks CI
- **WHEN** a protected head contains formatting drift
- **THEN** the CI pipeline MUST fail before release checks are marked successful

#### Scenario: test source type errors block CI
- **WHEN** typechecking finds an error in application, test, or support TypeScript sources
- **THEN** the CI pipeline MUST fail even if build output succeeds

### Requirement: Release gates remain visible after static checks
The CI pipeline MUST continue to run the existing release gates after static verification, including build, Prisma generation and validation, OpenAPI generation and linting, unit tests, end-to-end tests, integration tests, and GitNexus analysis.

#### Scenario: a later gate still fails the pipeline
- **WHEN** static verification passes but a later release gate fails
- **THEN** the CI pipeline MUST fail at that gate and not report the head as release-ready
