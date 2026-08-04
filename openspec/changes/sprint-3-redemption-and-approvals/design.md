## Context

Sprint 2 currently provides a canonical earn command, immutable receipt evidence, append-only confirmed ledger entries, credit lots with protected source fields, approval execution for controlled earns, idempotency, audit, transactional SMS intent, and a recoverable outbox worker. Active balance is derived from positive, unexpired lots and financial writes use integer kobo only.

Sprint 3 adds debit-side financial operations. The current schema is earn-only: ledger type/direction do not represent debits, approvals are receipt-bound, `LoyaltyLedgerEntry.receiptId` is required and unique, `CreditLot.remainingAmountKobo` is temporarily immutable, and there is no redemption aggregate, allocation table, reversal execution, or manual-adjustment aggregate. These gaps must be closed with additive, deploy-safe migrations that preserve existing Sprint 2 history.

The main stakeholders are cashier checkout, supervisor/admin approval and reversal workflows, operations visibility, API/frontend consumers, and finance/audit requirements. The architecture remains backend-first, REST/OpenAPI-focused, and inside the existing NestJS modular monolith.

## Goals / Non-Goals

**Goals:**

- Implement server-authoritative online redemption with configured minimum, basket cap, high-value approval threshold, same-purchase exclusion, and offline rejection.
- Persist redemption intent before confirmed financial execution so pending approvals are replayable and auditable without balance effects.
- Consume credit lots by deterministic earliest-expiry-first allocation under transaction-level locking and database constraints.
- Generalize approvals to strongly referenced earn and redemption targets while preserving current earn approval history.
- Implement safe reversals and admin adjustments through compensating ledger entries and immutable allocation/restoration evidence.
- Extend transaction reads, approval lists, API contracts, SMS/outbox, audit, docs, and tests for redemption, reversal, and adjustment journeys.
- Prove no concurrent redemption can consume more than active balance.

**Non-Goals:**

- Offline redemption or POS offline sync.
- Scheduled credit expiry, expiry reminders, or expiry ledger execution.
- Fraud dashboards, fraud-review queues, executive reporting, or materialized report views.
- Direct POS integration or customer self-service redemption.
- Automatic reversal when restoration cannot be proven safe.
- Introducing GraphQL, microservices, floating-point money, or frontend-authoritative balance/policy decisions.

## Decisions

1. Keep Sprint 3 inside the modular monolith.
   - Add `redemptions`, `reversals`, and `adjustments` modules under `src/modules/` and shared balance/allocation primitives under shared common/module boundaries.
   - `LoyaltyService` remains responsible for earn and shared transaction reads; new modules depend on shared primitives rather than each other cyclically.
   - Alternative considered: a separate redemption service. Rejected because the TRD targets an API-first modular monolith and the MVP needs atomic local transactions across receipts, ledger, lots, approvals, audit, and outbox.

2. Keep confirmed transaction identity anchored on ledger entry IDs.
   - For confirmed earns, redemptions, reversals, and adjustments, public `transactionId` maps to `LoyaltyLedgerEntry.id`.
   - Pending redemption uses `redemptionId` and `approvalId` until execution creates the debit ledger entry.
   - Alternative considered: a separate synthetic transaction table. Rejected because it would duplicate the canonical ledger identity without improving auditability.

3. Add a `Redemption` intent aggregate.
   - The record captures tenant, branch, customer, card, device, receipt, actor, basket amount, requested amount, maximum allowed amount, policy version, status, timestamps, and eventual ledger link.
   - High-value requests create a pending redemption and approval but no ledger, allocation, lot mutation, outbox, or SMS financial confirmation.
   - Alternative considered: create ledger entries for pending redemption. Rejected because pending actions must not be financial effects.

4. Persist immutable allocations and restorations.
   - Every debit ledger entry funded by lots must have immutable allocation rows identifying lot, amount, order, tenant, and related ledger/redemption identity.
   - Every debit reversal restoration must use immutable restoration rows rather than deleting or editing allocations.
   - Alternative considered: store allocation details as JSON on the ledger entry. Rejected because it weakens foreign-key enforcement, queryability, and invariant checks.

5. Use serializable transactions, row locks, conditional updates, and database invariants for allocation.
   - Eligible lots are locked in FIFO order: `expiresAt`, then `earnedAt`, then lot ID.
   - Expired, depleted, same-purchase-ineligible, and explicitly excluded lots are skipped.
   - Domain failures are not retried; recognized PostgreSQL serialization/deadlock conflicts can be retried and eventually map to `REDEMPTION_TRANSACTION_CONFLICT`.
   - Conditional updates ensure a lot cannot become negative even if application assumptions fail.
   - Alternative considered: cached active-balance reads. Rejected because they cannot prove debit allocation safety under concurrency.

6. Replace the temporary lot-balance freeze with controlled mutation rules.
   - Preserve constraints that source fields and expiry are immutable and `0 <= remainingAmountKobo <= originalAmountKobo`.
   - Add allocation/restoration immutability and deferred commit checks so balance changes are explainable by ledger, allocation, and restoration rows.
   - Alternative considered: application-only checks. Rejected because Sprint 3 balance integrity must survive code paths and concurrent transactions.

