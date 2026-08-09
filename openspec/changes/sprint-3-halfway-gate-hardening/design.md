## Context

Repo review 25 confirms Sprint 3 is functionally halfway complete, but the release gate is still behind the implementation. The highest-risk gaps are runtime truth at the reversal boundary, release evidence for shared migrations, idempotency ordering under mutable state drift, approval expiry side effects, and cashier transaction access scope.

This change stays within the current backend-first Nest/Fastify modular monolith. It does not add new infrastructure or expand reversal/manual-adjustment features; it makes the halfway gate truthful and closes the remaining contract mismatches.

## Goals / Non-Goals

**Goals:**

- Remove the false reversal success contract.
- Make idempotency replay deterministic before mutable eligibility checks.
- Bound redemption conflict retries.
- Move approval expiry into a scheduled worker with auditability.
- Scope cashier transaction reads correctly.
- Require deployable migration and CI evidence before the halfway gate is marked pass.

**Non-Goals:**

- Do not implement real redemption reversal execution.
- Do not broaden manual adjustment behavior.
- Do not redesign the module structure.
- Do not edit already-applied shared migrations in place.

## Decisions

1. Make the reversal boundary explicitly unavailable instead of implicitly successful.

   The controller and OpenAPI output should agree that reversal is not a supported success path yet. That avoids advertising a runtime behavior the service cannot produce.

   Alternative considered: leave the endpoint visible and rely on tests to catch the mismatch. That still leaks a false contract to generated clients.

2. Resolve completed idempotency records before mutable validation.

   A retried request should recover the original success response even if card, device, or customer state has changed since the first attempt. This preserves completed financial operations through state drift.

   Alternative considered: keep the current validation order. That makes successful retries fragile and can convert a completed operation into a false rejection.

3. Limit redemption retries to a bounded, explicitly approved conflict set.

   Only recognized transactional write conflicts should be retried, and only within a fixed budget. That keeps the system resilient without hiding unexpected failures.

   Alternative considered: broad retry on any transaction-like error. That risks masking real bugs and can amplify load during persistent failures.

4. Run approval expiry as a worker, not a read-time side effect.

   Expiry should be bounded, auditable, and independent of whether someone opens the list page. Worker execution also gives a clear place for locking and batch limits.

   Alternative considered: keep request-driven expiry in the list workflow. That is operationally fragile and mutates state during reads.

5. Enforce cashier transaction scope in the service boundary.

   Branch or actor scope should be checked where transaction access is actually resolved, not just in controller plumbing. That makes the rule harder to bypass and easier to test.

   Alternative considered: leave tenant-wide access and rely on front-end discipline. That is outside the trust boundary.

6. Treat migration and CI evidence as gate state, not tribal knowledge.

   The halfway gate should depend on explicit recorded evidence for deployable migration history, recovery checks, and target-commit CI. If the evidence is missing, the gate stays blocked.

   Alternative considered: infer readiness from local schema shape or memory of prior runs. That is exactly the gap the review highlights.

## Risks / Trade-offs

- [Client breakage from reversal contract cleanup] → Update generated-client expectations with the contract change.
- [Fail-closed idempotency or retry logic can surface more conflicts] → Keep the stable conflict path explicit and test it directly.
- [Worker-based expiry adds background processing] → Bound the batch size and keep audit output deterministic.
- [Scope restrictions may block previously allowed cashier lookups] → Prefer correct authorization over permissive tenant-wide access.
- [Evidence gating slows release closure] → That delay is intentional until the half-way gate is truthful.

## Migration Plan

1. Update the reversal contract and related OpenAPI/client assertions.
2. Reorder idempotency resolution and add bounded redemption retry coverage.
3. Introduce the approval-expiry worker with bounded processing and audit events.
4. Enforce branch or actor scoping for cashier transaction reads.
5. Reconcile migration-tracker and release-evidence entries for the target commit.
6. Re-run the verification suite and keep the halfway gate blocked until the evidence is recorded.

## Open Questions

- Should the reversal endpoint remain visible as an unavailable route, or be hidden from Swagger entirely until implementation lands?
- What exact branch/actor scope should cashier transaction reads enforce for shared users?
- Which CI, migration, and recovery commands are mandatory for the final half-way gate evidence record?
