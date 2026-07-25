## ADDED Requirements

### Requirement: Lockfile-backed GitNexus CI
The system SHALL execute GitNexus in CI through repository-managed dependencies rather than runtime package installation.

#### Scenario: GitNexus CI runs
- **WHEN** the GitNexus workflow job runs in GitHub Actions
- **THEN** it MUST install dependencies from the repository lockfile and invoke the repository-installed GitNexus binary or hardened repository wrapper

#### Scenario: Runtime package execution is absent
- **WHEN** the CI workflow is inspected
- **THEN** it MUST NOT use `pnpm dlx`, `npx` without repository resolution, or any other runtime registry installation path for GitNexus execution

#### Scenario: Package manager is pinned
- **WHEN** CI enables package-manager tooling such as Corepack or pnpm
- **THEN** the package manager version MUST be pinned or otherwise governed by repository configuration

### Requirement: Current-head release evidence
The system SHALL not describe Sprint 2 release verification or migration verification as complete until visible current-head CI evidence exists.

#### Scenario: CI evidence is pending
- **WHEN** no visible current-head successful workflow run is available
- **THEN** repository documentation and migration tracking MUST state that verification is implemented but current-head evidence is pending

#### Scenario: CI evidence is available
- **WHEN** static, GitNexus, end-to-end, and integration jobs pass for the current head
- **THEN** repository documentation MAY record the head identifier, workflow evidence, and migration verification as complete for that run

### Requirement: Migration tracker accuracy
The system SHALL keep `docs/database/migration-tracker.md` accurate for schema changes, backup/restore checks, and applied migration evidence.

#### Scenario: Migration has not been visibly run
- **WHEN** a migration or migration chain lacks visible successful current-head deploy evidence
- **THEN** the migration tracker MUST NOT mark that migration as fully verified

#### Scenario: Full migration chain is verified
- **WHEN** the complete migration chain is deployed successfully from a fresh database in current-head CI or an equivalent recorded command chain
- **THEN** the migration tracker MUST record the verification command, date, and evidence reference