7. Generalize approvals with typed foreign keys, not free-form targets.
   - Add `ApprovalTargetType` with earn and redemption targets, make `receiptId` optional, add `redemptionId`, backfill existing approvals to earn, and enforce an XOR target constraint.
   - Approval execution revalidates current actor, branch, device, card, customer, policy, active balance, and lot eligibility before creating any financial effect.
   - Alternative considered: a generic target ID string. Rejected because it loses relational integrity.

8. Reverse by compensation, never mutation.
   - Earn reversal creates a debit reversal only when the original lot can be safely consumed.
   - Redemption/debit reversal creates a credit reversal and restoration rows back to original lots, preserving original expiry.
   - Unsafe cases return `REVERSAL_REVIEW_REQUIRED` instead of guessing.
   - Alternative considered: editing original lots, allocations, or ledger entries. Rejected because confirmed financial history is append-only.

9. Reuse existing outbox/SMS and idempotency infrastructure.
   - Redemption, reversal, and adjustment financial confirmations create outbox and SMS intent in the same financial transaction.
   - Pending/rejected/expired approvals create no confirmation SMS unless separately documented.
   - API code does not send SMS directly and SMS failure never invalidates financial transactions.
   - Alternative considered: a new queue system. Rejected because the existing outbox is intentionally generic and recoverable.

10. Publish contract changes before controller work.

- OpenAPI, Bruno, examples, and generated-client checks must cover 201 confirmed redemption, 202 pending approval, approval decisions, reversals, adjustments, stable errors, and discriminated reads.
- Alternative considered: implement endpoints first and document afterward. Rejected because frontend/POS integration needs the state machine and error contract early.

## Risks / Trade-offs

- Concurrent redemptions spend the same lot -> Mitigate with serializable transactions, deterministic row locks, conditional lot updates, deferred database checks, and mandatory concurrency tests.
- Allocation rows and lot balances become inconsistent -> Mitigate with immutable allocation/restoration rows and commit-time invariant checks that tie totals to ledger entries.
- Approval execution uses stale balance or policy -> Mitigate by not reserving lots while pending and fully revalidating current balance, policy, and eligibility at approval execution.
- Generalizing approvals breaks existing earn approvals -> Mitigate through additive nullable fields, backfill, XOR constraints after validation, and upgrade regression tests.
- Making ledger `receiptId` nullable weakens evidence linkage -> Mitigate with type-specific relation checks and redemption/earn receipt invariants.
- Reversal restores expired or already-ineligible funds -> Mitigate by requiring safe restoration to original lots and returning `REVERSAL_REVIEW_REQUIRED` when safety cannot be proven.
- Long-running locks hurt checkout latency -> Mitigate by locking only the customer's eligible lots, using bounded retry, indexing FIFO queries, and measuring conflict behavior in tests.
- Contract scope is broad -> Mitigate by sequencing: design/contract, migrations, allocation engine, immediate redemption, approval redemption, reversal/adjustment, release hardening.

## Migration Plan

1. Schema expansion.
   - Add ledger enum values for `REDEEM`, `REVERSAL`, and `ADJUSTMENT`, and debit direction.
   - Add redemption, allocation, restoration, and adjustment tables with tenant-safe indexes/foreign keys.
   - Add approval target fields as nullable and make ledger `receiptId` nullable where required.
   - Do not enable application writes until constraints and tests are ready.

2. Approval backfill and constraints.
   - Backfill existing approvals as earn targets.
   - Validate existing receipt-bound approvals.
   - Add XOR target constraint and unique redemption approval constraint.

3. Controlled lot-balance transitions.
   - Replace the temporary `remainingAmountKobo` immutability trigger with controlled allocation/restoration transition rules.
   - Add allocation/restoration immutability triggers and deferred invariant checks.
   - Preflight existing lots and fail migrations loudly if Sprint 2 data is inconsistent.

4. Verification.
   - Test fresh migration from zero.
   - Test upgrade migration with realistic Sprint 2 earn, pending approval, outbox, and SMS records.
   - Verify existing earn history remains queryable, approval rows are backfilled, credit-lot balances are unchanged, and append-only triggers remain active.
   - Update `docs/database/migration-tracker.md` with local and remote evidence for every applied migration.

Rollback is forward-only for shared environments. If a migration has been applied outside local throwaway databases, do not edit it; use expand-and-contract follow-up migrations and document backup/restore evidence.

## Open Questions

- Are the initial policy defaults accepted as configurable assumptions: minimum redemption NGN 500, maximum 30% of basket amount, high-value approval above NGN 5,000, and manual credit expiry of 12 months?
- Should redemption rejection create a customer SMS notification, or should SMS be limited to confirmed financial effects for Sprint 3?
- What admin-adjustment ceiling and expiry override bounds should be enforced initially?
- Should automatic earn reversal allow a formally specified partial-reversal policy, or should all partially consumed earn credits return `REVERSAL_REVIEW_REQUIRED` in Sprint 3?
- What exact compatibility shape should `GET /api/v1/transactions/{transactionId}` use for existing earn clients while adding discriminated transaction types?
