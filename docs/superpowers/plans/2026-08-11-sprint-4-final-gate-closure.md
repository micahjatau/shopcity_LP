# Sprint 4 Final Gate Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Sprint 4 correctness and evidence gaps from code baseline `bfbd110408c4ffda3483303098dd7d088c3745ab` and produce one immutable release-candidate SHA that satisfies the >=90% move-on gate for Sprint 5.

**Architecture:** Keep the existing modular-monolith and durable outbox architecture. Add pure lifecycle/time-window helpers for logic that must be deterministic, keep `ReportMaterializerService` and `OutboxWorkerRuntime` as orchestration layers, and expand PostgreSQL integration tests around the exact failure boundaries that remain unproven. Do not redesign settled Sprint 3 financial paths.

**Tech Stack:** NestJS 11, TypeScript 5.7, Prisma 6/PostgreSQL 16, BullMQ/Redis, Jest 30, Testcontainers, OpenSpec, OpenAPI/Spectral/OASDiff, Orval.

## Global Constraints

- Code baseline for this plan is `bfbd110408c4ffda3483303098dd7d088c3745ab`; the plan-document commit itself is not evidence of implementation progress.
- Sprint 3 remains closed at 98/100. Do not alter ledger immutability, FIFO allocation, exact-lot reversal, approval execution, or negative-balance protections unless a new regression proves a change is required.
- The Sprint 4 move-on threshold is >=90/100, but a numerical score cannot override an open P1 correctness defect.
- Money remains integer kobo end-to-end; no floating-point financial calculations.
- Historical reporting must derive state from timestamps/evidence at or before `asOf`; it must not read mutable current status as historical truth.
- `report.refresh` must remain durable through the outbox; do not return to detached in-process promises.
- Offline redemption remains prohibited. This plan only expands offline earn acceptance evidence.
- Keep public API contracts unchanged unless implementation forces a contract change. If a contract changes, regenerate OpenAPI and `client/shopcity-client.ts`; never hand-edit the generated client.
- No new database migration is expected for Tasks 1-6 because the required lifecycle timestamps already exist in Prisma. If implementation proves a schema change is necessary, stop and review the migration separately before proceeding.
- Every task follows TDD: failing regression first, minimal implementation second, focused verification third, commit last.
- Final release evidence must all refer to one immutable SHA.

## Target Gate

The implementation is ready to move to Sprint 5 only when all of the following are true on one SHA:

1. `report.refresh` progresses from durable `PENDING` outbox row to materialization and terminal `COMPLETED` state, including stale-event recovery.
2. Historical redemption summaries reconstruct pending/confirmed/rejected/reversed state from lifecycle timestamps at `asOf`.
3. Historical SMS summaries reconstruct queued/sent/delivered/failed/suppressed state from lifecycle timestamps at `asOf`.
4. Fraud branch-day windows represent real branch-local midnight boundaries in UTC, not UTC midnight mislabeled as local midnight.
5. Offline actor mismatch, expired-record, device/branch/card/staff rejection paths prove zero financial mutation.
6. Online-to-offline, offline-to-online, and simultaneous duplicate-receipt boundaries produce exactly one financial effect.
7. OpenSpec trackers and Sprint 4 documentation agree with executable evidence.
8. Static validation, unit tests, integration tests, E2E, architecture checks, OpenAPI/client checks, migrations, and GitHub CI are green on the same final SHA.

---

## File Map

### New files

- `src/modules/reports/report-snapshot.ts` — pure historical lifecycle reconstruction for redemption and SMS state.
- `src/modules/reports/report-snapshot.spec.ts` — deterministic unit tests for lifecycle reconstruction before/after later state changes.
- `src/jobs/branch-day-window.ts` — pure timezone helper that converts a branch-local calendar day to its exact UTC start/end instants.
- `src/jobs/branch-day-window.spec.ts` — Lagos and DST-zone boundary tests for branch-day window conversion.
- `test/report-refresh-outbox.int-spec.ts` — PostgreSQL/Redis outbox acceptance for report refresh publication, execution, terminalization, and stale recovery.
- `test/offline-receipt-boundary.int-spec.ts` — online/offline duplicate race matrix and exactly-one-financial-effect assertions.
- `docs/sprint-4-final-gate-evidence.md` — final immutable-SHA command/evidence record created only after all implementation tasks pass.

### Existing files to modify

- `src/jobs/outbox-worker.runtime.ts` — include `report.refresh` in publisher/recovery eligibility and stale-published recovery.
- `src/jobs/outbox-worker.runtime.spec.ts` — unit regression for report-refresh recovery eligibility and processed-event exclusion.
- `src/modules/reports/report-materializer.service.ts` — select lifecycle timestamps and normalize redemptions/SMS to state-at-watermark before report builders consume them.
- `src/modules/reports/report-materializer.service.spec.ts` — focused orchestration regression proving normalized source state is used.
- `test/report-materialization.int-spec.ts` — historical redemption/SMS end-to-end snapshots before and after later transitions.
- `src/jobs/fraud-behavior.runtime.ts` — replace UTC-midnight approximation with the shared branch-day helper.
- `src/jobs/fraud-behavior.runtime.spec.ts` and/or `test/fraud-behavior.int-spec.ts` — verify dedupe window and evidence match true branch-local day boundaries.
- `test/offline-earn-sync.int-spec.ts` — actor/expiry/device/branch/card/staff rejection evidence and zero-mutation assertions.
- `openspec/changes/sprint-4-correctness-closure/tasks.md` — reconcile checked items with final evidence.
- `openspec/changes/sprint-4-offline-fraud-reports/tasks.md` — update the older Sprint 4 tracker so it no longer contradicts the closure tracker.
- `docs/sprint_4_plan.md` — record final acceptance evidence and gate result.
- `docs/development/gitnexus-impact-tracker.md` — record impact analysis for final reporting/outbox/offline changes.

