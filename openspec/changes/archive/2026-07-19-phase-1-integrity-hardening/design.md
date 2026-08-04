## Context

Phase 1 already ships real backend modules for auth, users, branches, customers, cards, audit, configuration, health, and a Prisma-backed data model. The remaining problem is not feature count; it is consistency and deployability. The codebase has policy defaults that are easy to misread, a schema without a migration trail, auth/session behavior that is coherent enough to work but not clean enough to trust, and tests that do not always prove the boundary they claim to prove.

## Goals / Non-Goals

**Goals:**

- Align money policy defaults, sample env values, and runtime public config.
- Make the Prisma schema deployable and seedable.
- Make browser auth, CSRF, and session renewal internally consistent and safer to expose.
- Raise OpenAPI fidelity so clients can rely on the contract.
- Turn the most important Phase 1 checks into real integration coverage.
- Enforce core domain invariants and audit traceability.
- Restore the repo’s baseline CI quality gates.

**Non-Goals:**

- Build the loyalty ledger, receipt engine, or earnings/redemption workflow.
- Re-architect the backend into services or split the monolith.
- Introduce new public product areas beyond the Phase 1 integrity layer.

## Decisions

- Keep the work as a single cross-cutting hardening change instead of splitting into isolated micro-features.
  - Rationale: the review findings are coupled; policy, auth, contracts, and tests all affect one another.
  - Alternatives considered: separate fixes by area, but that would leave the repo in a half-hardened state for too long.

- Treat the financial defaults as the source of truth that must match env samples and public config.
  - Rationale: this avoids the current mismatch where the code, docs, and public values can drift apart.
  - Alternatives considered: derive everything from the public config endpoint only, but that still leaves seed and deployment drift.

- Make deployability a first-class requirement: migration plus tracker plus seed path.
  - Rationale: the schema already exists, but it is not reproducible without migrations.
  - Alternatives considered: delay migration work until later, but that would block any trustworthy deployment.

- Keep browser auth as an opaque server-owned session model, and remove ambiguity around refresh semantics.
  - Rationale: the current system already behaves like session rotation; the hardening pass should make that explicit rather than pretending to support a more complex token family.
  - Alternatives considered: full refresh-token family with replay detection, but that is more scope than this integrity pass needs.

- Improve OpenAPI via DTO metadata and envelope documentation rather than introducing a new contract toolchain.
  - Rationale: the repo already uses Nest Swagger; the fastest durable improvement is to annotate the existing DTOs and responses.
  - Alternatives considered: generating a separate typed contract source of truth, but that would add a new workflow before the current one is stable.

- Make the integration tests prove the boundary they name.
  - Rationale: mocked service tests are useful, but they do not prove Prisma, HTTP, or migration behavior.
  - Alternatives considered: keep the current mocked tests and rename them, but the user asked to fix the issues, not relabel them.

## Risks / Trade-offs

- [Risk] Broad scope can create a long implementation tail. → Mitigation: sequence the work from policy to deployability to auth to contract to tests to CI.
- [Risk] Tightening invariants may break assumptions in the current API clients. → Mitigation: keep the contract explicit and cover the changed behavior with tests.
- [Risk] A stricter auth/session model may require client updates. → Mitigation: preserve the browser session shape while removing misleading behavior.
- [Risk] OpenAPI fidelity work can balloon if every DTO is annotated at once. → Mitigation: start with the public Phase 1 endpoints and expand consistently.

## Migration Plan

1. Correct policy defaults and sample env values so runtime behavior is unambiguous.
2. Add the Prisma migration and seed path, then record the migration in the tracker.
3. Tighten auth/session/CSRF behavior and align the public auth response shape.
4. Annotate the public DTOs and response envelopes so OpenAPI matches the runtime API.
5. Replace mocked integration coverage with real persistence-backed tests for the core flows.
6. Enforce the remaining domain invariants and audit traceability.
7. Restore the baseline CI gates and verify the full change end to end.

Rollback strategy: keep each step additive where possible, prefer expand-and-contract changes, and avoid destructive schema edits unless a seed/restore plan exists.

## Open Questions

- Should session renewal remain active-session rotation only, or should a true refresh-token family be introduced later?
- Should tenant/branch public identifiers come from seeded database records or from dedicated environment variables?
- Which Phase 1 endpoints need full DTO annotation first, and which can remain object-shaped until a later contract pass?
