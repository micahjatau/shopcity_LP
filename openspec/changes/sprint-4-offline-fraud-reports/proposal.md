## Why

Review 41 shows Sprint 4 is no longer just a skeleton, but several acceptance rules still fail: offline replay can mutate the canonical attempt row, duplicate-receipt fraud depends on impossible committed duplicates, fraud evaluation is coupled to SMS recovery, reporting reads from non-authoritative inputs, and report refresh is not durable. Those are correctness and evidence problems, not ledger redesign problems.

## What Changes

- Make offline sync replay-safe by leaving the canonical success record immutable when a request hash mismatch is detected and storing conflict evidence separately.
- Add append-only duplicate-attempt evidence and use it for FR-DUP-001 plus cashier `duplicateAttempts` reporting.
- Introduce a durable `fraud.evaluate` outbox path so fraud evaluation runs independently of SMS processing.
- Correct reporting materialization so confirmed financial state drives purchase/transaction metrics, expired lots are excluded from active balance and liability calculations, and duplicate-attempt reporting uses attempt evidence.
- Expose the missing cashier, redemption, SMS, and audit report endpoints and keep CSV exports aligned with those views.
- Make manual report refresh durable and protect same-tenant materialization concurrency.
- Expand offline, fraud, and reporting regression coverage for replay, conflicts, duplicates, expiration handling, and concurrent refresh.

## Capabilities

### New Capabilities

- `offline-sync-idempotency-integrity`
- `fraud-attempt-evidence`
- `fraud-outbox-dispatch`
- `reporting-authority-alignment`
- `report-refresh-durability`

### Modified Capabilities

- `offline-earn-sync`
- `fraud-detection`
- `fraud-review`
- `reporting`
- `report-export`

## Impact

Affected areas include `src/modules/offline-sync/`, `src/modules/fraud/`, `src/modules/reports/`, outbox/worker runtime wiring, Prisma schema/migrations, OpenAPI/Bruno artifacts, and the offline/fraud/report integration suites. This change is primarily correctness and evidence hardening; it should not widen financial write surfaces.