---

# Track A — Remaining P1 Reporting Correctness

### Task 1: Make `report.refresh` publishable, recoverable, and terminal

**Files:**

- Modify: `src/jobs/outbox-worker.runtime.ts`
- Modify: `src/jobs/outbox-worker.runtime.spec.ts`
- Create: `test/report-refresh-outbox.int-spec.ts`
- Test support: reuse existing BullMQ/outbox Testcontainers helpers where available; otherwise instantiate `OutboxWorkerRuntime` with the same Redis/Postgres pattern used by existing outbox integration coverage.

**Interfaces:**

- Consumes: `OutboxEvent.eventType = 'report.refresh'`, `ReportMaterializerService.materializeBranch(...)`, `ReportMaterializerService.rebuildTenant(...)`.
- Produces: recovery eligibility for `report.refresh` and terminal state `status=COMPLETED`, `processedAt != null` after successful materialization.

- [ ] **Step 1: Write a failing worker recovery unit test for `report.refresh`**

Add a test that seeds a `PENDING` report refresh event into the recovery stub and invokes the private recovery cycle through the same typed test adapter already used for private runtime methods. Assert that the event is selected/published instead of ignored.

The expected event shape is:

```ts
{
  tenantId: 'tenant-1',
  aggregateType: 'report',
  aggregateId: 'executive-summary',
  eventType: 'report.refresh',
  payload: {
    version: 1,
    report: 'executive-summary',
    branchId: null,
    timezone: 'Africa/Lagos',
  },
  status: 'PENDING',
  processedAt: null,
}
```

Also add a second assertion that the same row with `processedAt` populated is not recoverable.

- [ ] **Step 2: Run the focused unit test and confirm the current defect**

Run:

```bash
npx jest src/jobs/outbox-worker.runtime.spec.ts --runInBand
```

Expected before implementation: the new `report.refresh` recovery assertion fails because the recovery SQL only admits `sms.send` and `fraud.evaluate`.

- [ ] **Step 3: Extend recovery eligibility without changing SMS semantics**

Change the recovery predicate from the current two-event whitelist to:

```sql
WHERE "eventType" IN ('sms.send', 'fraud.evaluate', 'report.refresh')
  AND "deadLetteredAt" IS NULL
  AND "processedAt" IS NULL
```

For stale `PUBLISHED` events, treat `report.refresh` like `fraud.evaluate`: it is recoverable while `processedAt IS NULL` because materialization is rebuild/idempotent and guarded by the tenant advisory lock.

The intended stale branch is structurally:

```sql
OR (
  "status" = 'PUBLISHED'
  AND "publishedAt" <= ${staleCutoff}
  AND (
    -- existing SMS recovery rules
    ...
    OR "eventType" IN ('fraud.evaluate', 'report.refresh')
  )
)
```

Do not weaken the existing SMS-message-specific checks.

- [ ] **Step 4: Add the integration test proving the complete lifecycle**

In `test/report-refresh-outbox.int-spec.ts`:

1. apply all Prisma migrations to a clean PostgreSQL Testcontainer;
2. create tenant/branch minimum source data;
3. create a `report.refresh` event with `status=PENDING` and `nextAttemptAt=now`;
4. start the outbox runtime with a real `ReportMaterializerService`;
5. trigger one recovery/publish cycle;
6. wait for the worker to process the job;
7. assert a report materialization state/row exists;
8. assert the outbox event is `COMPLETED` with `processedAt` set;
9. reset the same event to stale `PUBLISHED`, `processedAt=null`, and old `publishedAt`, run recovery again, and prove it is safely recovered and completed;
10. run recovery once more after completion and prove no extra materialization attempt is scheduled.

Use bounded polling rather than arbitrary sleep:

```ts
async function eventually<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const value = await read();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('condition was not reached');
}
```

- [ ] **Step 5: Run focused tests**

```bash
npx jest src/jobs/outbox-worker.runtime.spec.ts --runInBand
npx jest --config ./test/jest-int.json --runInBand test/report-refresh-outbox.int-spec.ts
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/jobs/outbox-worker.runtime.ts src/jobs/outbox-worker.runtime.spec.ts test/report-refresh-outbox.int-spec.ts
git commit -m "fix: recover durable report refresh events"
```

**Task gate:** A persisted `report.refresh` request must no longer be capable of sitting in `PENDING` indefinitely solely because the publisher ignores its event type.

---

### Task 2: Add pure historical lifecycle reconstruction

**Files:**

- Create: `src/modules/reports/report-snapshot.ts`
- Create: `src/modules/reports/report-snapshot.spec.ts`

**Interfaces:**

- Produces:

