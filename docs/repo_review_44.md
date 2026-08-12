# Sprint 4 review — latest head

**Current head:** `d9c79be15f6fa002bdff3b784b10e66c60d7ded9` — `fix: close sprint 4 review 43 gaps`.

**Review baseline:** `b766d05d43ec10f558b3ca9103ae21975b5a6de6`

## Verdict

**Sprint 3:** **98/100 — PASS, remains closed**

**Sprint 4:** **94/100 — PASS**

### **Decision: GO for Sprint 5**

The implementation has now crossed your 90% move-on threshold, and I no longer see a Sprint 4 **P1 correctness blocker** in the six areas we were tracking.

There is still a distinction between **engineering completion** and **formal release certification**: the current implementation is good enough to proceed to Sprint 5, while the final immutable-SHA/remote-CI bookkeeping remains unfinished.

| Sprint 4 area                |   Previous |    Current |
| ---------------------------- | ---------: | ---------: |
| Offline sync core            |      28/30 |  **29/30** |
| Offline conflict/concurrency |       7/10 |   **9/10** |
| Fraud                        |      19/20 |  **19/20** |
| Reporting/read models        |      16/20 |  **19/20** |
| Reports/exports              |       9/10 |  **10/10** |
| Contracts/docs               |        3/5 |    **4/5** |
| CI/migration/regression      |        2/5 |    **4/5** |
| **Total**                    | **84/100** | **94/100** |

---

# 1. Historical redemption reporting — CLOSED

This was previously the largest blocker.

### `rejectedAt` is now part of the reporting source

`RedemptionRecord` now contains:

```ts
requestedAt;
confirmedAt;
rejectedAt;
reversedAt;
```

and Prisma explicitly selects `rejectedAt`.

### Current mutable status is no longer used for reconstruction

`redemptionStatusAt()` now builds timestamped transitions and chooses the latest transition at or before `asOf`:

```ts
requestedAt -> PENDING_APPROVAL
confirmedAt -> CONFIRMED
rejectedAt  -> REJECTED
reversedAt  -> REVERSED
```

There is no dependency on today's `Redemption.status`.

That closes the future-rejection leakage problem.

The test explicitly verifies that:

```text
requested Aug 1
rejected Aug 10
asOf Aug 5
```

still resolves to `PENDING_APPROVAL`.

### Daily financial reporting now uses the same historical state

The previous defect:

```ts
if (redemption.status === 'CONFIRMED')
```

has been replaced with:

```ts
const snapshotStatus = redemptionStatusAt(redemption, asOf);

if (snapshotStatus === 'CONFIRMED') {
  ...
}
```

That means the executive/daily financial read model and redemption report now agree on the same historical watermark.

The materializer regression covers a redemption whose **current state is REVERSED**, but whose reversal occurs after the report watermark; both redemption summary and daily financial summary correctly count it as confirmed.

**This P1 is closed.**

---

# 2. Historical SMS reconstruction — CLOSED for Sprint 4 scope

The implementation now uses **latest lifecycle transition wins**, rather than a fixed status-priority ladder.

`smsStatusAt()` builds:

```text
queuedAt      -> QUEUED
sentAt        -> SENT
deliveredAt   -> DELIVERED
failedAt      -> FAILED
suppressedAt  -> SUPPRESSED
```

then selects the latest timestamp `<= asOf`.

The tests now cover:

```text
09:00 QUEUED
09:05 FAILED
09:15 SENT
09:16 DELIVERED
```

and correctly return `FAILED` for an `asOf` between failure and retry success.

## Failure evidence is preserved

Successful dispatch no longer does:

```ts
failedAt: null;
```

for `SENT` or `DELIVERED`.

There is also an explicit worker regression proving a successful retry does **not** include a `failedAt` overwrite.

### Residual limitation

The current model preserves the **most recent failure timestamp**, not an append-only history of every SMS attempt.

The project design explicitly acknowledges this and says multiple failures between successes would require a future `SmsDeliveryAttempt` table.

That is acceptable for the frozen Sprint 4 scope, so I am **not treating it as a blocker**.

---

# 3. Offline replay ownership race — CLOSED

The dangerous code previously did this after a follower timed out:

```ts
return this.persistResult(...SYNC_RECORD_PROCESSING...)
```

That allowed the follower to overwrite the owner's canonical result.

It now returns the transient state directly:

```ts
return {
  localId: record.localId,
  status: 'RETRYABLE',
  errorCode: 'SYNC_RECORD_PROCESSING',
  retryable: true,
};
```

without calling `persistResult()`.

This establishes the correct ownership model:

> only the request that created the `OfflineSyncAttempt` can finalize it.

There is now a focused regression asserting that the follower returns the retryable processing response and that:

```ts
expect(update).not.toHaveBeenCalled();
```

**The canonical overwrite race is closed.**

---

