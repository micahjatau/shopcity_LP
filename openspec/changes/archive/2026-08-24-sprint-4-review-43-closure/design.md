## Context

Review 43 narrowed the Sprint 4 blocker set to six closure items: historical redemption reporting, SMS historical state, offline replay ownership, receipt-boundary races, report-refresh integration evidence, and final tracker/evidence certification. This design intentionally minimizes runtime changes and preserves the Sprint 2/3 financial model.

## Design Goals

- Reconstruct report history from lifecycle timestamps at or before `asOf`.
- Ensure all report builders see the same normalized redemption/SMS state for a given watermark.
- Preserve enough SMS failure evidence for Sprint 4 historical reporting without introducing an avoidable schema migration.
- Guarantee only the owner request finalizes canonical offline sync attempt rows.
- Prove exactly-one financial effect across same-receipt online/offline concurrency boundaries.
- Produce final release evidence that is true for the exact SHA being certified.

## Reporting Reconstruction

### Redemption lifecycle

`ReportMaterializerService` should select `rejectedAt` wherever redemption source rows are loaded. `RedemptionRecord` and any normalized report-source type should include:

- `requestedAt`
- `confirmedAt`
- `rejectedAt`
- `reversedAt`
- financial amounts needed for totals

`redemptionStatusAt()` should stop depending on current `status`. The state order is timestamp-driven:

1. no `requestedAt <= asOf` means the record is outside the snapshot;
2. latest transition at or before `asOf` wins among confirmed/rejected/reversed;
3. if no later transition exists, the record is `PENDING_APPROVAL` from `requestedAt` onward.

If business rules disallow some transition order (for example rejected after confirmed), tests should still assert deterministic behavior: the latest valid timestamp at or before `asOf` is the historical state.

### Daily financial summaries

`buildDailyFinancialSummaries()` must use the same snapshot status used by redemption summaries. For redemption totals:

```ts
const snapshotStatus = redemptionStatusAt(redemption, asOf);
if (snapshotStatus === 'CONFIRMED') {
  // include confirmed/requested amount in redeemed totals
}
```

Do not read `redemption.status === 'CONFIRMED'` for historical totals.

Prefer a single normalization pass before invoking report builders, for example:

```ts
type RedemptionSnapshotRecord = RedemptionRecord & {
  snapshotStatus: RedemptionSnapshotStatus;
};
```

All builders would then consume `snapshotStatus` rather than recomputing or reading current state.

## SMS Historical State

### Latest transition wins

`smsStatusAt()` should evaluate all lifecycle transition timestamps and return the state associated with the latest timestamp at or before `asOf`:

- `queuedAt` → `QUEUED`
- `sentAt` → `SENT`
- `deliveredAt` → `DELIVERED`
- `failedAt` → `FAILED`
- `suppressedAt` → `SUPPRESSED`

Fixed priority is incorrect because it can report `DELIVERED` even when `FAILED` happened later.

Tie handling should be deterministic. If multiple timestamps are equal, terminal/business-specific priority can break ties in a documented order, but tests should avoid relying on ambiguous equal timestamps.

### Preserve failure evidence

`mapSmsDispatchResult()` currently clears `failedAt` on later `SENT`, `DELIVERED`, and `SUPPRESSED` updates. To preserve Sprint 4 history, successful or suppressed retry updates should not erase `failedAt`.

Expected minimal update behavior:

- `FAILED`: set/update `failedAt = now`.
- `SENT`: set `sentAt = now`; leave existing `failedAt` unchanged.
- `DELIVERED`: set `sentAt = now`, `deliveredAt = now`; leave existing `failedAt` unchanged.
- `SUPPRESSED`: set `suppressedAt = now`; leave existing `failedAt` unchanged.

This preserves the most recent failure watermark. If multiple failures between successes become a required report dimension, the design should move to an append-only `SmsDeliveryAttempt` table under a separate migration proposal.

## Offline Replay Ownership

The current follower path waits for an existing attempt then persists `SYNC_RECORD_PROCESSING` into the canonical row if the owner takes too long. That can overwrite a valid owner result or return a non-exact replay.

Minimal correction:

- The request that successfully creates the `OfflineSyncAttempt` is the owner and may call `persistResult()`.
- Requests that find an existing attempt are followers.
- Followers may:
  - return `responseJson` when present;
  - wait/poll boundedly for `responseJson`;
  - return an ephemeral retryable `SYNC_RECORD_PROCESSING` result if still pending.
- Followers must never call `persistResult()` for the existing canonical attempt unless they first acquire an explicit ownership claim/lock.

This keeps canonical state monotonic: `RETRYABLE` placeholder from creation can only be replaced by the owner’s final result.

## Receipt-Boundary Concurrency Evidence

Review 43 requires three missing matrix entries:

1. Offline succeeds first, then online submits the same canonical receipt with a different idempotency key; online must deterministically lose without additional receipt, ledger, lot, outbox, or approval side effects.
2. Online and offline submit the same canonical receipt concurrently with different idempotency keys and different offline `localId`; exactly one path wins, and totals remain one receipt, one earn ledger entry, one credit lot, and one SMS/fraud outbox effect as applicable.
3. Two offline requests submit the same canonical receipt concurrently using different `localId` and idempotency keys; exactly one financial effect is committed and the loser is deterministic/retry-safe.

Tests should assert database counts, not just response status.

## Report Refresh Integration Evidence

The source blocker for `report.refresh` is closed, but Review 43 asks for end-to-end evidence. Add an integration spec that exercises:

- clean migrated PostgreSQL and Redis/Testcontainers setup;
- persisted `OutboxEvent` with `eventType='report.refresh'`, `status='PENDING'`, and eligible `nextAttemptAt`;
- recovery/publish via real `OutboxWorkerRuntime`;
- worker execution with real `ReportMaterializerService`;
- materialization state/read-model rows created;
- outbox event terminal `COMPLETED` with `processedAt` set;
- stale `PUBLISHED`/`processedAt=null` recovery completing safely;
- completed events excluded from subsequent recovery.

Use bounded polling helpers instead of arbitrary sleeps.

## Tracker and Evidence Reconciliation

- Keep `sprint-4-review-43-closure/tasks.md` unchecked until implementation evidence exists.
- Update prior Sprint 4 trackers so claims from `sprint-4-final-gate-closure` are not overstated; use notes like “superseded by Review 43 closure” when needed.
- Update final evidence with the actual final SHA after all local gates pass and GitHub CI is green.

## Risks

- HIGH: SMS worker state updates (`mapSmsDispatchResult`) can affect retry and terminal-state semantics. Require focused tests around failure → retry success.
- MEDIUM: Reporting materialization changes can affect report totals. Require cross-report consistency assertions for the same `asOf`.
- LOW but correctness-critical: offline replay ownership is localized but protects canonical sync state under contention.