```ts
export type RedemptionSnapshotStatus =
  'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'REVERSED';

export type SmsSnapshotStatus =
  'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED';

export function redemptionStatusAt(
  input: {
    requestedAt: Date;
    confirmedAt: Date | null;
    rejectedAt: Date | null;
    reversedAt: Date | null;
  },
  asOf: Date,
): RedemptionSnapshotStatus;

export function smsStatusAt(
  input: {
    queuedAt: Date;
    sentAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    suppressedAt: Date | null;
  },
  asOf: Date,
): SmsSnapshotStatus;
```

- [ ] **Step 1: Write failing pure unit tests for redemption state-at-watermark**

Use one lifecycle with later reversal:

```ts
const redemption = {
  requestedAt: new Date('2026-08-01T09:00:00.000Z'),
  confirmedAt: new Date('2026-08-01T09:01:00.000Z'),
  rejectedAt: null,
  reversedAt: new Date('2026-08-10T12:00:00.000Z'),
};

expect(
  redemptionStatusAt(redemption, new Date('2026-08-01T09:00:30.000Z')),
).toBe('PENDING_APPROVAL');
expect(
  redemptionStatusAt(redemption, new Date('2026-08-05T00:00:00.000Z')),
).toBe('CONFIRMED');
expect(
  redemptionStatusAt(redemption, new Date('2026-08-11T00:00:00.000Z')),
).toBe('REVERSED');
```

Add a rejected lifecycle proving `REJECTED` is selected after `rejectedAt` and not before it.

- [ ] **Step 2: Write failing pure unit tests for SMS state-at-watermark**

Use a lifecycle with retry/failure then later success to force timestamp ordering rather than hard-coded priority:

```ts
const sms = {
  queuedAt: new Date('2026-08-01T09:00:00.000Z'),
  failedAt: new Date('2026-08-01T09:05:00.000Z'),
  sentAt: new Date('2026-08-01T09:10:00.000Z'),
  deliveredAt: new Date('2026-08-01T09:15:00.000Z'),
  suppressedAt: null,
};

expect(smsStatusAt(sms, new Date('2026-08-01T09:02:00.000Z'))).toBe('QUEUED');
expect(smsStatusAt(sms, new Date('2026-08-01T09:07:00.000Z'))).toBe('FAILED');
expect(smsStatusAt(sms, new Date('2026-08-01T09:12:00.000Z'))).toBe('SENT');
expect(smsStatusAt(sms, new Date('2026-08-01T09:20:00.000Z'))).toBe(
  'DELIVERED',
);
```

Add a suppression case.

- [ ] **Step 3: Run tests to verify they fail because the helper does not yet exist**

```bash
npx jest src/modules/reports/report-snapshot.spec.ts --runInBand
```

Expected: FAIL on missing module/functions.

- [ ] **Step 4: Implement timestamp-driven state selection**

Implement the helper using the latest lifecycle transition at or before `asOf`:

```ts
type StateEvent<T extends string> = { at: Date; status: T };

function latestStateAt<T extends string>(
  events: StateEvent<T>[],
  asOf: Date,
): T {
  const eligible = events
    .filter((event) => event.at <= asOf)
    .sort((left, right) => left.at.getTime() - right.at.getTime());

  if (eligible.length === 0) {
    throw new Error('snapshot requested before entity creation');
  }

  return eligible[eligible.length - 1]!.status;
}
```

Build redemption candidates from `requestedAt`, `confirmedAt`, `rejectedAt`, and `reversedAt`. Build SMS candidates from `queuedAt`, `failedAt`, `sentAt`, `deliveredAt`, and `suppressedAt`. Do not read the mutable current `status` column in these functions.

- [ ] **Step 5: Run focused unit tests**

```bash
npx jest src/modules/reports/report-snapshot.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reports/report-snapshot.ts src/modules/reports/report-snapshot.spec.ts
git commit -m "feat: reconstruct historical report lifecycle state"
```

**Task gate:** Given only lifecycle timestamps and `asOf`, historical redemption/SMS state is deterministic and independent of today's mutable status.

---

### Task 3: Integrate historical lifecycle reconstruction into report materialization

**Files:**

- Modify: `src/modules/reports/report-materializer.service.ts`
- Modify: `src/modules/reports/report-materializer.service.spec.ts`
- Modify: `test/report-materialization.int-spec.ts`

**Interfaces:**

- Consumes: `redemptionStatusAt(...)` and `smsStatusAt(...)` from Task 2.
- Produces: `SourceData.redemptions[].status` and `SourceData.smsMessages[].status` normalized to `asOf` before builders execute.

- [ ] **Step 1: Expand source-record types and Prisma selection**

Update `RedemptionRecord` to include `rejectedAt` and keep all lifecycle timestamps:

```ts
interface RedemptionRecord {
  id: string;
  branchId: string;
  customerId: string;
  requestedAmountKobo: bigint;
  confirmedAmountKobo: bigint | null;
  status: string;
  requestedAt: Date;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  reversedAt: Date | null;
}
```

Update `SmsMessageRecord` to include:

```ts
sentAt: Date | null;
deliveredAt: Date | null;
failedAt: Date | null;
suppressedAt: Date | null;
```

Add those columns to the Prisma `select` blocks.

- [ ] **Step 2: Write a failing unit regression proving loaded current status is ignored**

