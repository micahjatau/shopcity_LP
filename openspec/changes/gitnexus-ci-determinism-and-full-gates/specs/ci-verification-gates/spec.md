## ADDED Requirements

### Requirement: Deterministic GitNexus verification
The CI workflow SHALL run GitNexus through a deterministic, repository-controlled execution path and SHALL fail the GitNexus job when analysis or smoke execution fails, unless an explicit repository-level bypass is enabled.

#### Scenario: GitNexus analysis fails in CI
- **WHEN** the GitNexus analysis command exits non-zero on a clean GitHub Actions runner
- **THEN** the GitNexus job SHALL fail unless the explicit bypass setting is enabled

#### Scenario: GitNexus runs without a local wrapper
- **WHEN** the repository-owned GitNexus runner is absent in CI
- **THEN** the workflow SHALL still invoke GitNexus through a controlled repository command path

### Requirement: Full release gate coverage
The CI workflow SHALL execute the repository's core release gates: build, Prisma generation, Prisma validation, architecture checks, unit tests, end-to-end tests, OpenAPI linting, OpenAPI diffing, generated-file cleanliness, GitNexus analysis, and integration tests.

#### Scenario: Push or pull request triggers CI
- **WHEN** the CI workflow runs for a push or pull request
- **THEN** it SHALL run the full release gate set before reporting success

#### Scenario: Generated artifacts drift
- **WHEN** generated repository artifacts differ from the committed copies
- **THEN** the workflow SHALL fail the release gate run

### Requirement: Redis-backed integration tests are runnable in CI
The integration test environment SHALL have a working Redis server available so Redis-backed integration suites can start and complete in GitHub Actions.

#### Scenario: Integration tests start in CI
- **WHEN** the integration test job starts on GitHub Actions
- **THEN** the Redis-backed test environment SHALL be able to connect to a running Redis server
