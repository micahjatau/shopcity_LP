## Context

The repository currently has the right runtime direction for the TRD foundation, but its documentation footprint is incomplete and only partially reflects the intended modular monolith shape. The TRD expects architecture, API, runbook, development, and database documentation to live beside the code, not as an afterthought.

The current codebase already uses feature modules and shared infrastructure folders under `src/`, which is the right long-term shape for a scalable monolith. The missing piece is a documentation system that preserves that modularity instead of drifting into generic root-level notes.

## Goals / Non-Goals

**Goals:**
- Keep the repository modular and scalable in the TRD sense.
- Make the docs tree mirror the TRD's major concern areas.
- Preserve a small number of stable entry documents (`README.md`, `AGENTS.md`, migration tracker) that point to deeper docs.
- Keep migration and backup discipline explicit and local to the repo.

**Non-Goals:**
- Splitting the repository into `apps/` and `packages/` immediately.
- Adding product-specific feature documentation beyond the foundation set.
- Rewriting the runtime architecture or introducing new business behavior.

## Decisions

### 1. Keep the codebase as a modular monolith in one repo for now
The repo should retain the current root Nest application and feature-module layout instead of being prematurely split into multiple workspaces.

Alternatives considered:
- Move immediately to `apps/api` and `apps/worker`
- Keep a flat controller/service structure

Why this choice:
- The TRD explicitly favors a modular monolith for the MVP.
- The existing module boundaries already support future extraction.
- A premature workspace split would add complexity before the domain boundaries are fully earned.

### 2. Mirror the TRD documentation categories under `docs/`
The documentation tree should be organized by concern area: architecture, API, ADRs, runbooks, development, and database.

Alternatives considered:
- Keep one large `docs/README.md`
- Scatter notes near the code without a structured docs tree

Why this choice:
- The TRD names concrete documentation locations.
- Separate docs by concern area make ownership and review clearer.
- A structured tree reduces drift and makes the repo navigable for future contributors.

### 3. Treat `AGENTS.md` and `README.md` as entrypoint documents
These files should stay concise and point readers to the deeper docs instead of duplicating all content.

Alternatives considered:
- Move all guidance into `README.md`
- Encode repo guidance only in OpenSpec artifacts

Why this choice:
- `AGENTS.md` is the operating guide for future agents.
- `README.md` is the human-facing entrypoint.
- Keeping both short forces the deeper docs to carry the durable detail.

### 4. Keep the migration tracker as the local audit trail
The database migration tracker stays in `docs/database/migration-tracker.md` and is updated alongside schema work and restore checks.

Alternatives considered:
- Track migration notes only in commit messages
- Leave backup/restore evidence outside the repo

Why this choice:
- The TRD requires a local tracker.
- Schema and backup history need to be easy to review in one place.

## Risks / Trade-offs

- [Docs drift] → Mitigate by keeping `AGENTS.md` and `README.md` small and updating them whenever the foundation changes.
- [Over-documentation] → Mitigate by writing only the docs the TRD calls for and keeping each file focused on one concern.
- [Premature workspace split] → Mitigate by preserving module boundaries in the current repo until the domain and team shape justify `apps/` and `packages/`.
- [Tracker neglect] → Mitigate by requiring tracker updates for schema/migration work before implementation completes.

## Migration Plan

1. Add the missing documentation directories and seed files.
2. Write the architecture, API, runbook, development, ADR, and database docs.
3. Keep `README.md` and `AGENTS.md` aligned with the new docs tree.
4. Maintain the migration tracker for every schema or restore-related change.
5. Preserve the current modular module layout while the docs are added.

## Open Questions

- Which docs should be drafted first: architecture overview or API conventions?
- Do we want a future monorepo split into `apps/` and `packages/`, or keep the single-repo modular monolith until a concrete extraction need appears?