In `report-materializer.service.spec.ts`, return a redemption whose database row currently says `REVERSED`, with `confirmedAt` before `asOf` and `reversedAt` after `asOf`. Assert the materialized redemption summary reports confirmed value and zero reversed value at that earlier watermark.

Likewise return an SMS whose current status is `DELIVERED`, but `deliveredAt` is after `asOf`; assert the earlier materialization counts it as queued/sent according to the latest eligible timestamp.

- [ ] **Step 3: Normalize source rows after watermark filtering**

Replace direct use of mutable status with mapped historical state:

```ts
redemptions: redemptions
  .filter((redemption) => redemption.requestedAt <= asOf)
  .map((redemption) => ({
    ...redemption,
    status: redemptionStatusAt(redemption, asOf),
  })),

smsMessages: smsMessages
  .filter((sms) => sms.queuedAt <= asOf)
  .map((sms) => ({
    ...sms,
    status: smsStatusAt(sms, asOf),
  })),
```

Keep `buildRedemptionSummaries()` and `buildSmsSummaries()` simple; they should consume already-normalized snapshot state rather than reimplement lifecycle logic.

- [ ] **Step 4: Add a historical redemption integration regression**

Extend `test/report-materialization.int-spec.ts` with a direct authoritative redemption fixture using the existing tenant/branch/customer/card/device/cashier fixture. Create a redemption receipt and redemption with:

```ts
requestedAt = new Date('2026-08-01T09:00:00.000Z');
confirmedAt = new Date('2026-08-01T09:01:00.000Z');
reversedAt = new Date('2026-08-10T12:00:00.000Z');
status = 'REVERSED';
requestedAmountKobo = 5_000n;
confirmedAmountKobo = 5_000n;
```

Materialize at `2026-08-05T00:00:00.000Z` and assert:

```ts
confirmedKobo === 5_000n;
reversedKobo === 0n;
pendingApprovalCount === 0;
```

Materialize again at `2026-08-11T00:00:00.000Z` and assert:

```ts
confirmedKobo === 0n;
reversedKobo === 5_000n;
```

Use a unique receipt number/week so the fixture does not collide with the earn fixture.

- [ ] **Step 5: Add a historical SMS integration regression**

Use the SMS row already created by a confirmed earn. Read its `queuedAt`, then update today's row to a later final state:

```ts
const queuedAt = sms.queuedAt;
const sentAt = new Date(queuedAt.getTime() + 2 * 60 * 60 * 1000);
const deliveredAt = new Date(queuedAt.getTime() + 3 * 60 * 60 * 1000);

await prisma.smsMessage.update({
  where: { tenantId_id: { tenantId: tenant.id, id: sms.id } },
  data: { status: 'DELIVERED', sentAt, deliveredAt },
});
```

Materialize at `queuedAt + 1 hour`: `queuedCount=1`, `sentCount=0`, `deliveredCount=0`.

Materialize at `queuedAt + 2.5 hours`: `sentCount=1`, `deliveredCount=0`.

Materialize at `queuedAt + 4 hours`: `deliveredCount=1`.

- [ ] **Step 6: Run reporting tests**

```bash
npx jest src/modules/reports/report-snapshot.spec.ts src/modules/reports/report-materializer.service.spec.ts --runInBand
npx jest --config ./test/jest-int.json --runInBand test/report-materialization.int-spec.ts
```

Expected: PASS.

- [ ] **Step 7: Repeat the integration test three times**

```bash
for i in 1 2 3; do
  npx jest --config ./test/jest-int.json --runInBand test/report-materialization.int-spec.ts || exit 1
done
```

Expected: all three PASS.

- [ ] **Step 8: Commit**

```bash
git add src/modules/reports/report-materializer.service.ts src/modules/reports/report-materializer.service.spec.ts test/report-materialization.int-spec.ts
git commit -m "fix: materialize lifecycle state at report watermark"
```

**Task gate:** A later redemption reversal or SMS delivery must never leak into an earlier report watermark.

---

# Track B — Fraud Window Correctness and Offline Acceptance

### Task 4: Compute true branch-local day boundaries for behavioral fraud

**Files:**

- Create: `src/jobs/branch-day-window.ts`
- Create: `src/jobs/branch-day-window.spec.ts`
- Modify: `src/jobs/fraud-behavior.runtime.ts`
- Modify: `test/fraud-behavior.int-spec.ts` if integration evidence needs strengthening.

**Interfaces:**

- Produces:

```ts
export function branchDayWindow(
  instant: Date,
  timeZone: string,
): { windowStart: Date; windowEnd: Date; dayKey: string };
```

- [ ] **Step 1: Write failing Lagos boundary tests**

For `Africa/Lagos`, local midnight is UTC-1 hour relative to local clock:

```ts
const window = branchDayWindow(
  new Date('2026-08-11T14:00:00.000Z'),
  'Africa/Lagos',
);

expect(window.dayKey).toBe('2026-08-11');
expect(window.windowStart.toISOString()).toBe('2026-08-10T23:00:00.000Z');
expect(window.windowEnd.toISOString()).toBe('2026-08-11T23:00:00.000Z');
```

- [ ] **Step 2: Add a DST regression so the helper is not hard-coded to 24 UTC hours**

Use `America/New_York` around a DST boundary. The test must assert `windowEnd` is the next local midnight converted independently to UTC rather than `windowStart + 24h`.

