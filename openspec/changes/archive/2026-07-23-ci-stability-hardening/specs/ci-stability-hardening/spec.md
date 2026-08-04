## ADDED Requirements

### Requirement: GitNexus runs through a reproducible repository-owned entrypoint

The system MUST provide a repository-owned command path for GitNexus analysis that works in a clean CI environment after `npm ci` without assuming a globally installed `gitnexus` binary.

#### Scenario: clean CI can run the analysis step

- **WHEN** a clean runner installs dependencies with `npm ci`
- **THEN** the GitNexus analysis command MUST succeed using the repository-owned entrypoint

#### Scenario: ambient binaries are not required

- **WHEN** CI executes the GitNexus step
- **THEN** it MUST not depend on a globally installed `gitnexus`

### Requirement: Fast verification fails before slow jobs

The system MUST provide a fast verification gate that runs format, lint, and typecheck before slower integration checks and MUST fail the pipeline as soon as one of those checks fails.

#### Scenario: a static check fails

- **WHEN** format, lint, or typecheck fails
- **THEN** the fast verification gate MUST fail
- **AND THEN** slower integration checks MUST not begin

#### Scenario: the fast gate passes

- **WHEN** format, lint, and typecheck all pass
- **THEN** the workflow MAY continue to slower jobs

### Requirement: Superseded CI runs are canceled

The system MUST cancel in-progress CI runs that are superseded by a newer push or pull request update on the same branch.

#### Scenario: a new commit replaces an older run

- **WHEN** a newer commit is pushed to the same branch while an older run is active
- **THEN** the older run MUST be canceled

### Requirement: Lint commands are documented accurately

The repository guidance MUST describe `npm run lint` as a check-only command and `npm run lint:fix` as the command that applies automatic fixes.

#### Scenario: developer guidance is consistent

- **WHEN** a developer reads the repository guidance for lint commands
- **THEN** the docs MUST not claim that `npm run lint` applies fixes
- **AND THEN** the docs MUST identify `npm run lint:fix` as the fixer command
