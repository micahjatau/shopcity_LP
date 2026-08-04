## ADDED Requirements

### Requirement: Typed integration harness

The repository SHALL use typed application bootstrap and auth mocks in integration tests, and SHALL NOT rely on `require()` or `any`-typed access to the app or Supabase client in the failing harness paths.

#### Scenario: Lint verifies the harness is typed

- **WHEN** ESLint runs against the integration specs
- **THEN** the harness code does not produce unsafe-access or unsafe-call errors

#### Scenario: Bootstrap is imported statically

- **WHEN** an integration spec starts the app
- **THEN** it imports the bootstrap entrypoint through the module system instead of using runtime `require()`

### Requirement: Deterministic integration teardown

The repository SHALL ensure integration tests close their Nest application, database client, and external test resources deterministically so Jest can finish without hanging.

#### Scenario: Suite shutdown completes

- **WHEN** the integration suite finishes
- **THEN** the app and external test containers are closed before Jest exits

#### Scenario: Bootstrap setup does not block completion

- **WHEN** the integration suite seeds the database and starts the app
- **THEN** the suite completes without lingering open handles after the tests run

### Requirement: Validation commands stay green

The repository SHALL keep the primary CI validation commands passing for the affected change set.

#### Scenario: Typecheck passes

- **WHEN** `npm run typecheck` runs
- **THEN** it exits successfully

#### Scenario: Lint passes

- **WHEN** `npm run lint` runs
- **THEN** it exits successfully

#### Scenario: Integration tests complete

- **WHEN** `npm run test:integration` runs
- **THEN** the suite completes successfully