For the 2026 spring transition day, assert the UTC interval is 23 hours; for the fall transition day, assert 25 hours. Use `Intl.DateTimeFormat` in the implementation and exact expected ISO instants in the tests.

- [ ] **Step 3: Run the helper tests and confirm failure**

```bash
npx jest src/jobs/branch-day-window.spec.ts --runInBand
```

Expected before implementation: FAIL because helper does not exist.

- [ ] **Step 4: Implement a timezone-safe conversion without adding a dependency**

Use `Intl.DateTimeFormat(..., { timeZone, year, month, day, hour, minute, second, hourCycle: 'h23' })` to obtain local parts and iteratively solve local midnight to UTC. Compute the next calendar date first, then convert that local midnight independently. Do not derive `windowEnd` using `windowStart.getTime() + 86400000`.

The helper must return a stable `dayKey` (`YYYY-MM-DD`) derived from the branch-local date.

- [ ] **Step 5: Replace `FraudBehaviorRuntime.localDayWindow()` and `dayKey()` duplication**

In `fraud-behavior.runtime.ts`, import `branchDayWindow()`. Receipt/card/cashier/rounded rules should use:

```ts
const { windowStart, windowEnd, dayKey } = branchDayWindow(
  receipt.occurredAt,
  receipt.branch.timezone,
);
```

Use `dayKey` in daily dedupe keys and exact `windowStart/windowEnd` in evidence/query boundaries.

For reversal/replacement/auth rules whose configured window is not a calendar day, preserve their configured rolling windows; only use a day key where the rule specification is explicitly day-based.

- [ ] **Step 6: Run fraud tests**

```bash
npx jest src/jobs/branch-day-window.spec.ts src/jobs/fraud-behavior.runtime.spec.ts --runInBand
npx jest --config ./test/jest-int.json --runInBand test/fraud-behavior.int-spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/jobs/branch-day-window.ts src/jobs/branch-day-window.spec.ts src/jobs/fraud-behavior.runtime.ts test/fraud-behavior.int-spec.ts
git commit -m "fix: align fraud windows to branch local day"
```

**Task gate:** Daily fraud evidence for Lagos `2026-08-11` must start at `2026-08-10T23:00:00Z`, and DST-capable branches must have correct 23/25-hour local days.

---

### Task 5: Complete offline validation/rejection acceptance evidence

**Files:**

- Modify: `test/offline-earn-sync.int-spec.ts`
- Modify implementation only if a new test exposes a real defect: `src/modules/offline-sync/offline-sync.service.ts`

**Interfaces:**

- Consumes existing error codes: `SYNC_ACTOR_MISMATCH`, `SYNC_DEVICE_MISMATCH`, `SYNC_BRANCH_MISMATCH`, `SYNC_RECORD_EXPIRED`, `SYNC_WEEK_MISMATCH`, `CARD_INACTIVE`, `STAFF_INELIGIBLE`.
- Produces executable evidence that every rejected record has zero receipt/ledger/lot financial mutation.

- [ ] **Step 1: Add a reusable zero-financial-effect assertion**

In the integration test define:

```ts
async function expectNoFinancialEffect(
  prisma: PrismaService,
  tenantId: string,
  receiptNumber: string,
) {
  const [receipts, ledgers, lots] = await Promise.all([
    prisma.receipt.count({
      where: { tenantId, posReceiptNumber: receiptNumber },
    }),
    prisma.loyaltyLedgerEntry.count({
      where: { tenantId, receipt: { posReceiptNumber: receiptNumber } },
    }),
    prisma.creditLot.count({
      where: {
        tenantId,
        earnLedgerEntry: { receipt: { posReceiptNumber: receiptNumber } },
      },
    }),
  ]);

  expect([receipts, ledgers, lots]).toEqual([0, 0, 0]);
}
```

If Prisma relation filtering does not allow the lot query in the generated client, resolve the ledger IDs first and assert no lots exist for those IDs. Do not weaken the assertion to receipt-only evidence.

- [ ] **Step 2: Add batch-level non-cashier actor rejection**

Call `earnBatch()` with a supervisor/admin actor and assert the thrown domain response contains `SYNC_ACTOR_MISMATCH`. Assert no `OfflineSyncAttempt` and no financial rows are created.

- [ ] **Step 3: Add record-level cashier mismatch rejection**

Keep the authenticated actor as the valid cashier but change `record.cashierId` to another user. Assert:

```ts
{
  status: 'REJECTED',
  errorCode: 'SYNC_ACTOR_MISMATCH',
  retryable: false,
}
```

Then call `expectNoFinancialEffect(...)`.

- [ ] **Step 4: Add expired-record rejection**

Set `occurredAtLocal` older than `OFFLINE_EARN_MAX_AGE_HOURS` by one minute:

```ts
const expiredAt = new Date(
  Date.now() - (DEFAULT_POLICY.OFFLINE_EARN_MAX_AGE_HOURS * 60 + 1) * 60_000,
).toISOString();
```

Recompute the submitted receipt week from that timestamp so the record fails specifically on age, not week validation. Assert `SYNC_RECORD_EXPIRED` and zero financial effect.

- [ ] **Step 5: Add device and branch mismatch cases**

Cover both:

