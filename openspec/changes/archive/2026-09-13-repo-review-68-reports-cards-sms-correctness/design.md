# Design: Reports, cards, and SMS correctness closure

## 1. Report contract and materialization model

Use two explicit executive read models (or an equivalent additive contract):

- `currentSnapshot`: one row/value set keyed by tenant, branch scope, and `asOf`.
- `dailySeries`: rows keyed by tenant, branch scope, and local `reportDate`, containing only metrics whose definition is daily or cumulative-to-date.

Prefer keeping current stocks out of daily rows. If product requirements later demand historical stocks, add separate end-of-day stock fields and compute them from authoritative events through the end of each local business day. Never copy the materializer’s current totals into past dates.

Centralize metric definitions in a typed mapping used by materialization, DTO serialization, CSV export, and frontend labels. Use integer kobo for money and a decimal-safe/documented ratio representation. Ensure all date windows use `SHOPCITY_TIMEZONE` and all as-of queries apply the same watermark.

For redemption and cashier aggregates, derive values from authoritative source records and classify each event once. Keep allocation/lot and reversal joins explicit so reversed or pending records cannot inflate confirmed totals. Add deterministic ordering and bounded pagination for customer rankings and SMS drilldown.

## 2. Atomic refresh

Resolve the refresh idempotency key before materialization work. In one Prisma transaction, create-or-replay the idempotency record, append the refresh audit row, and create the outbox event. A duplicate key returns the stored result; a different request hash returns the existing conflict. The worker remains responsible for asynchronous materialization. Add unique constraints/lookup indexes only if the current schema does not already enforce the required replay invariant.

## 3. Card identity and replacement

Implement `normalizeCardSerial(value)` in shared server code. The helper must be deterministic, reject empty/invalid input, and be reused by DTO transforms and all service entry points. Persist only the normalized value. For existing rows, run a preflight collision report, backfill non-colliding values, resolve collisions explicitly, then add/enforce canonical uniqueness within tenant scope. The migration must be expand-and-contract and documented in the migration tracker.

Replacement remains one transaction: lock/check the active card, update the old card, create the new card with normalized identity, create fraud evaluation evidence, create the replacement SMS intent/outbox event, audit, and complete idempotency. Use the existing outbox uniqueness and state-transition protections to guarantee one notification. The replacement SMS payload contains masked suffixes only.

The frontend adds a confirmation step for blocking but the backend remains the authority. Do not rely on confirmation for authorization or state validation.

## 4. SMS lifecycle and inspection

Create a notification query service that resolves a transaction under tenant/branch authorization and returns its related SMS messages with masked destination and redacted errors. Add the Supervisor/Admin route and OpenAPI contract. Reuse existing status transitions and avoid exposing provider payloads.

Define status aggregation from durable message/outbox fields. `queuedCount` means current queue state; `submittedCount`/`totalCount` means all intents in the documented period. Retry and dead-letter counts must be derived from attempt history or durable counters with an explicit counting rule.

Before implementing DLR, verify the provider’s callback contract. If available, validate signature/authentication, correlate by provider reference, apply idempotent monotonic transitions, and audit callback outcomes. If unavailable, change labels/documentation to submission state and do not create synthetic `DELIVERED` records.

Update worker reconstruction by template family. Expiry reminders require customer and expiry data; transaction templates require a transaction. Missing required source data becomes a visible invalid/dead-letter outcome with a reason.

## 5. Verification strategy

Use unit tests for pure normalization, metric classification, status aggregation, ranking tie-breaks, callback transitions, and template-aware reconstruction. Use integration tests with multiple dates, branches, reversals, approvals, FIFO allocations, retries, and empty fixtures. Use controller tests for RBAC, masking, date/as-of validation, and pagination. Use Playwright for report rankings, SMS inspection/failure drilldown, and block confirmation. Use OpenAPI generation/diff checks where DTOs/routes change.

Run targeted tests first, then lint/typecheck/build, full Jest/integration suites, Semgrep, affected browser suites, OpenSpec validation, GitNexus `detect_changes()`, and final diff/status review. Record schema/contract changes and residual DLR/provider-cost limitations in the appropriate runbooks.
