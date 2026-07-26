# ADR 009: Redemption Allocation, Approval Targets, And Reversal Evidence

## Status

Accepted for Sprint 3 planning.

## Context

Sprint 2 established an earn-only financial ledger with immutable receipt evidence, append-only confirmed ledger entries, credit lots, approval execution for controlled earns, idempotency, audit, and transactional outbox/SMS behavior. Sprint 3 adds debit-side workflows: redemption, high-value redemption approval, safe reversal, and manual adjustments.

The system must preserve backend-owned financial authority, integer kobo accounting, append-only confirmed history, and reconstructable customer balance. Concurrent redemption must not create negative or overstated balance.

## Decision

Confirmed financial transaction identity remains the ledger entry ID. Pending redemption uses a redemption intent ID and approval ID until execution creates a confirmed debit ledger entry.

Redemption and debit adjustment SHALL consume credit lots through deterministic FIFO allocation ordered by earliest `expiresAt`, then `earnedAt`, then lot ID. Allocation runs inside the same serializable database transaction as the debit ledger entry, locks eligible lots before mutation, and records immutable allocation rows for the exact lots and amounts consumed.

Credit-lot remaining-balance mutation SHALL be allowed only through controlled workflows backed by immutable ledger and lot-movement evidence. Source fields and expiry remain immutable, and database constraints/triggers must enforce balance bounds and reconciliation at commit.

Reversal SHALL use compensating ledger entries rather than mutating original confirmed records. Debit reversals restore original lots through immutable restoration rows. If coherent restoration or safe credit removal cannot be proven, the workflow returns `REVERSAL_REVIEW_REQUIRED`.

Approvals SHALL use strongly referenced target types instead of free-form target IDs. Sprint 3 supports earn and redemption approval targets, preserves existing receipt-bound earn approvals through migration backfill, and enforces target exclusivity with database constraints.

## Consequences

- Customer balance remains reconstructable from ledger entries, credit lots, allocations, and restorations.
- Pending high-value redemption can be audited without producing balance, ledger, outbox, or SMS financial effects.
- Approval execution must revalidate current policy, actor eligibility, card/customer/device state, active balance, and lot eligibility before creating any financial effect.
- Database migrations must be additive and include fresh plus Sprint 2 upgrade verification.
- Reads and API contracts must become discriminated by transaction type while preserving existing earn transaction behavior.

## Alternatives Considered

- A separate transaction table for all financial actions. Rejected because confirmed transaction identity already maps cleanly to append-only ledger entries.
- Storing allocation details as JSON on ledger entries. Rejected because it weakens foreign-key enforcement, invariant checks, and audit queryability.
- Reserving lots for pending approvals. Rejected because it would hold stale balance and create operational complexity; approval execution must revalidate instead.
- Free-form approval targets. Rejected because financial approval targets require relational integrity.
- Editing original ledger, allocation, or lot rows during reversal. Rejected because confirmed financial history must remain append-only.