# 4. Receipt-boundary concurrency matrix — substantially CLOSED

This was one of the biggest evidence gaps.

The integration suite now has all three missing scenarios.

### Offline → online

Offline succeeds first; subsequent online capture of the same receipt is rejected. The test then asserts exactly one financial effect.

### Online ↔ offline concurrent race

Both flows are launched concurrently:

```ts
await Promise.allSettled([
  loyaltyService.earn(...),
  offlineSyncService.earnBatch(...),
]);
```

and the database is checked for exactly:

- one receipt;
- one earn ledger entry;
- one credit lot.

### Offline ↔ offline with distinct identities

The second request explicitly gets:

```ts
localId: randomUUID(),
idempotencyKey: randomUUID(),
```

while keeping the same canonical receipt, then races both requests.

Again:

```text
receipt = 1
ledger = 1
lot = 1
```

is asserted.

### Why I give 9/10 rather than 10/10

The concurrent tests use `Promise.allSettled()` but primarily assert the **database invariant**, not the exact domain result returned by the losing racer.

For financial correctness that is the most important invariant, so this is not a blocker.

A final polish test should assert that the loser is a recognized duplicate/conflict outcome rather than an arbitrary exception.

---

# 5. Real `report.refresh` integration — CLOSED

This is now materially stronger than the previous string-inspection/unit-only evidence.

The integration test creates:

```text
real PostgreSQL
real Redis test environment
real OutboxWorkerRuntime
real ReportMaterializerService
real PENDING report.refresh row
```

It then proves:

```text
PENDING
→ recovery
→ queue publication
→ worker
→ materializer
→ report materialization state
→ COMPLETED + processedAt
```

It also manually rewinds the same event into a stale:

```text
PUBLISHED
processedAt = null
publishedAt = old timestamp
```

and proves recovery completes it again safely.

**The report-refresh evidence blocker is closed.**

### Small remaining test gap

The Review 43 tracker still has one acceptance item unchecked:

> Assert completed/dead-lettered report refresh events are excluded from recovery.

The production SQL already filters:

```text
deadLetteredAt IS NULL
processedAt IS NULL
```

so I classify this as **missing explicit acceptance evidence**, not a runtime correctness defect.

---

# 6. Tracker reconciliation — effectively CLOSED

The earlier contradictory trackers are now clearly marked as historical/superseded.

The older final-gate tracker explicitly points Review 43 reporting/offline claims to the newer tracker.

The much older Sprint 4 tracker also now states that it is superseded and should not be used as the current completion source.

That is a much better solution than retroactively checking dozens of stale historical boxes.

The Review 43 tracker itself shows essentially all engineering work complete; its remaining items are:

- explicit completed/dead-letter report-refresh exclusion test;
- final immutable release SHA / CI.

---

# 7. Local validation is now strong

The evidence record says the current Review 43 closure ran:

- targeted report/offline/outbox tests;
- formatting;
- source/test lint;
- typecheck;
- build;
- architecture;
- complete Jest unit suite;
- critical coverage;
- full integration;
- E2E;
- OpenAPI lint/diff;
- client generation/typecheck;
- OpenSpec;
- release artifact verification;
- scope validation;
- Prisma migrations;
- Bruno journeys.

That is a sufficiently broad local regression suite to move the CI/regression score from 2/5 to **4/5**.

---

# 8. The one formal gate still unfinished: immutable SHA + GitHub CI

The evidence file still says:

```text
Release candidate SHA: _pending final commit and CI run_
```

and instructs the team to capture the final SHA and GitHub Actions URL after push.

Likewise the current tracker still leaves:

```text
[ ] 7.6 Push the final SHA and watch GitHub CI until
        Static Checks
        Integration Tests
        End-to-End Tests
        GitNexus
    are green.
```

I checked `d9c79be` through the GitHub connector:

- combined statuses: none;
- PR-triggered workflow runs: none.

So this is still **unverified CI**, not failed CI.

---

# Remaining work before declaring Sprint 4 100%

At this point I would **not do another general Sprint 4 implementation cycle**.

There are only four cleanup/certification items worth doing:

1. Add the explicit completed/dead-lettered `report.refresh` recovery exclusion regression.
2. Strengthen concurrent receipt tests to assert the losing request produces an expected duplicate/conflict outcome, not merely that financial counts remain one.
3. Replace `_pending final commit and CI run_` with the actual certified SHA.
4. Run GitHub Actions on that exact SHA and record the green run.

The multi-failure SMS history limitation can be carried forward as a later hardening improvement because Review 43 explicitly scoped Sprint 4 to preserving the most recent failure watermark rather than building append-only attempt history.

## Final assessment

**Sprint 4: 94/100 — PASS**

**Engineering decision: GO to Sprint 5.**

I would now freeze Sprint 4 feature development. The remaining items are **release-certification and evidence polish**, not reasons to keep delaying the next sprint.