1. request/session device mismatch, which should fail the batch with `SYNC_DEVICE_MISMATCH` before record processing;
2. record branch mismatch, which should return `SYNC_BRANCH_MISMATCH` for that record and preserve neighboring valid records in a mixed batch.

Assert zero financial effect for rejected receipt numbers.

- [ ] **Step 6: Add inactive/replaced-card and staff-customer cases**

For inactive/replaced card:

```ts
await prisma.card.update({
  where: { id: fixture.card.id },
  data: { status: 'REPLACED', replacedAt: new Date() },
});
```

Assert `CARD_INACTIVE` and zero financial effect.

For staff customer:

```ts
await prisma.customer.update({
  where: { id: fixture.customer.id },
  data: { isStaff: true },
});
```

Assert `STAFF_INELIGIBLE` and zero financial effect.

- [ ] **Step 7: Run the complete offline foundation integration test three times**

```bash
for i in 1 2 3; do
  npx jest --config ./test/jest-int.json --runInBand test/offline-earn-sync.int-spec.ts || exit 1
done
```

Expected: all three PASS.

- [ ] **Step 8: Commit**

```bash
git add test/offline-earn-sync.int-spec.ts src/modules/offline-sync/offline-sync.service.ts
git commit -m "test: complete offline rejection acceptance matrix"
```

**Task gate:** Every documented invalid offline earn condition covered by this task must have deterministic error evidence and zero financial mutation.

---

### Task 6: Prove the online/offline duplicate-receipt boundary under concurrency

**Files:**

- Create: `test/offline-receipt-boundary.int-spec.ts`
- Modify implementation only if tests expose a defect: `src/modules/offline-sync/offline-sync.service.ts`, `src/modules/loyalty/loyalty.service.ts`, or duplicate-evidence helpers.

**Interfaces:**

- Consumes: `LoyaltyService.earn(...)`, `OfflineSyncService.earnBatch(...)`, database receipt uniqueness, existing duplicate-attempt evidence path.
- Produces: exactly one receipt, one earn ledger effect, one credit lot, and one duplicate rejection/evidence observation for the same canonical receipt.

- [ ] **Step 1: Build one shared fixture for online and offline submission**

The fixture must expose:

```ts
{
  tenantId,
  branchId,
  cashier,
  actor,
  device,
  customer,
  card,
  posReceiptNumber,
  occurredAt,
  receiptWeekStart,
}
```

Both online and offline calls must use the same normalized receipt number, branch, week, card, purchase amount, and occurred time, but different idempotency keys/local IDs.

- [ ] **Step 2: Add online-then-offline sequential acceptance**

1. call `LoyaltyService.earn()` and assert confirmed;
2. submit the same receipt via `OfflineSyncService.earnBatch()`;
3. assert offline result is `REJECTED/RECEIPT_ALREADY_USED`;
4. assert exactly one receipt, one EARN ledger entry, and one credit lot;
5. assert duplicate-attempt audit/fraud work exists.

- [ ] **Step 3: Add offline-then-online sequential acceptance**

1. submit the offline earn and assert confirmed;
2. call online earn with the same receipt and a different idempotency key;
3. assert online call rejects with `RECEIPT_ALREADY_USED`;
4. assert exactly one financial effect and duplicate evidence survives.

- [ ] **Step 4: Add simultaneous online/offline race**

Launch both operations without awaiting either first:

```ts
const [online, offline] = await Promise.allSettled([
  loyaltyService.earn(tenantId, actor, onlineIdempotencyKey, onlinePayload),
  offlineSyncService.earnBatch(tenantId, actor, offlinePayload),
]);
```

Accept either side as the winner. The invariant is:

```ts
expect(await prisma.receipt.count({ where: canonicalReceiptWhere })).toBe(1);
expect(
  await prisma.loyaltyLedgerEntry.count({ where: canonicalEarnWhere }),
).toBe(1);
expect(await prisma.creditLot.count({ where: canonicalLotWhere })).toBe(1);
```

The losing path must resolve/reject as a duplicate, not as an unexplained 500, and duplicate-attempt evidence must be committed.

- [ ] **Step 5: Repeat the simultaneous race at least three times in one test run**

Create a fresh receipt number/fixture for each iteration so uniqueness state does not bleed between iterations:

```ts
for (let iteration = 0; iteration < 3; iteration += 1) {
  // create fresh canonical fixture
  // race online and offline
  // assert exactly one financial effect
}
```

- [ ] **Step 6: Run the boundary test three process-level times**

```bash
for i in 1 2 3; do
  npx jest --config ./test/jest-int.json --runInBand test/offline-receipt-boundary.int-spec.ts || exit 1
done
```

Expected: all nine race iterations across the three runs satisfy the invariant.

- [ ] **Step 7: Commit**

```bash
git add test/offline-receipt-boundary.int-spec.ts src/modules/offline-sync/offline-sync.service.ts src/modules/loyalty/loyalty.service.ts
git commit -m "test: prove online offline receipt uniqueness boundary"
```

Only include implementation files in the commit if they actually changed.

**Task gate:** No ordering of online/offline submission may award cashback twice for one canonical receipt.

---

# Track C — Tracking Reconciliation and Release Certification

### Task 7: Reconcile OpenSpec and Sprint 4 documentation with executable evidence

**Files:**

