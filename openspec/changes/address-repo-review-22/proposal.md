## Why

Sprint 3 redemption work has release-blocking correctness gaps identified in `docs/repo_review_22.md`: high-value redemption approvals contradict the database target constraint, and concurrent duplicate/idempotent redemption requests can leak Prisma uniqueness errors instead of stable API responses. These issues must be fixed before high-value approvals, reversals, manual adjustments, or pilot use can be considered safe.

## What Changes

- Align REDEEM approval persistence with the database contract by storing `redemptionId` only on approval targets and loading receipt evidence through the redemption relation.
- Harden redemption write paths against Prisma unique-constraint races so concurrent idempotent requests replay or reject with stable domain errors.
- Validate minimum redemption, basket cap, and available balance before deciding whether a redemption enters pending approval.
- Add database-level deferred financial invariants for redemption allocations, restorations, ledger linkage, and lot balance changes.
- Generalize SMS message ownership so reversals and manual adjustments can create replay-safe notifications without requiring a receipt or enforcing one message per receipt.
- Correct pending-redemption receipt audit state so the requesting cashier is not recorded as the approver for an unexecuted high-value transaction.
- Add real PostgreSQL/Testcontainers coverage for high-value approval persistence, duplicate redemption races, idempotency races, allocation invariants, and approval execution concurrency.
- Update OpenAPI, read mapping, and release evidence so documented contracts match persisted Sprint 3 behavior.

## Capabilities

### New Capabilities
- `redemption-approval-integrity`: REDEEM approval persistence, pending validation order, approval receipt loading, and pending receipt audit semantics.
- `redemption-concurrency-stability`: stable API behavior for concurrent redemption idempotency, duplicate receipt, ledger, and approval target uniqueness races.
- `redemption-allocation-invariants`: database-enforced allocation, restoration, ledger-linkage, ownership, and lot-balance invariants for debit financial effects.
- `transaction-notification-ownership`: generalized SMS delivery intent ownership for receipt-backed and non-receipt financial transactions.

### Modified Capabilities
- `financial-workflow-contracts`: Extend stable financial workflow behavior to Sprint 3 redemption approval execution and lookup contracts.
- `sms-delivery-truthfulness`: Preserve outbox-event idempotency while allowing multiple truthful SMS records to relate to one receipt or no receipt.

## Impact

- Affected modules: redemptions, approvals, transaction lookup/read models, ledger allocation services, SMS/outbox persistence, OpenAPI contract generation, and integration tests.
- Affected schema: Prisma models and migrations for approval target usage, allocation/restoration constraint triggers, and SMS ownership uniqueness.
- Affected behavior: high-value redemption requests must persist successfully, invalid high-value requests must reject before receipt reservation, duplicate/concurrent requests must return documented stable responses, and notification records must be compatible with upcoming reversals and adjustments.
