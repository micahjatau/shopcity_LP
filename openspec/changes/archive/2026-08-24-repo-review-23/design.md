## Context

Repo review 23 recommends freezing new Sprint 3 development and completing a Sprint 3A hardening pass first. The codebase already has a backend-first Nest/Fastify modular monolith with Prisma, Supabase/Postgres integration, financial ledgers, approvals, outbox/SMS processing, and OpenAPI tooling. The gaps are not architectural rewrites; they are mismatches between checklist status, runtime behavior, database-enforced invariants, OpenAPI truthfulness, and release evidence.

Financial correctness remains the main constraint. Money stays integer kobo, confirmed ledger history remains append-only, and frontend-submitted balances, roles, approvals, or policy decisions remain outside trust boundaries. Database changes must be forward-only and recorded in the migration tracker with local and shared-environment evidence.

## Goals / Non-Goals

**Goals:**

- Make Sprint 3 redemption and approval workflows production-truthful across service logic, PostgreSQL constraints, OpenAPI contracts, tests, and release evidence.
- Ensure invalid redemption requests fail before creating financial, receipt, approval, notification, audit-success, or completed-idempotency side effects.
- Enforce state coherence at the database boundary for redemptions, approvals, ledger evidence, restoration evidence, and immutable redemption evidence.
- Centralize redemption policy evaluation so request capture and approval execution use the same rules and policy-version semantics.
- Make approval execution and expiry deterministic under concurrency.
- Make redemption SMS notifications typed, validated, and linked to the owning ledger/redemption/receipt/outbox records.
- Return discriminated financial transaction reads instead of earn-shaped responses for debit and future adjustment/reversal activity.
- Make public API contracts truthful, including hiding or accurately documenting the unavailable reversal boundary.
- Add deterministic clocks and current-head evidence for tests, coverage, OpenAPI, generated clients, migration, staging smoke, and SMS-provider verification.

**Non-Goals:**

- Do not implement real reversal execution in this hardening pass.
- Do not expand manual adjustment behavior beyond constraints needed to protect ledger/evidence invariants.
- Do not introduce GraphQL, microservices, floating-point money, or frontend-owned financial authority.
- Do not edit already-applied shared migrations; use forward migrations for corrections.

## Decisions

1. Treat this as a hardening change, not a redesign.

   The existing module boundaries are sound enough to preserve. The implementation should use small focused changes in existing modules, adding extraction only where it reduces repeated policy logic or makes approval execution safer.

   Alternative considered: redesign financial workflows around a new orchestration layer. This would increase risk and delay without addressing the immediate repo-review findings.

2. Reorder redemption validation before deciding immediate versus pending approval.

   The redemption request path must validate identity, idempotency, receipt uniqueness, active balance, minimum, basket cap, and insufficient balance before selecting confirmed or pending approval behavior. Both paths should consume one validated policy result.

   Alternative considered: keep pending approval as an early branch and validate again at approval execution. That leaves invalid high-value requests reserving receipt/approval state and conflicts with the exit gate.

3. Enforce financial invariants in PostgreSQL as well as services.

   Forward migrations should add redemption and approval state-machine constraints, ledger evidence triggers, restoration aggregate checks, and immutable redemption-evidence protections. Deferred commit-time checks are appropriate for multi-row ledger evidence that cannot be represented by simple check constraints.

   Alternative considered: service-only validation. That keeps too much correctness in application code and permits direct or buggy writes to create incoherent financial records.

4. Use explicit locking for approval execution and expiry.

   Approval execution should lock the approval, target redemption, changing receipt evidence, and allocation inputs inside the same serializable transaction, while keeping conditional updates as compare-and-set guards. Automatic expiry should select pending approvals with `FOR UPDATE SKIP LOCKED` semantics and update approval/redemption state atomically.

   Alternative considered: rely only on serializable isolation and conditional updates. That may be correct in narrow cases but is harder to reason about and less clear for financial approval auditability.

5. Make SMS templates typed and fail closed.

   A template registry should define allowed template keys and required payload fields. Invalid payloads should be terminally categorized or dead-lettered rather than rendered as generic receipt text. Confirmed redemption paths should consistently populate `ledgerEntryId`, `redemptionId`, `receiptId`, and `outboxEventId`.

   Alternative considered: keep generic fallback rendering. That preserves delivery but breaks contract truthfulness by sending misleading redemption messages.

6. Represent financial reads as discriminated unions.

   `getTransaction()` and customer-ledger reads should expose transaction type, direction, amount, owning aggregate IDs, allocation/restoration summaries, reversal linkage, role-safe reasons, and SMS state where useful. SMS lookup should prefer ledger ownership, then aggregate ownership, and only then receipt fallback.

   Alternative considered: extend the earn-shaped read model with optional fields. That keeps debit transactions mislabeled and becomes more fragile as adjustments and reversals are added.

7. Make the reversal boundary truthful until reversal execution exists.

   The preferred implementation is to hide the public reversal route and remove impossible 201 success documentation until real compensating ledger execution is implemented. If the route remains, it must return only a structured unavailable/review-required outcome and must not advertise success.

   Alternative considered: leave the scaffold publicly documented. That invites frontend integration against a success path that cannot occur.

## Risks / Trade-offs

- Database constraints may fail on existing incoherent data -> add preflight queries, backfill plans, and migration tracker evidence before enforcing constraints.
- Explicit locking can increase contention -> keep transactions small, add `maxWait` and `timeout`, and verify with concurrency tests.
- Reordered validation can change observed error precedence -> document stable domain errors and update HTTP/OpenAPI tests accordingly.
- Automatic expiry can race with manual decisions -> use locked selection plus conditional state transitions and assert one terminal outcome.
- SMS fail-closed validation can move bad historical payloads to dead-letter -> provide a backfill/admin remediation path and clear categories.
- Discriminated read responses can affect clients -> regenerate clients, typecheck them, and document response examples.
- Hiding reversal may require contract/client updates -> treat removal of impossible success documentation as a truthfulness correction before external dependency forms.

## Migration Plan

1. Reconcile task trackers before code changes so implementation status is truthful.
2. Land service-level hardening and tests for redemption validation, timestamp enforcement, unique-conflict normalization, pending receipt state, SMS ownership, and shared policy use.
3. Add forward migrations for state constraints, ledger/evidence triggers, restoration invariants, and immutable redemption evidence after preflight checks.
4. Add approval locking, expiry worker behavior, stable concurrency outcomes, and supporting indexes.
5. Add SMS template registry, payload validation, redemption rendering, ownership backfill, and provider tests.
6. Add discriminated transaction/customer-ledger reads and correct SMS lookup order.
7. Correct OpenAPI response decorators, domain error examples, reversal visibility, generated clients, and Bruno coverage.
8. Add deterministic clock support and current-head release evidence for static checks, unit, e2e, integration, coverage, OpenAPI, staging migration, smoke, and SMS verification.

Rollback for database changes should prefer forward fixes. If a new constraint blocks deployment, record the failing rows, remediate or backfill them, and apply a follow-up migration rather than editing an already-applied migration.

## Open Questions

- Should policy-change failure during approval execution remain retryable until expiry, or become terminal with a machine-readable rejection/expiry reason?
- Should expired receipt evidence receive a distinct receipt state, or should receipt evidence remain captured while the redemption and approval become expired?
- What exact stale and future timestamp skew thresholds should redemption use relative to earning?
- Should the reversal controller be fully unregistered, feature-gated, or retained only as a structured review-required boundary?