- Modify: `openspec/changes/sprint-4-correctness-closure/tasks.md`
- Modify: `openspec/changes/sprint-4-offline-fraud-reports/tasks.md`
- Modify: `docs/sprint_4_plan.md`
- Modify: `docs/development/gitnexus-impact-tracker.md`
- Optionally amend `docs/repo_review_42.md` only to add a clearly dated closure note; do not rewrite historical review text as if it had never existed.

**Interfaces:**

- Consumes: passing task-level tests from Tasks 1-6.
- Produces: one consistent statement of what is implemented and evidenced.

- [ ] **Step 1: Run impact analysis before changing tracker state**

```bash
npm run proposal:impact
```

Record the affected report/outbox/offline/fraud surfaces in `docs/development/gitnexus-impact-tracker.md`.

- [ ] **Step 2: Reconcile the two Sprint 4 task trackers**

For each item in `openspec/changes/sprint-4-offline-fraud-reports/tasks.md`, check it only when a passing test or inspected production path proves it. The expected final state after Tasks 1-6 is that previously stale items for offline replay, duplicate evidence, durable fraud dispatch, historical reporting, refresh durability, concurrency, and validation are checked with no contradictory older tracker left behind.

Do not check final validation items yet; Task 8 owns those.

- [ ] **Step 3: Update `docs/sprint_4_plan.md` acceptance evidence**

Under the existing acceptance matrix, add the exact test files that prove each gate:

```text
test/report-refresh-outbox.int-spec.ts
src/modules/reports/report-snapshot.spec.ts
test/report-materialization.int-spec.ts
src/jobs/branch-day-window.spec.ts
test/fraud-behavior.int-spec.ts
test/offline-earn-sync.int-spec.ts
test/offline-receipt-boundary.int-spec.ts
```

For each, describe the invariant rather than merely saying “covered”.

- [ ] **Step 4: Run OpenSpec validation and formatting**

```bash
npm run openspec:validate
npm run format:check
```

Expected: PASS.

- [ ] **Step 5: Commit documentation reconciliation**

```bash
git add openspec/changes/sprint-4-correctness-closure/tasks.md openspec/changes/sprint-4-offline-fraud-reports/tasks.md docs/sprint_4_plan.md docs/development/gitnexus-impact-tracker.md docs/repo_review_42.md
git commit -m "docs: reconcile Sprint 4 final gate evidence"
```

Only add `docs/repo_review_42.md` if it changed.

**Task gate:** No Sprint 4 tracker may claim a requirement is complete while the corresponding executable evidence is absent.

---

### Task 8: Certify one immutable Sprint 4 release-candidate SHA

**Files:**

- Create after all commands pass: `docs/sprint-4-final-gate-evidence.md`
- Modify final validation checkboxes in the two Sprint 4 OpenSpec task files only after evidence is collected.

**Interfaces:**

- Consumes: all implementation commits from Tasks 1-7.
- Produces: one immutable SHA with complete local and GitHub CI evidence.

- [ ] **Step 1: Confirm clean working tree before certification**

```bash
git status --short
git rev-parse HEAD
```

Expected: no uncommitted implementation changes. Save the printed SHA; every following result must refer to this same commit until the evidence document itself is committed.

- [ ] **Step 2: Validate Prisma and migrations on a clean database**

```bash
npm run prisma:validate
npm run prisma:generate
```

Then use a fresh PostgreSQL database and run:

```bash
npx prisma migrate deploy
npx prisma migrate status
```

Expected: all migrations apply and status reports the schema is up to date.

- [ ] **Step 3: Run static/build/architecture gates**

```bash
npm run verify:fast
npm run architecture:check
npm run openspec:validate
npm run test:validation-scope
```

Expected: all PASS.

- [ ] **Step 4: Run critical unit/coverage gates**

```bash
npm run test:coverage:critical
```

Expected: PASS including configured branch thresholds for redemption, approval, lot allocation, and outbox runtime.

- [ ] **Step 5: Run targeted final-gate regression set first**

```bash
npx jest src/modules/reports/report-snapshot.spec.ts src/modules/reports/report-materializer.service.spec.ts src/jobs/branch-day-window.spec.ts src/jobs/outbox-worker.runtime.spec.ts --runInBand

npx jest --config ./test/jest-int.json --runInBand \
  test/report-refresh-outbox.int-spec.ts \
  test/report-materialization.int-spec.ts \
  test/fraud-behavior.int-spec.ts \
  test/offline-earn-sync.int-spec.ts \
  test/offline-receipt-boundary.int-spec.ts
```

Expected: PASS.

- [ ] **Step 6: Re-run settled Sprint 2/3 financial regressions**

Run the existing integration tests that cover:

- FIFO lot allocation;
- concurrent redemption/debit protection;
- approval execution race;
- reversal/exact-lot isolation;
- adjustment races;
- immutable earn ledger;
- duplicate receipt evidence;
- outbox/SMS recovery.

