## Why

`repo_review_9.md` makes the next phase explicit: the backend is ready to move from receipt integrity into the immutable earning ledger. The current system captures receipts safely, but it still does not create the financial engine that the TRD requires for earn, balance reconstruction, approval execution, and SMS-backed follow-through.

## What Changes

- Introduce an earn-ledger API centered on `POST /api/v1/transactions/earn` and supporting transaction lookup endpoints.
- Add immutable ledger, credit lot, approval, and outbox data models in PostgreSQL.
- Make confirmed earns atomically create receipt evidence, ledger entries, credit lots, audit records, and outbox rows.
- Add an explicit approval flow for purchases that require supervisor decision before any financial write.
- Add background processing for outbox publication and SMS delivery.
- **BREAKING**: shift the public earn flow away from receipt-review endpoints toward transaction/approval endpoints.

## Capabilities

### New Capabilities
- `immutable-earn-ledger`: defines the earn, approval, outbox, and SMS behaviors needed for the TRD Phase 2 earning engine.

### Modified Capabilities

## Impact

- Prisma schema and migrations for ledger, lot, approval, and outbox tables.
- Receipt and approval application modules.
- New transactions and worker modules.
- OpenAPI contract, integration tests, and production readiness for earnings.
