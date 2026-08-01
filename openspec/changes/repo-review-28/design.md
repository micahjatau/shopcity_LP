## Context

Review 28 confirms the repo has improved on replay handling, ledger checks, and CI shape, but the remaining blockers are concentrated in five areas: shared migration truth, replay ordering, expiry consistency, credit-lot invariants, and branch-scoped supervisor reads. The codebase already has the relevant service boundaries, so this change is a targeted hardening pass rather than a redesign.

## Goals / Non-Goals

**Goals:**
- Reconcile real shared migration history with committed migrations and record reproducible verification evidence.
- Make completed idempotency replay authoritative before any mutable eligibility checks.
- Centralize approval expiry so worker and decision paths settle Approval, Redemption, Receipt, and audit state together.
- Allow adjustment-credit lots while preserving immutable source and original-debit restoration guarantees.
- Enforce branch-scoped approval and customer-ledger authorization in the service layer.

**Non-Goals:**
- Add new reversal or manual-adjustment user flows beyond the contracts needed for verification.
- Redesign the public API payloads beyond the scopes covered by the specs.
- Replace Prisma, the current audit model, or the existing worker infrastructure wholesale.

## Decisions

### Reconcile migration history with restore-based evidence
The migration contract should be proven against the actual shared database history, not just a clean local replay. Use backup, restore, `prisma migrate status`, and `_prisma_migrations` comparison as the release gate. Alternative approaches like trusting `db push` or only checking the schema after apply are insufficient because they do not prove deployability or history integrity.

### Move replay resolution ahead of mutable checks
Completed idempotency replay should happen immediately after request normalization and before timestamp, policy, card, branch, or customer validation. This keeps retries authoritative even when the mutable world has changed. The alternative, keeping validation first, preserves more early rejects but can incorrectly reject a request that should have replayed a prior success.

### Share one expiry transaction between worker and decision paths
Both expiry entry points should call one internal transactional function that resolves the receipt target, updates Approval, Redemption, Receipt, and audit rows together, and returns a single canonical expiry outcome. A worker-only fix would leave decision-time expiry inconsistent, while duplicating logic in two places risks the same drift that created the current REDEEM receipt mismatch.

### Generalize credit-lot source ownership without loosening auditability
Credit lots should point to a generic source ledger entry rather than an earn-only source relation, but the allowed sources remain narrowly defined: earned credits and adjustment credits. Restorations must still prove they belong to the original debit that consumed them. This is the smallest schema change that unlocks adjustments without weakening immutability or traceability.

### Enforce authorization in queries, not after retrieval
Approval lists, approval decisions, and customer-ledger reads should all apply branch restrictions in the database query based on the actor's auth context. Filtering after fetch is simpler to code but can leak rows into memory, complicate pagination, and create accidental bypasses.

### Keep release evidence current and reproducible
Update the evidence/tracker docs with commands and results that refer to the current verified head only. Stale head references create false confidence and make the release record untrustworthy.

## Risks / Trade-offs

- [Risk] Migration reconciliation may block release until the shared database ledger is fully documented. [Mitigation] Keep the reconciliation additive and record the exact evidence path in the tracker.
- [Risk] Shared expiry logic can touch multiple rows in one transaction and increase lock contention. [Mitigation] Keep the transaction narrow and use bounded selection in the worker.
- [Risk] Generalizing credit sources may expose bad historical data. [Mitigation] Add regression tests before schema expansion and fail closed on unsupported sources.
- [Risk] Query-level authorization changes can alter pagination or result counts for supervisors. [Mitigation] Cover the scope rules with API tests and keep denial semantics consistent.

## Migration Plan

1. Reconcile the shared migration ledger and capture restore-based verification evidence.
2. Introduce the shared expiry transaction and wire both the worker and decision path to it.
3. Reorder replay lookup ahead of mutable validation in earn and redemption flows.
4. Expand the credit-lot source model and add the original-debit restoration guard.
5. Apply actor-aware authorization to approval and customer-ledger read services.
6. Refresh the release-evidence and tracker docs with the verified head and shared migration state.

Rollback is by reverting service logic first while leaving additive schema changes in place. If the new expiry worker path causes operational issues, disable the worker entry point while keeping the shared transactional helper available.

## Open Questions

- Should cashier and supervisor scope failures return `403` or `404` for the affected read endpoints?
- Should the shared expiry function write a distinct audit subtype or reuse the existing expiry audit shape?
- Should the shared migration reconciliation be recorded in the tracker as one combined evidence step or split into backup, restore, and deploy-rehearsal entries?
