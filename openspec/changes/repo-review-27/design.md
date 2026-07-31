## Context

Review 27 confirms the repo is improving on client parity and CI, but the next release gate is still blocked by migration safety gaps, redemption replay ordering, approval expiry handling, ledger invariants, and transaction read scope. The current codebase already has most of the plumbing for append-only finance and role-aware APIs, so this change is a hardening pass rather than a feature expansion.

## Goals / Non-Goals

**Goals:**
- Prove shared database migrations are safe to restore and deploy.
- Make redemption replay authoritative before mutable eligibility checks.
- Enforce bounded retry behavior for serializable redemption conflicts.
- Generalize credit-source validation for adjustments while preserving ledger invariants.
- Move approval expiry out of request-time reads into a bounded worker.
- Enforce branch-scoped transaction reads for cashiers and wider scopes for privileged roles.

**Non-Goals:**
- Add reversal or adjustment user flows beyond the contracts needed for validation.
- Redesign public response payloads beyond the scope of the hardening requirements.
- Replace Prisma, the approval model, or the existing audit/outbox infrastructure.

## Decisions

### Release evidence is part of the migration contract
The shared database must be verified with both a migration-ledger comparison and a restore-based deploy rehearsal before the change is treated as release-ready. This is preferable to trusting `db push` output alone because `db push` does not prove that restore, migration history, or future deploy behavior are safe.

### Redemption replay happens before mutable checks
The redemption service should normalize the request, check for a completed idempotency response, and return that result before consulting mutable state such as card status or branch eligibility. This keeps retries authoritative and prevents a completed transaction from being rejected because the world changed after the first success.

### Serializable conflicts get bounded retries only
Redemption transactions should retry only serialization failures, with a small bounded backoff policy and jitter. Broader retrying would blur business rejections with infrastructure contention and could hide real validation failures.

### Credit sources are generalized, but invariants stay strict
Credit lots should accept any valid credit-producing source that the model explicitly allows, including adjustment credits, while keeping source references immutable and restoration mappings anchored to the original debit. This avoids an earn-only source model that blocks adjustments without weakening auditability.

### Approval expiry becomes a worker concern
Approval expiry should run in a scheduled bounded worker using lock-based batch selection instead of piggybacking on queue reads. That removes hidden writes from GET paths, makes processing deterministic, and gives us a place to attach expiry audits.

### Transaction reads enforce authorization in the service boundary
Transaction read access should be checked with the caller's auth context inside the read service, not only in the controller. That keeps branch/tenant scope rules consistent across all call sites and avoids accidental bypasses.

## Risks / Trade-offs

- [Risk] Stricter migration verification may block release until historical evidence is collected. [Mitigation] Keep the verification additive and document the restore/reconcile steps clearly.
- [Risk] Bounded retry logic can still fail under heavy contention. [Mitigation] Keep the retry budget small and return a stable retryable failure when it is exhausted.
- [Risk] Generalizing credit-source rules can expose bad historical data. [Mitigation] Gate the new invariant behind migration checks and write targeted regression tests.
- [Risk] Moving approval expiry to a worker changes operational behavior. [Mitigation] Use bounded batches, idempotent updates, and atomic row transitions.
- [Risk] Branch-scoped transaction reads may change client expectations. [Mitigation] Make the denial semantics consistent and cover them with API tests.

## Migration Plan

1. Add the migration-evidence and ledger-alignment checks without removing the current schema.
2. Deploy the redemption replay and retry changes behind existing service boundaries.
3. Introduce the approval expiry worker and stop relying on queue reads for expiry side effects.
4. Apply the credit-source and reversal-link validations with expand-and-contract database changes where needed.
5. Update transaction read services to accept `AuthContext` and enforce branch or tenant scope.
6. Refresh the release evidence and tracker docs so the verification record is reproducible.

Rollback is by reverting the service changes first while keeping additive schema changes in place. The worker can be disabled independently if it causes issues.

## Open Questions

- Should cashier cross-branch transaction reads return `403` or `404`?
- Do approval expiry events need a distinct audit subtype or can they reuse the current audit model?
- Should the release-evidence and tracker doc updates be shipped in the same change or as a follow-up docs-only commit?
