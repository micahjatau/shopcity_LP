## Why

Review 42 shows Sprint 4 still has a few correctness gaps that block release: approval-path earn/redemption flows can bypass fraud evaluation, fraud outbox handling is not fully replay-safe, reporting still depends on mutable current state for some metrics, and tenant/branch rebuilds can still interfere with each other. This change closes those gaps before any Sprint 5 work begins.

## What Changes

- Emit fraud work when earn/redemption enters pending approval, not only on immediate-confirmation paths.
- Make fraud event processing terminal and replay-safe so retries cannot double-count occurrence history.
- Converge production and test fraud evaluation on one runtime path and normalize behavioral rule windows/dedupe keys to the actual branch-day boundary.
- Rebuild reporting from authoritative as-of evidence, including confirmed-only customer activity and append-only duplicate-attempt reporting.
- Use a single tenant-wide reporting lock so tenant and branch rebuilds cannot corrupt each other.
- Make report refresh durable instead of a detached in-process promise.
- Tighten regression coverage for fraud replay, approval flows, historical rebuilds, duplicate-race evidence, and offline/online boundary cases.

## Capabilities

### New Capabilities

- `fraud-closure-correctness`: approval-path fraud evaluation, terminal replay-safe fraud processing, duplicate-attempt evidence handling, and unified behavioral fraud evaluation.
- `reporting-closure-correctness`: historical snapshots, confirmed-only activity counts, append-only duplicate-attempt reporting, tenant-wide materialization isolation, and durable refresh handling.
- `offline-acceptance-regression`: offline/online boundary coverage stays aligned with the corrected fraud and reporting behavior.

### Modified Capabilities

- `outbox-recovery-resilience`: replay handling changes to guarantee terminal fraud completion.
- `financial-workflow-contracts`: approval-path behavior now requires fraud evaluation before pending responses.

## Impact

Affected areas include `src/jobs/`, `src/modules/fraud/`, `src/modules/reports/`, offline sync modules and integration tests, Prisma schema/migrations if needed for terminal fraud state or evidence tracking, and the OpenAPI/client/docs artifacts that describe approval, fraud, reporting, and refresh behavior.

## Note

All substantive correctness gaps from review 42 are now covered in this change. Remaining work is limited to implementation, validation, and evidence/doc updates.
