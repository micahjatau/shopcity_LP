## Why

Sprint 2 established the authoritative earn-only ledger, credit lots, approval execution, idempotency, audit, and transactional SMS/outbox guarantees. Sprint 3 must convert that foundation into a two-sided store-credit system without weakening append-only financial history or allowing concurrent redemption to overdraw customer balance.

## What Changes

- Add online redemption against server-derived active balance with deterministic earliest-expiry-first credit-lot allocation.
- Add redemption intent records so high-value redemption can wait for approval without creating ledger, allocation, balance, SMS, or outbox effects.
- Generalize approvals from receipt-bound earn approvals to typed earn and redemption approval targets while preserving existing approval history.
- Add immutable allocation and restoration records to explain every debit and reversal of redeemed credit.
- Add safe transaction reversal using compensating ledger entries instead of editing confirmed history.
- Add admin-only manual credit and debit adjustments with mandatory reason, audit, idempotency, and SMS/outbox behavior.
- Extend transaction, ledger, approval, public configuration, OpenAPI, Bruno, and frontend-facing docs for redemption, reversal, adjustment, and approval journeys.
- Replace the temporary credit-lot remaining-balance freeze with database-enforced controlled lot mutations tied to immutable allocation/restoration evidence.

## Capabilities

### New Capabilities
- `redemption-allocation`: Deterministic FIFO debit allocation, immutable allocation records, controlled lot-balance mutation, and concurrency safety.
- `redemption-workflow`: Immediate and approval-dependent redemption command behavior, policy enforcement, idempotency, audit, SMS/outbox, and stable errors.
- `generic-approval-targets`: Strongly referenced earn and redemption approval targets with current-state revalidation before execution.
- `transaction-reversal`: Safe reversal through compensating ledger entries and immutable restoration evidence, including review-required outcomes.
- `manual-adjustments`: Admin-only credit/debit adjustments that use the same ledger, lot, allocation, audit, idempotency, and SMS guarantees.

### Modified Capabilities
- `financial-workflow-contracts`: Expand the public financial workflow contract from earn-only to earn, redeem, reversal, and adjustment transaction types.
- `credit-lot-lifecycle-integrity`: Replace temporary lot-balance immutability with controlled allocation/restoration-backed balance transitions.
- `canonical-receipt-orchestration`: Add redemption receipt evidence and duplicate protection while preserving existing earn receipt invariants.
- `bounded-list-endpoints`: Extend bounded transaction, ledger, and approval reads to expose redemption, reversal, adjustment, allocation, and restoration summaries safely.
- `financial-endpoint-rate-limiting`: Add explicit throttling behavior for redemption and related financial commands.
- `sms-delivery-truthfulness`: Extend truthful transactional SMS/outbox behavior to redemption, reversal, and adjustment notifications.

## Impact

- Affects Prisma schema, migrations, database triggers/constraints, migration tracker, and fresh plus Sprint 2 upgrade verification.
- Affects `src/modules/loyalty`, existing approval flows, active balance reads, outbox/SMS integration, audit logging, and transaction read models.
- Adds backend modules for redemptions, reversals, adjustments, and shared FIFO allocation primitives inside the modular monolith.
- Adds REST endpoints for redemption, reversal, and adjustments; extends approval decision and transaction lookup/list contracts.
- Updates OpenAPI, Bruno/API docs, generated client artifacts, ADRs, runbooks, and CI/release evidence.
