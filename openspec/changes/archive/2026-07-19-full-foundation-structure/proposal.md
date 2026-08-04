## Why

The repository already has the beginnings of a modular NestJS foundation, but the documentation layer is still thin and does not yet mirror the TRD's required architecture, API, runbook, and development layout. That creates drift risk: the code can stay modular while the supporting docs silently regress into ad hoc notes.

## What Changes

- Create a modular documentation structure under `docs/` that matches the TRD categories: architecture, api, adr, runbooks, development, and database.
- Keep the repository organized around feature modules and shared infrastructure boundaries instead of a flat controller/service layout.
- Preserve the migration tracker as the authoritative local record for schema changes, backup checks, and applied migrations.
- Strengthen repo instructions so future work continues to favor the modular monolith shape and the TRD's source-of-truth hierarchy.

## Capabilities

### New Capabilities

- `foundation-documentation`: repository documentation structure, standards, and maintenance rules that mirror the TRD and stay beside the code.

### Modified Capabilities

-

## Impact

- Docs: `docs/architecture/`, `docs/api/`, `docs/runbooks/`, `docs/development/`, `docs/adr/`, and `docs/database/`.
- Repo guidance: `AGENTS.md` and `README.md`.
- Developer workflow: clearer commands and maintenance expectations for module boundaries, schema changes, and documentation updates.
