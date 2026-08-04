## ADDED Requirements

### Requirement: TRD-aligned documentation tree

The repository MUST contain a documentation tree that mirrors the TRD's core subject areas and keeps foundational guidance beside the code.

#### Scenario: Required documentation areas exist

- **WHEN** a contributor inspects the repository root
- **THEN** `docs/architecture/`, `docs/api/`, `docs/adr/`, `docs/runbooks/`, `docs/development/`, and `docs/database/` are present or intentionally initialized with tracked placeholder files

#### Scenario: Documentation stays discoverable from the root

- **WHEN** a contributor opens `README.md`
- **THEN** the README explains where the architecture, API, runbook, development, ADR, and database docs live

### Requirement: Modular backend boundary layout

The repository MUST keep backend code organized by feature modules and shared infrastructure boundaries so that new capabilities can grow without collapsing into a flat controller/service structure.

#### Scenario: Feature code lands in a module slice

- **WHEN** a new domain capability is added
- **THEN** its code is placed under `src/modules/<capability>/` rather than alongside unrelated application code

#### Scenario: Shared code stays in shared folders

- **WHEN** a piece of logic is used across multiple modules
- **THEN** it is placed under `src/common/`, `src/config/`, `src/database/`, or `src/jobs/` instead of being duplicated inside a feature module

#### Scenario: Infrastructure access is centralized

- **WHEN** application code needs database or auth access
- **THEN** it goes through the dedicated infrastructure entrypoints such as `src/database/` and `src/supabase/`

### Requirement: Documentation and tracker sync rules

The repository MUST keep `AGENTS.md`, `README.md`, and `docs/database/migration-tracker.md` synchronized with the current foundation state.

#### Scenario: Sprint documentation is refreshed

- **WHEN** a sprint or foundation phase completes
- **THEN** `AGENTS.md` and `README.md` are updated to reflect the current commands, layout, and source-of-truth docs

#### Scenario: Schema changes update the migration tracker

- **WHEN** a schema change or migration is introduced
- **THEN** `docs/database/migration-tracker.md` records the change, migration status, and backup/restore check result

#### Scenario: Destructive migration changes remain documented

- **WHEN** a migration would remove or rewrite existing data
- **THEN** the change is documented with an explicit backup and data migration plan before implementation proceeds
