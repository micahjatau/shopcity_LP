## Context

The repository has moved past the first wave of trust and integrity fixes, but the review still shows four foundation gaps that matter before ledger work: ownership is enforced mostly in application code, card state updates are not fully concurrency-safe, bootstrap credentials are too permissive, and sensitive public endpoints remain under-protected.

This change is intentionally a final foundation-hardening phase. It should close the highest-risk operational gaps without introducing the ledger model yet.

## Goals / Non-Goals

**Goals:**

- Enforce tenant ownership in the database for the core branch-linked entities.
- Make card status transitions safe under concurrency and keep replaced cards terminal.
- Require explicit, safe administrator bootstrap credentials and a local Supabase startup path.
- Add throttling and public-config active-state checks for sensitive endpoints.

**Non-Goals:**

- Implement the ledger, wallet, approvals, or outbox systems.
- Rework customer/card naming or receipt semantics beyond what is needed for this phase.
- Introduce a new distributed architecture or separate service.

## Decisions

1. Use composite ownership keys instead of app-only tenant checks.

- Why: the review identified cross-tenant reference risk that cannot be fully eliminated in service code.
- Alternatives considered: leaving the current app-level checks in place, or adding validation triggers only. Rejected because database constraints provide the strongest invariant with the least runtime ambiguity.

2. Make card status updates conditional inside the transaction.

- Why: a pre-read guard still allows stale reads to overwrite a replacement in a race.
- Alternatives considered: adding a separate state machine module or relying on optimistic checks in the controller. Rejected because the write itself must be conditional to be concurrency-safe.

3. Require an explicit bootstrap password and treat weak defaults as invalid.

- Why: the current fallback password is unsafe and makes the seed path look safer than it is.
- Alternatives considered: keeping the fallback for convenience, or silently generating a password. Rejected because bootstrap credentials must be deliberate and operator-visible.

4. Keep local Supabase bootstrap as an explicit operator step.

- Why: the app already depends on Supabase for identity flows, so local setup must show that dependency instead of implying it is bundled.
- Alternatives considered: hiding the dependency behind a stub or changing the app to avoid Supabase locally. Rejected because that would diverge from the production model.

5. Add request throttling at the API edge using the existing Redis-backed stack.

- Why: the protected endpoints are public enough to be enumerated and should not rely on business logic alone.
- Alternatives considered: implementing ad hoc counters in each service, or deferring throttling entirely. Rejected because a shared edge guard is simpler and more consistent.

## Risks / Trade-offs

- [Risk] Composite ownership constraints can require data cleanup before migration. → Mitigation: apply them with an expand-and-validate approach and fail migrations on invalid existing rows.
- [Risk] Conditional card writes can surface more conflict errors under load. → Mitigation: keep the conflict response explicit and cover the race with integration tests.
- [Risk] Strong bootstrap requirements may slow first-run setup. → Mitigation: document the sequence clearly and keep the path deterministic.
- [Risk] Throttling can block legitimate operator bursts. → Mitigation: use conservative-but-practical limits and scope them only to public or sensitive endpoints.

## Migration Plan

1. Add schema constraints for tenant ownership and validate existing rows.
2. Update card status logic to use transactional conditional writes.
3. Harden bootstrap so the seed path requires an explicit password outside test environments.
4. Update local setup docs to include Supabase startup.
5. Add throttling guards and inactive-state checks at the API edge.
6. Run focused and integration tests, then broader verification.

Rollback should be done by reverting the application code and, if needed, reversing the schema migration after any invalid data is cleaned up.

## Open Questions

- Should audit logs also receive a stronger tenant ownership constraint in this phase, or remain application-scoped until ledger work starts?
- What exact throttling limits should apply to login, card lookup, and public config for MVP traffic?