Use the repository's existing test filenames discovered by `git ls-files 'test/*int-spec.ts'` and include every matching financial regression in one `jest --config ./test/jest-int.json --runInBand ...` invocation. Do not modify those tests merely to make a new implementation pass unless a documented contract changed.

- [ ] **Step 7: Prime and run the entire integration suite**

```bash
npm run test:integration:prime
npm run test:integration
```

Expected: PASS.

- [ ] **Step 8: Run E2E suite**

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 9: Verify OpenAPI and generated client remain aligned**

```bash
npm run openapi:lint
npm run openapi:diff
npm run client:generate
git diff --exit-code -- docs/api/openapi.json client/shopcity-client.ts
npm run client:typecheck
```

Expected: no uncommitted generated-contract drift and client typecheck passes.

- [ ] **Step 10: Run Bruno smoke against the local app**

With the app running on `http://127.0.0.1:3000` using the same migrated test environment:

```bash
BRUNO_BASE_URL=http://127.0.0.1:3000 npm run bruno:test
```

Expected: PASS.

- [ ] **Step 11: Create the evidence document using actual command results**

Create `docs/sprint-4-final-gate-evidence.md` with these sections:

```markdown
# Sprint 4 Final Gate Evidence

## Certified code SHA

## P1 correctness gates

### Durable report refresh

### Historical redemption state

### Historical SMS state

## Fraud timing gate

## Offline acceptance matrix

## Static/build/architecture results

## Prisma/migration results

## Unit and coverage results

## Integration and E2E results

## OpenAPI/client results

## Bruno result

## Residual non-blocking risks

## Sprint 4 gate decision
```

Populate every section with the actual SHA, command, exit result, and relevant test file. Do not write “passed” for a command that was not run.

- [ ] **Step 12: Commit evidence and validation tracker state**

```bash
git add docs/sprint-4-final-gate-evidence.md openspec/changes/sprint-4-correctness-closure/tasks.md openspec/changes/sprint-4-offline-fraud-reports/tasks.md
git commit -m "chore: certify Sprint 4 final gate"
```

- [ ] **Step 13: Re-run the fast immutable-SHA checks after the evidence commit**

Because the evidence commit creates a new SHA, run at minimum:

```bash
npm run verify:fast
npm run architecture:check
npm run openspec:validate
```

Expected: PASS with no working-tree drift.

- [ ] **Step 14: Push the certification SHA and require GitHub Actions green on that exact SHA**

After push/PR creation, do not certify Sprint 4 from an earlier local SHA. The final decision must use the SHA for which GitHub status/checks are green.

**Task gate:** one immutable commit has complete local evidence and green remote CI. “CI unverified” is not sufficient for the final >=90% move-on decision.

---

## Recommended Execution Order

Execute strictly in this order:

1. **Task 1 — report refresh recovery**: closes the current runnable-work P1 first.
2. **Task 2 — pure historical lifecycle helper**: establishes the correctness primitive independently.
3. **Task 3 — historical materializer integration**: closes the remaining reporting P1.
4. **Task 4 — branch-day correctness**: removes the remaining fraud timing defect without touching financial logic.
5. **Task 5 — offline rejection matrix**: fills deterministic acceptance gaps.
6. **Task 6 — online/offline race matrix**: provides the strongest receipt-integrity evidence.
7. **Task 7 — tracker/docs reconciliation**: update claims only after code/test evidence exists.
8. **Task 8 — immutable release certification**: full regression/CI gate last.

Do not parallelize Tasks 2 and 3 because Task 3 consumes Task 2's interfaces. Tasks 5 and 6 may be implemented in parallel after Tasks 1-4 if separate worktrees are used, but they must be integrated before Task 7.

## Expected Score Movement

This plan is designed to move the current approximately 82/100 Sprint 4 state beyond the 90% threshold without reopening completed architecture:

- Durable report refresh: restores reports/exports completeness.
- Historical redemption/SMS reconstruction: closes the remaining reporting correctness P1.
- Branch-local fraud windows: closes the remaining fraud-timing defect.
- Offline validation and race matrix: raises the weakest acceptance/evidence category.
- Tracker reconciliation: restores trustworthy completion metadata.
- Immutable local + remote certification: closes the current CI-unverified state.

The expected post-plan range is approximately **93-97/100**, contingent on all tests and remote CI passing. The score must not be awarded if either report refresh or historical lifecycle reconstruction remains defective.

## Stop Conditions

Stop implementation and review before proceeding if any task causes one of these outcomes:

- a confirmed financial ledger entry becomes mutable;
- the same canonical receipt can produce two confirmed earn effects;
- customer balance becomes negative under an existing concurrency regression;
- report reconstruction requires mutating authoritative financial source rows;
- fraud/outbox changes regress SMS recovery or retry behavior;
- a migration becomes necessary unexpectedly;
- a public API contract changes without matching OpenAPI/client regeneration;
- a test is weakened or deleted solely to make the new implementation pass.

## Final Self-Review Checklist

Before declaring the plan executed, verify that each requirement has a direct task/evidence mapping:

- Durable `report.refresh` publication and stale recovery → Task 1.
- Historical redemption lifecycle → Tasks 2-3.
- Historical SMS lifecycle → Tasks 2-3.
- Correct branch-local day boundaries → Task 4.
- Actor/expiry/device/branch/card/staff offline rejection evidence → Task 5.
- Online/offline duplicate ordering and concurrency → Task 6.
- Consistent OpenSpec/docs → Task 7.
- Full static/migration/unit/integration/E2E/contract/CI evidence → Task 8.

No Sprint 5 expiry/reminder, broad production security, load-testing, backup/restore, or pilot rollout work belongs in this plan unless final regression testing exposes a direct Sprint 4 correctness dependency.
