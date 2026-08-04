## Context

The current codebase already has a backend session model, CSRF cookies, a health controller, migration artifacts, and seed data. The remaining gap is coherence: auth behavior is split across service and guard logic, the HTTP boundary is not covered end to end, and the bootstrap path is not explicit enough to reliably reproduce a working foundation environment.

## Goals / Non-Goals

**Goals:**

- Make session authentication and rotation behavior explicit and stable.
- Ensure bootstrap steps produce a working baseline environment consistently.
- Add HTTP-level coverage for the auth boundary and readiness behavior.

**Non-Goals:**

- Reworking the overall ledger domain.
- Introducing new auth providers or external identity flows.
- Designing a new deployment pipeline.

## Decisions

- Keep session ownership in the backend and continue using hashed session tokens.
  - Rationale: this preserves current security posture and avoids widening the trust boundary.
  - Alternative considered: delegating session state to Supabase. Rejected because the app already owns session/RBAC behavior.

- Treat refresh as a revoke-and-reissue operation.
  - Rationale: simple, auditable, and consistent with append-only session history.
  - Alternative considered: in-place token rotation. Rejected because it complicates invalidation and auditability.

- Add bootstrap coverage through deterministic seed/migration verification rather than ad hoc environment setup.
  - Rationale: the foundation must be reproducible and inspectable.
  - Alternative considered: embedding more setup logic in app startup. Rejected because it would blur runtime and provisioning concerns.

- Use integration tests to prove the real HTTP contract instead of relying on service-only tests.
  - Rationale: the current risk is boundary mismatch, not just implementation errors.
  - Alternative considered: expanding unit coverage only. Rejected because it would miss cookie, CSRF, and route-level behavior.

## Risks / Trade-offs

- Session rotation can create race conditions if multiple refreshes happen at once -> mitigate with explicit revoke/reissue sequencing and tests.
- Bootstrap documentation can drift from reality -> mitigate by keeping it tied to the tested migration/seed path.
- Readiness checks may fail in local environments with missing dependencies -> mitigate by making the dependency contract explicit in docs and tests.

## Open Questions

- None identified at proposal time.
