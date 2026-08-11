# Sprint 4 to 90% Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Sprint 4 from the reviewed 68/100 state at commit `6677e68ad806b2555e3cbcac50ec98f147911a18` to a defensible **93/100 target**, with no open P1 correctness defects and one immutable green release candidate SHA.

**Architecture:** Keep the existing NestJS modular monolith and preserve the Sprint 2/3 financial boundary. Fraud remains asynchronous operational evidence driven by durable outbox events and must never mutate financial history. Reporting remains rebuildable, but historical `asOf` materialization must reconstruct state from immutable ledger/allocation/timestamp evidence instead of reading present-day mutable values.

**Tech Stack:** NestJS/Fastify, Prisma 6/PostgreSQL, Redis/BullMQ, Jest, Supertest, Testcontainers, OpenAPI/Spectral/oasdiff, Orval, Bruno, dependency-cruiser, GitHub Actions.

## Global Constraints

- `docs/TRD.md` remains the implementation source of truth.
- Do not reopen or redesign Sprint 3 unless a regression is discovered; Sprint 3 financial behavior remains accepted at 98% functional completion.
- Money remains integer kobo. Never introduce floating-point money or percentage arithmetic.
- Confirmed financial ledger history is append-only. Never edit or delete confirmed ledger entries to repair fraud/report output.
- Offline sync must reuse the canonical earn execution path; never create a second offline financial ledger path.
- Fraud evidence is operational state. Fraud evaluation must never roll back or mutate a committed financial transaction.
- Receipt uniqueness remains enforced by PostgreSQL. Do not weaken the unique constraint to make duplicate fraud detection easier.
- Report tables remain derived and rebuildable. Authoritative financial source tables remain receipts, ledger entries, credit lots, allocations/restorations, approvals, SMS and audit evidence.
- Redemptions, approvals, card replacement and manual adjustments remain unavailable offline.
- Sprint 5 work—expiry execution/reminders, broad security certification, load testing, backup/restore certification, pilot monitoring and production runbooks—must not leak into this plan.
- Every task follows TDD: write the failing regression first, prove failure, implement the smallest correct change, rerun the targeted suite, then commit.
- Run GitNexus impact analysis before changing high-impact implementation symbols and update `docs/development/gitnexus-impact-tracker.md` in the same task.

---

## 1. Baseline and target score

Current reviewed Sprint 4 score at `6677e68`:

| Area                                  |    Current |     Target |    Gain |
| ------------------------------------- | ---------: | ---------: | ------: |
| Offline sync core                     |      27/30 |      29/30 |      +2 |
| Offline conflict/concurrency evidence |       4/10 |       9/10 |      +5 |
| Fraud detection/review                |      10/20 |      18/20 |      +8 |
| Reporting/read models                 |      14/20 |      18/20 |      +4 |
| Reports/exports                       |       8/10 |       9/10 |      +1 |
| Contracts/docs                        |        4/5 |        5/5 |      +1 |
| Final CI/migration/regression         |        1/5 |        5/5 |      +4 |
| **Sprint 4 total**                    | **68/100** | **93/100** | **+25** |

The implementation is allowed to stop at the 90% move-on gate only if **all P1 correctness gates are green**. A numeric score above 90 does not override an unresolved P1 financial, fraud-replay, or reporting-correctness defect.

### 90% move-on gate

All of the following must be true on one immutable SHA:

1. Approval-required high-value earn and redemption create fraud evaluation evidence.
2. One `fraud.evaluate` outbox event can increment a logical fraud occurrence at most once, including retry/recovery.
3. Duplicate-receipt evidence survives both the normal pre-check path and a database uniqueness race.
4. All six behavioral fraud rules required by Sprint 4 have deterministic runtime implementations and tests.
5. Historical `asOf` report rebuilds reconstruct lot, redemption, approval and SMS state as of the watermark rather than reading today's mutable values.
6. Customer performance counts confirmed financial activity only.
7. Same-tenant report materializations cannot corrupt or duplicate read models under concurrency.
8. Offline/online same-receipt and offline concurrency acceptance cases are green.
9. OpenAPI/client/Bruno and OpenSpec artifacts match runtime behavior.
10. Fresh migration, upgrade migration, unit, integration, HTTP/E2E, lint, typecheck, architecture and build gates pass on the final SHA.

---

## 2. Execution decomposition

This umbrella plan contains three independently reviewable tracks:

- **Track A — Fraud closure:** Tasks 1–5.
- **Track B — Historical reporting correctness:** Tasks 6–8.
- **Track C — Offline acceptance and release evidence:** Tasks 9–11.

If using parallel agents, Tasks 1–5 and Tasks 6–8 may proceed in separate worktrees after their interfaces are frozen. Task 9 may proceed in parallel because it is mostly acceptance coverage. Tasks 10–11 must run after all implementation tracks merge.

Recommended execution branch: `fix/sprint-4-90-gate`.

---

## 3. File map

### Fraud files

- Modify: `src/modules/loyalty/loyalty.service.ts` — enqueue fraud work in earn approval paths and handle duplicate-race evidence.
- Modify: `src/modules/redemptions/redemptions.service.ts` — enqueue fraud work in redemption approval paths and handle duplicate-race evidence.
- Modify: `src/modules/fraud/fraud.service.ts` — centralize duplicate-attempt persistence and reusable finding upsert logic.
- Modify: `src/modules/fraud/fraud-rules.service.ts` — add pure deterministic behavioral rule evaluators.
- Modify: `src/modules/fraud/fraud.types.ts` — add behavioral-rule input types.
- Create: `src/modules/fraud/fraud-behavior.service.ts` — query authoritative rows, build rule inputs, and return findings.
- Create: `src/modules/fraud/fraud-behavior.service.spec.ts` — unit tests for query-to-rule orchestration.
- Modify: `src/modules/fraud/fraud.module.ts` — register/export behavior service if required by runtime.
- Modify: `src/jobs/outbox-worker.runtime.ts` — atomically process fraud events and dispatch behavioral event types.
- Modify: `src/jobs/outbox-worker.runtime.spec.ts` — replay/completion/behavioral dispatch unit tests.
- Modify: `src/modules/cards/cards.service.ts` — enqueue card-replacement fraud work.
- Modify: `src/modules/reversals/reversals.service.ts` — enqueue reversal-frequency fraud work.
- Modify: `src/modules/auth/auth.service.ts` — persist attributable failed-login audit evidence and enqueue auth fraud work.

### Reporting files

- Modify: `src/modules/reports/report-materializer.service.ts` — consume reconstructed snapshot state rather than current mutable values.
- Create: `src/modules/reports/report-snapshot.ts` — pure historical-state reconstruction functions.
- Create: `src/modules/reports/report-snapshot.spec.ts` — unit tests for historical state reconstruction.
- Modify: `src/modules/reports/report-materializer.service.spec.ts` — verify materializer uses reconstructed state.
- Modify: `test/report-materialization.int-spec.ts` — historical lot/redemption/SMS/approval/customer regression coverage.
- Create: `test/report-materialization-concurrency.int-spec.ts` — same-tenant concurrency acceptance.

### Offline/acceptance files

- Modify: `test/offline-earn-sync.int-spec.ts` — complete financial conflict matrix.
- Modify: `test/offline-earn-sync-http.int-spec.ts` — complete HTTP/RBAC/replay contract matrix.
- Create: `test/duplicate-receipt-race.int-spec.ts` — DB uniqueness race + fraud evidence.
- Modify: `test/outbox-worker-recovery.int-spec.ts` — real Redis/Postgres fraud completion/recovery evidence.

### Contracts/evidence

- Modify: `openspec/changes/sprint-4-offline-fraud-reports/tasks.md`.
- Modify: `openspec/changes/repo-review-42-closure/tasks.md`.
- Modify: relevant Sprint 4 specs under `openspec/changes/sprint-4-offline-fraud-reports/specs/` only if runtime semantics must be clarified.
- Modify: `docs/database/reporting-definitions.md` — explicitly document historical-state reconstruction semantics.
- Modify: `docs/database/migration-tracker.md` — record verified `20260811_outbox_fraud_completion` evidence.
- Modify: `docs/development/gitnexus-impact-tracker.md`.
- Modify: `docs/TRD.md` implementation-status sections only; do not change approved business requirements.
- Regenerate: `docs/api/openapi.json` and `client/shopcity-client.ts` only if public contracts change.

---

# Track A — Fraud closure

## Task 1: Make approval-required high-value transactions emit fraud work

**Files:**

- Modify: `src/modules/loyalty/loyalty.service.ts`
- Modify: `src/modules/redemptions/redemptions.service.ts`
- Test: create `test/fraud-financial-dispatch.int-spec.ts`

**Interfaces:**

- Consumes: existing `OutboxEvent` model and `fraud.evaluate` worker contract.
- Produces: one durable `fraud.evaluate` outbox row for every qualifying high-value earn/redemption request, whether it confirms immediately or enters approval.
- Preserve: current API responses and approval behavior.

- [ ] **Step 1: Write failing integration tests for pending earn and redemption fraud intent**

Add tests that create a purchase above `PURCHASE_APPROVAL_THRESHOLD_KOBO` and a redemption above `REDEMPTION_APPROVAL_THRESHOLD_KOBO`, assert the financial response is `PENDING_APPROVAL`, and then query the outbox:

```ts
const fraudEvents = await prisma.outboxEvent.findMany({
  where: {
    tenantId: tenant.id,
    eventType: 'fraud.evaluate',
  },
});

expect(fraudEvents).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      aggregateType: 'receipt',
      aggregateId: earn.receiptId,
      status: 'PENDING',
    }),
    expect.objectContaining({
      aggregateType: 'redemption',
      aggregateId: redemption.redemptionId,
      status: 'PENDING',
    }),
  ]),
);
```

Also assert pending approval still creates **no ledger/lot/SMS financial effect** before approval.

- [ ] **Step 2: Run the new tests and confirm failure**

Run:

```bash
npx jest test/fraud-financial-dispatch.int-spec.ts --config ./test/jest-int.json --runInBand
```

Expected: FAIL because the pending-approval branches currently return before creating fraud work.

- [ ] **Step 3: Add the fraud outbox intent inside the pending-approval transactions**

In the earn pending branch, create:

```ts
await prisma.outboxEvent.create({
  data: {
    tenantId,
    aggregateType: 'receipt',
    aggregateId: receipt.id,
    eventType: 'fraud.evaluate',
    payload: { receiptId: receipt.id },
    status: 'PENDING',
    nextAttemptAt: now,
  },
});
```

In the redemption pending branch, create:

```ts
await prisma.outboxEvent.create({
  data: {
    tenantId,
    aggregateType: 'redemption',
    aggregateId: redemption.id,
    eventType: 'fraud.evaluate',
    payload: { redemptionId: redemption.id },
    status: 'PENDING',
    nextAttemptAt: now,
  },
});
```

Do **not** add a second fraud event during approval execution. The original request event is sufficient and avoids double occurrence counting.

- [ ] **Step 4: Prove the worker creates `FR-HV-002` and `FR-HV-003` from pending records**

Extend the integration test to run the outbox worker against Redis/Testcontainers and assert:

```ts
expect(
  await prisma.fraudFlag.findFirst({
    where: {
      tenantId: tenant.id,
      ruleCode: 'FR-HV-002',
      receiptId: earn.receiptId,
    },
  }),
).not.toBeNull();

expect(
  await prisma.fraudFlag.findFirst({
    where: {
      tenantId: tenant.id,
      ruleCode: 'FR-HV-003',
      redemptionId: redemption.redemptionId,
    },
  }),
).not.toBeNull();
```

- [ ] **Step 5: Run targeted regressions**

```bash
npx jest test/fraud-financial-dispatch.int-spec.ts test/approval-http.int-spec.ts test/redemption-policy.int-spec.ts --config ./test/jest-int.json --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/loyalty/loyalty.service.ts src/modules/redemptions/redemptions.service.ts test/fraud-financial-dispatch.int-spec.ts
git commit -m "fix: dispatch fraud evaluation for approval flows"
```

**Score impact:** Fraud +2.

---

## Task 2: Make fraud-event processing atomic and replay-safe

**Files:**

- Modify: `src/jobs/outbox-worker.runtime.ts`
- Modify: `src/jobs/outbox-worker.runtime.spec.ts`
- Modify: `test/outbox-worker-recovery.int-spec.ts`

**Interfaces:**

- Consumes: `OutboxEvent.status`, `OutboxEvent.processedAt`, `FraudFlag` dedupe keys.
- Produces: one atomic transaction that both records findings and marks the event `COMPLETED`.
- Invariant: the same outbox event ID can never increment `occurrenceCount` twice.

- [ ] **Step 1: Write a failing unit test for a completed event redelivery**

Create a `fraud.evaluate` event whose persisted status is `COMPLETED` and `processedAt` is non-null, then call the private job handler through the existing test adapter:

```ts
await runtimeWithHandleJob(runtime).handleJob({
  data: { id: 'fraud-event-1', tenantId: 'tenant-1' },
});

expect(prisma.fraudFlagUpsert).not.toHaveBeenCalled();
expect(prisma.outboxEventUpdate).not.toHaveBeenCalledWith(
  expect.objectContaining({
    data: expect.objectContaining({ status: 'PUBLISHED' }),
  }),
);
```

Expected current behavior: FAIL because the handler re-marks the row `PUBLISHED` before checking terminal state.

- [ ] **Step 2: Refactor fraud processing into one transaction**

Introduce an internal method with this contract:

```ts
private async processFraudEventAtomically(
  tenantId: string,
  eventId: string,
): Promise<void>
```

Inside one Prisma transaction:

```ts
await this.prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      tenantId: string;
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Prisma.JsonValue;
      status: OutboxEventStatus;
      processedAt: Date | null;
    }>
  >(Prisma.sql`
    SELECT id, "tenantId", "aggregateType", "aggregateId", "eventType", payload, status, "processedAt"
    FROM "OutboxEvent"
    WHERE "tenantId" = ${tenantId} AND id = ${eventId}
    FOR UPDATE
  `);

  const event = rows[0];
  if (!event || event.status === 'COMPLETED' || event.processedAt) return;

  await this.evaluateFraudForOutboxEvent(tx, event);

  await tx.outboxEvent.update({
    where: { tenantId_id: { tenantId, id: eventId } },
    data: {
      status: OutboxEventStatus.COMPLETED,
      processedAt: new Date(),
      nextAttemptAt: null,
    },
  });
});
```

Refactor `evaluateFraudForOutboxEvent` and `recordFraudFindings` to accept `Prisma.TransactionClient` so the flag upsert and event completion are committed together.

- [ ] **Step 3: Remove the non-atomic fraud completion path**

For `fraud.evaluate`, `handleJob()` must call only:

```ts
if (outboxEvent.eventType === 'fraud.evaluate') {
  await this.processFraudEventAtomically(outboxEvent.tenantId, outboxEvent.id);
  return;
}
```

Do not call `markOutboxEventCompleted()` separately for fraud.

- [ ] **Step 4: Add integration replay evidence**

In `test/outbox-worker-recovery.int-spec.ts`:

1. Create a high-value fraud event.
2. Start the worker and wait until the event is `COMPLETED` and the flag occurrence count is `1`.
3. Manually republish the same BullMQ job ID or invoke recovery after moving time beyond the stale threshold.
4. Assert the outbox remains `COMPLETED` and the flag occurrence count remains `1`.

```ts
expect(flag?.occurrenceCount).toBe(1);
expect(event?.status).toBe('COMPLETED');
expect(event?.processedAt).toBeInstanceOf(Date);
```

- [ ] **Step 5: Run worker tests**

```bash
npx jest src/jobs/outbox-worker.runtime.spec.ts --runInBand
npx jest test/outbox-worker-recovery.int-spec.ts --config ./test/jest-int.json --runInBand
```

Expected: PASS with SMS recovery unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/jobs/outbox-worker.runtime.ts src/jobs/outbox-worker.runtime.spec.ts test/outbox-worker-recovery.int-spec.ts
git commit -m "fix: make fraud outbox processing atomic"
```

**Score impact:** Fraud +2; validation confidence +1.

---

## Task 3: Persist duplicate-receipt evidence on database uniqueness races

**Files:**

- Modify: `src/modules/fraud/fraud.service.ts`
- Modify: `src/modules/loyalty/loyalty.service.ts`
- Modify: `src/modules/redemptions/redemptions.service.ts`
- Modify: `src/modules/loyalty/loyalty.module.ts`
- Modify: `src/modules/redemptions/redemptions.module.ts`
- Test: create `test/duplicate-receipt-race.int-spec.ts`

**Interfaces:**

- Consumes: existing `FraudService.recordDuplicateReceiptAttempt()`.
- Produces: the same append-only audit + `fraud.evaluate` evidence for pre-check duplicates and unique-constraint race losers.
- Preserve: PostgreSQL receipt uniqueness remains authoritative.

- [ ] **Step 1: Remove duplicate private evidence implementations**

Inject `FraudService` into `LoyaltyService` and `RedemptionsService`, import `FraudModule` in both feature modules, and replace the duplicated private `recordDuplicateReceiptAttempt()` implementations with the exported fraud service.

Use:

```ts
await this.fraudService.recordDuplicateReceiptAttempt({
  tenantId,
  receiptId: attemptedReceiptIdentity,
  originalReceiptId: duplicateReceipt.id,
  branchId,
  cashierId: actor.user.id,
  customerId,
  deviceId,
  normalizedPosReceiptNumber,
  receiptWeekStart,
  occurredAt,
});
```

- [ ] **Step 2: Write the failing race test**

Submit two transactions concurrently using the same branch/week/receipt identity but distinct idempotency keys:

```ts
const results = await Promise.allSettled([
  loyaltyService.earn(tenant.id, actor, 'race-a', payload),
  loyaltyService.earn(tenant.id, actor, 'race-b', payload),
]);

expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(
  1,
);
expect(await prisma.receipt.count({ where: receiptIdentityWhere })).toBe(1);
```

Then assert one duplicate-attempt audit record and one duplicate `fraud.evaluate` evidence row exist even when the loser failed on the database unique constraint.

- [ ] **Step 3: Add post-conflict evidence reconstruction**

In the `isUniqueReceiptConflict(error)` catch path, rehydrate non-financial context from the main Prisma client:

```ts
const [device, card] = await Promise.all([
  this.prismaService.device.findFirst({
    where: { id: sessionDeviceId, tenantId },
    include: { branch: true },
  }),
  this.prismaService.card.findFirst({
    where: { tenantId, barcodeValue: normalizedCard },
    include: { customer: true },
  }),
]);
```

Derive `branchId` and `receiptWeekStart`, query the canonical receipt by the unique identity, then call `FraudService.recordDuplicateReceiptAttempt()` **after the failed financial transaction has rolled back** and before throwing `RECEIPT_ALREADY_USED`.

Do the same for the redemption catch path.

- [ ] **Step 4: Make duplicate evidence event-safe under repeated retries**

Do not dedupe away real repeated duplicate attempts. Each rejected attempt may enqueue its own fraud event, while `FR-DUP-001` continues to aggregate into one logical flag using the existing rule/window dedupe key. Infrastructure replay is handled by Task 2.

- [ ] **Step 5: Run race tests three times**

```bash
for i in 1 2 3; do
  npx jest test/duplicate-receipt-race.int-spec.ts --config ./test/jest-int.json --runInBand || exit 1
done
```

Expected every run: exactly one financial receipt effect; duplicate evidence survives.

- [ ] **Step 6: Commit**

```bash
git add src/modules/fraud src/modules/loyalty src/modules/redemptions test/duplicate-receipt-race.int-spec.ts
git commit -m "fix: preserve duplicate receipt evidence under races"
```

**Score impact:** Fraud +1; offline conflict evidence +1.

---

## Task 4: Implement transaction-pattern behavioral fraud rules

**Files:**

- Modify: `src/modules/fraud/fraud.types.ts`
- Modify: `src/modules/fraud/fraud-rules.service.ts`
- Create: `src/modules/fraud/fraud-behavior.service.ts`
- Create: `src/modules/fraud/fraud-behavior.service.spec.ts`
- Modify: `src/jobs/outbox-worker.runtime.ts`
- Modify: `src/config/env.validation.ts`

**Interfaces:**

- Produces runtime rules:
  - `FR-CARD-001` — daily card frequency.
  - `FR-CASH-001` — cashier value anomaly against branch peers.
  - `FR-ROUND-001` — repeated rounded purchase values.
- The worker invokes these rules while processing receipt `fraud.evaluate` events.

- [ ] **Step 1: Add explicit configuration keys**

Use integer-safe values:

```ts
FRAUD_CARD_DAILY_COUNT_THRESHOLD;
FRAUD_CASHIER_MIN_SAMPLE_SIZE;
FRAUD_CASHIER_VALUE_RATIO_THRESHOLD_BPS;
FRAUD_ROUNDED_VALUE_MIN_SAMPLE;
FRAUD_ROUNDED_VALUE_UNIT_KOBO;
```

Do not expose them through public configuration endpoints.

- [ ] **Step 2: Add pure rule input types**

In `fraud.types.ts` define:

```ts
export interface CardFrequencyRuleInput {
  tenantId: string;
  branchId: string;
  cardId: string;
  customerId: string;
  receiptId: string;
  countInLocalDay: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface CashierAnomalyRuleInput {
  tenantId: string;
  branchId: string;
  cashierId: string;
  cashierCount: number;
  cashierValueKobo: bigint;
  peerMedianValueKobo: bigint;
  sampleSize: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface RoundedValueRuleInput {
  tenantId: string;
  branchId: string;
  cashierId: string;
  receiptId: string;
  roundedCount: number;
  sampleSize: number;
  unitKobo: bigint;
  windowStart: Date;
  windowEnd: Date;
}
```

- [ ] **Step 3: Write pure failing unit tests**

Examples:

```ts
expect(rules.evaluateCardFrequency({ ...input, countInLocalDay: 6 })).toEqual([
  expect.objectContaining({ ruleCode: 'FR-CARD-001' }),
]);

expect(rules.evaluateCashierAnomaly({ ...input, sampleSize: 2 })).toEqual([]);

expect(
  rules.evaluateRoundedValues({ ...input, roundedCount: 5, sampleSize: 5 }),
).toEqual([expect.objectContaining({ ruleCode: 'FR-ROUND-001' })]);
```

- [ ] **Step 4: Implement integer-only rule math**

For cashier anomaly, avoid floating point:

```ts
const ratioBps =
  input.peerMedianValueKobo === 0n
    ? 0n
    : (input.cashierValueKobo * 10_000n) / input.peerMedianValueKobo;
```

Flag only when `sampleSize >= FRAUD_CASHIER_MIN_SAMPLE_SIZE` and ratio exceeds the configured BPS threshold.

- [ ] **Step 5: Build `FraudBehaviorService` query orchestration**

For a receipt event:

1. Resolve the branch-local day from branch timezone.
2. Count same-card receipts in that local day.
3. Aggregate cashier count/value for the same branch/day.
4. Build a peer median from other cashiers with sufficient samples.
5. Count cashier receipts whose `purchaseAmountKobo % unitKobo === 0n`.
6. Return findings from the pure rule service.

The service must query authoritative receipts only; it must not edit them.

- [ ] **Step 6: Call behavior evaluation from receipt fraud processing**

After existing `FR-HV-001/002` evaluation, merge behavior findings into the same atomic finding transaction from Task 2.

- [ ] **Step 7: Run rule and worker tests**

```bash
npx jest src/modules/fraud/fraud-rules.service.spec.ts src/modules/fraud/fraud-behavior.service.spec.ts src/jobs/outbox-worker.runtime.spec.ts --runInBand
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/fraud src/jobs/outbox-worker.runtime.ts src/config/env.validation.ts
git commit -m "feat: add transaction behavioral fraud rules"
```

**Score impact:** Fraud +2.

---

## Task 5: Implement lifecycle behavioral fraud rules

**Files:**

- Modify: `src/modules/fraud/fraud.types.ts`
- Modify: `src/modules/fraud/fraud-rules.service.ts`
- Modify: `src/modules/fraud/fraud-behavior.service.ts`
- Modify: `src/modules/reversals/reversals.service.ts`
- Modify: `src/modules/cards/cards.service.ts`
- Modify: `src/modules/auth/auth.service.ts`
- Modify: `src/jobs/outbox-worker.runtime.ts`
- Modify: `src/config/env.validation.ts`
- Test: extend relevant service specs and create `test/fraud-behavior.int-spec.ts`

**Interfaces:**

- Produces runtime rules:
  - `FR-REV-001` — unusual reversal frequency.
  - `FR-REPL-001` — frequent card replacement.
  - `FR-AUTH-001` — repeated attributable authentication failures.

- [ ] **Step 1: Add configuration keys**

```text
FRAUD_REVERSAL_WINDOW_HOURS
FRAUD_REVERSAL_COUNT_THRESHOLD
FRAUD_CARD_REPLACEMENT_WINDOW_DAYS
FRAUD_CARD_REPLACEMENT_COUNT_THRESHOLD
FRAUD_AUTH_FAILURE_WINDOW_MINUTES
FRAUD_AUTH_FAILURE_COUNT_THRESHOLD
```

- [ ] **Step 2: Write pure rule tests**

Use deterministic inputs and exact thresholds. For example:

```ts
expect(rules.evaluateReversalFrequency({ ...input, reversalCount: 4 })).toEqual(
  [expect.objectContaining({ ruleCode: 'FR-REV-001' })],
);

expect(
  rules.evaluateCardReplacementFrequency({ ...input, replacementCount: 3 }),
).toEqual([expect.objectContaining({ ruleCode: 'FR-REPL-001' })]);

expect(rules.evaluateAuthFailures({ ...input, failureCount: 5 })).toEqual([
  expect.objectContaining({ ruleCode: 'FR-AUTH-001' }),
]);
```

- [ ] **Step 3: Emit reversal fraud intent atomically with successful reversal**

In the reversal service, after creating the compensating ledger entry but before transaction commit:

```ts
await prisma.outboxEvent.create({
  data: {
    tenantId,
    aggregateType: 'reversal',
    aggregateId: reversalLedgerEntry.id,
    eventType: 'fraud.evaluate',
    payload: { reversalLedgerEntryId: reversalLedgerEntry.id },
    status: 'PENDING',
    nextAttemptAt: now,
  },
});
```

The behavior service counts ledger rows with `reversesEntryId != null` created by the same actor inside the configured window.

- [ ] **Step 4: Emit card-replacement fraud intent inside the replacement transaction**

In `CardsService.replaceCard()` add:

```ts
await prisma.outboxEvent.create({
  data: {
    tenantId,
    aggregateType: 'card',
    aggregateId: newCard.id,
    eventType: 'fraud.evaluate',
    payload: {
      kind: 'card.replaced',
      customerId: current.customerId,
      cardId: newCard.id,
    },
    status: 'PENDING',
    nextAttemptAt: new Date(),
  },
});
```

Count cards for that customer whose `replacedAt` falls within the configured window.

- [ ] **Step 5: Persist attributable failed-login evidence**

Before Supabase sign-in, resolve a local user candidate by normalized username without changing the outward error behavior. If sign-in fails and the user exists, persist in one transaction:

```ts
await this.auditService.recordWithClient(tx, {
  tenantId: candidate.tenantId,
  actorId: candidate.id,
  action: 'auth.login.failed',
  entityType: 'user',
  entityId: candidate.id,
  metadata: { username: candidate.username },
});

await tx.outboxEvent.create({
  data: {
    tenantId: candidate.tenantId,
    aggregateType: 'auth-user',
    aggregateId: candidate.id,
    eventType: 'fraud.evaluate',
    payload: { kind: 'auth.login.failed', userId: candidate.id },
    status: 'PENDING',
    nextAttemptAt: new Date(),
  },
});
```

Still return the same generic `Invalid credentials` response. Do not reveal whether the username exists.

- [ ] **Step 6: Extend worker dispatch for `reversal`, `card`, and `auth-user` aggregate types**

All are processed through the atomic fraud path from Task 2.

- [ ] **Step 7: Add real integration evidence**

`test/fraud-behavior.int-spec.ts` must prove all six behavioral rule codes can be produced from real PostgreSQL source rows and that below-threshold cases do not flag.

- [ ] **Step 8: Run auth/card/reversal regressions**

```bash
npx jest src/modules/fraud src/modules/auth src/modules/cards src/modules/reversals --runInBand
npx jest test/fraud-behavior.int-spec.ts test/auth-http.int-spec.ts test/phase-1.int-spec.ts --config ./test/jest-int.json --runInBand
```

- [ ] **Step 9: Commit**

```bash
git add src/modules/fraud src/modules/auth src/modules/cards src/modules/reversals src/jobs src/config test/fraud-behavior.int-spec.ts
git commit -m "feat: complete Sprint 4 behavioral fraud rules"
```

**Score impact:** Fraud +1 to +2; completing this task is required for the 18/20 fraud target.

---

# Track B — Historical reporting correctness

## Task 6: Add pure historical snapshot reconstruction

**Files:**

- Create: `src/modules/reports/report-snapshot.ts`
- Create: `src/modules/reports/report-snapshot.spec.ts`
- Modify: `src/modules/reports/report-materializer.service.ts`

**Interfaces:**

- Consumes immutable ledger/allocation/restoration timestamps and lifecycle timestamps.
- Produces state-at-watermark helpers:

```ts
export function remainingLotAt(
  lot: SnapshotCreditLot,
  allocations: SnapshotAllocation[],
  restorations: SnapshotRestoration[],
  ledgerById: ReadonlyMap<string, SnapshotLedgerEntry>,
  asOf: Date,
): bigint;

export function redemptionStatusAt(
  redemption: SnapshotRedemption,
  asOf: Date,
): 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'REVERSED';

export function approvalStatusAt(
  approval: SnapshotApproval,
  asOf: Date,
): string;
export function smsStatusAt(sms: SnapshotSmsMessage, asOf: Date): string;
```

- [ ] **Step 1: Add failing unit tests for lot time travel**

Example:

```ts
expect(remainingLotAt(
  lot(20_000n),
  [allocation(8_000n, 'debit-ledger')],
  [],
  new Map([
    ['debit-ledger', ledger('2026-08-10T00:00:00Z')],
  ]),
  new Date('2026-08-05T00:00:00Z'),
)).toBe(20_000n);

expect(remainingLotAt(..., new Date('2026-08-11T00:00:00Z'))).toBe(12_000n);
```

Add restoration coverage where a later reversal restores part/all of an allocation.

- [ ] **Step 2: Add failing lifecycle tests**

```ts
expect(redemptionStatusAt({ confirmedAt: aug1, reversedAt: aug10, ... }, aug5))
  .toBe('CONFIRMED');
expect(redemptionStatusAt({ confirmedAt: aug1, reversedAt: aug10, ... }, aug11))
  .toBe('REVERSED');
```

For SMS:

```ts
expect(smsStatusAt({ queuedAt: aug1, sentAt: aug2, deliveredAt: aug3, ... }, aug1_5))
  .toBe('QUEUED');
expect(smsStatusAt(..., aug2_5)).toBe('SENT');
expect(smsStatusAt(..., aug4)).toBe('DELIVERED');
```

- [ ] **Step 3: Extend materializer source data**

Load:

```ts
redemptionAllocation.findMany({
  where: { tenantId },
  select: {
    id: true,
    creditLotId: true,
    redemptionLedgerEntryId: true,
    amountKobo: true,
    createdAt: true,
  },
});

allocationRestoration.findMany({
  where: { tenantId },
  select: {
    allocationId: true,
    reversalLedgerEntryId: true,
    amountKobo: true,
    createdAt: true,
  },
});
```

Extend SMS source fields with `sentAt`, `deliveredAt`, `failedAt`, `suppressedAt`. Extend approvals with `decidedAt`, `executedAt`, `expiresAt`, and redemptions with `rejectedAt`.

- [ ] **Step 4: Stop trusting current `CreditLot.remainingAmountKobo` for historical `asOf`**

For every lot, compute the remaining amount using original amount, allocations whose debit ledger `effectiveAt <= asOf`, and restorations whose reversal ledger `effectiveAt <= asOf`.

Validate the reconstruction:

```ts
if (remaining < 0n || remaining > lot.originalAmountKobo) {
  throw new Error(`Invalid reconstructed credit lot balance: ${lot.id}`);
}
```

- [ ] **Step 5: Stop trusting current mutable redemption/SMS/approval status**

Materializer builders must consume reconstructed lifecycle state from the helper rather than current enum values.

- [ ] **Step 6: Run pure tests**

```bash
npx jest src/modules/reports/report-snapshot.spec.ts src/modules/reports/report-materializer.service.spec.ts --runInBand
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/reports/report-snapshot.ts src/modules/reports/report-snapshot.spec.ts src/modules/reports/report-materializer.service.ts src/modules/reports/report-materializer.service.spec.ts
git commit -m "fix: reconstruct historical report state at watermark"
```

**Score impact:** Reporting +2.

---

## Task 7: Correct customer activity and duplicate-attempt report semantics

**Files:**

- Modify: `src/modules/reports/report-materializer.service.ts`
- Modify: `docs/database/reporting-definitions.md`
- Modify: `test/report-materialization.int-spec.ts`

**Interfaces:**

- Customer `visitCount` and `lastActivityAt` derive from confirmed financial ledger state only.
- Cashier `duplicateAttempts` derives from append-only duplicate-attempt audit evidence, not current `FraudFlag.occurrenceCount`.

- [ ] **Step 1: Add failing customer activity test**

Create a customer with a confirmed earn and then a pending/rejected redemption. Materialize after the rejected request and assert:

```ts
expect(snapshot.visitCount).toBe(1);
expect(snapshot.lastActivityAt).toEqual(earnEffectiveAt);
```

A pending/rejected redemption must not increment confirmed financial activity.

- [ ] **Step 2: Derive customer activity from ledger entries**

Use confirmed `EARN/CREDIT` and `REDEEM/DEBIT` ledger entries visible at `asOf`; exclude an original entry if a visible reversal relationship invalidates the metric according to the frozen definitions.

Do not use raw redemption request rows for `visitCount` or `lastActivityAt`.

- [ ] **Step 3: Replace fraud-flag occurrence counts as the duplicate-attempt report source**

Load audit rows:

```ts
this.prisma.auditLog.findMany({
  where: {
    tenantId,
    action: 'RECEIPT_DUPLICATE_ATTEMPT_RECORDED',
    createdAt: { lte: asOf },
  },
  select: {
    actorId: true,
    metadata: true,
    createdAt: true,
  },
});
```

Count one audit row per actual rejected attempt. This makes historical `asOf` duplicate counts correct even when a `FraudFlag` has a later `occurrenceCount`.

- [ ] **Step 4: Freeze the documentation semantics**

Update `docs/database/reporting-definitions.md` with these exact rules:

```text
Customer visitCount counts confirmed EARN/REDEEM financial transactions visible at the report watermark; pending/rejected requests do not count.
DuplicateAttempts counts append-only RECEIPT_DUPLICATE_ATTEMPT_RECORDED audit observations whose createdAt is at or before the watermark.
Historical balances are reconstructed from original lot amounts, allocations and restorations visible at the watermark.
```

- [ ] **Step 5: Run reporting integration tests**

```bash
npx jest test/report-materialization.int-spec.ts --config ./test/jest-int.json --runInBand
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/reports/report-materializer.service.ts docs/database/reporting-definitions.md test/report-materialization.int-spec.ts
git commit -m "fix: align customer and duplicate report metrics"
```

**Score impact:** Reporting +1; reports +1.

---

## Task 8: Serialize same-tenant report materialization

**Files:**

- Modify: `src/modules/reports/report-materializer.service.ts`
- Create: `test/report-materialization-concurrency.int-spec.ts`

**Interfaces:**

- Produces: tenant-scoped transaction lock covering source snapshot + delete/rebuild writes.
- Tenant and branch materializations for the same tenant must not overlap destructively.

- [ ] **Step 1: Write the failing concurrency test**

Seed enough report source rows, then run:

```ts
await Promise.all([
  materializer.materializeTenant(tenant.id, { asOf }),
  materializer.materializeTenant(tenant.id, { asOf }),
]);
```

Assert:

```ts
expect(
  await prisma.reportDailyFinancialSummary.count({
    where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
  }),
).toBe(expectedSummaryRows);

expect(
  await prisma.reportMaterializationState.findUnique({
    where: {
      tenantId_scope_scopeKey: {
        tenantId: tenant.id,
        scope: 'TENANT',
        scopeKey: tenant.id,
      },
    },
  }),
).toMatchObject({ status: 'COMPLETED' });
```

Repeat with tenant materialization racing a branch materialization for the same tenant.

- [ ] **Step 2: Acquire a tenant advisory transaction lock**

Refactor source loading to accept a Prisma transaction client and perform the authoritative read + delete/rebuild inside one `RepeatableRead` transaction:

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.$queryRaw(Prisma.sql`
    SELECT pg_advisory_xact_lock(hashtext(${`shopcity-report:${tenantId}`}))
  `);

  const source = await this.loadSourceData(tx, tenantId, asOf);
  const plan = branchId ? buildBranchPlan(...) : buildTenantPlan(...);

  if (branchId) await deleteBranchRows(tx, tenantId, branchId);
  else await deleteTenantRows(tx, tenantId);

  await insertRows(tx, plan);
  await upsertStates(tx, tenantId, plan.materializationStates);
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  maxWait: 10_000,
  timeout: 60_000,
});
```

Use one tenant lock key for both tenant and branch builds so they cannot delete/replace overlapping data concurrently.

- [ ] **Step 3: Keep operational RUNNING/FAILED state truthful**

It is acceptable to set `RUNNING` before entering the locked transaction and `FAILED` after a thrown transaction. The completed state written inside/after the successful transaction must be the final state.

- [ ] **Step 4: Run concurrency test repeatedly**

```bash
for i in 1 2 3; do
  npx jest test/report-materialization-concurrency.int-spec.ts --config ./test/jest-int.json --runInBand || exit 1
done
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/reports/report-materializer.service.ts test/report-materialization-concurrency.int-spec.ts
git commit -m "fix: serialize report materialization per tenant"
```

**Score impact:** Reporting +1; validation confidence +1.

---

# Track C — Offline acceptance and release evidence

## Task 9: Complete the offline conflict/concurrency acceptance matrix

**Files:**

- Modify: `test/offline-earn-sync.int-spec.ts`
- Modify: `test/offline-earn-sync-http.int-spec.ts`
- Modify implementation only when a new regression test proves a real defect.

**Interfaces:**

- No new financial path.
- Every offline record still delegates to canonical earn behavior.

- [ ] **Step 1: Add online → offline same-receipt test**

1. Confirm an online earn.
2. Sync an offline record for the same branch/week/receipt.
3. Assert no second receipt, ledger entry or lot exists.
4. Assert the offline result is deterministic `RECEIPT_ALREADY_USED` or documented replay behavior.

- [ ] **Step 2: Add offline → online same-receipt test**

1. Sync offline successfully.
2. Submit the same physical receipt online with a distinct idempotency key.
3. Assert exactly one financial effect.

- [ ] **Step 3: Add simultaneous offline same-receipt test**

```ts
const [a, b] = await Promise.all([
  syncService.syncEarnBatch(...recordA),
  syncService.syncEarnBatch(...recordB),
]);

expect(await prisma.loyaltyLedgerEntry.count({ where: { receiptId } })).toBe(1);
expect(await prisma.creditLot.count({ where: { customerId } })).toBe(1);
```

One result may confirm and one may reject/conflict, but the wallet must be credited once.

- [ ] **Step 4: Complete identity/policy rejections**

Ensure real integration coverage exists for:

- inactive card;
- replaced card;
- staff customer;
- wrong cashier;
- wrong session device;
- wrong branch;
- incorrect submitted receipt week;
- record older than `OFFLINE_EARN_MAX_AGE_HOURS`;
- changed payload under same canonical idempotency key.

Each rejection must assert **zero financial mutation**.

- [ ] **Step 5: Preserve the already-fixed canonical replay invariant**

Keep the existing success → changed conflict → original replay regression green and assert the original transaction ID never changes.

- [ ] **Step 6: Run the full offline suite**

```bash
npx jest test/offline-earn-sync.int-spec.ts test/offline-earn-sync-http.int-spec.ts test/duplicate-receipt-race.int-spec.ts --config ./test/jest-int.json --runInBand
```

- [ ] **Step 7: Commit**

```bash
git add test/offline-earn-sync.int-spec.ts test/offline-earn-sync-http.int-spec.ts test/duplicate-receipt-race.int-spec.ts
git commit -m "test: close Sprint 4 offline conflict matrix"
```

**Score impact:** Offline core +2; offline conflict/concurrency +4.

---

## Task 10: Reconcile contracts, OpenSpec and implementation trackers

**Files:**

- Modify: `openspec/changes/sprint-4-offline-fraud-reports/tasks.md`
- Modify: `openspec/changes/repo-review-42-closure/tasks.md`
- Modify: `docs/database/migration-tracker.md`
- Modify: `docs/development/gitnexus-impact-tracker.md`
- Modify: `docs/TRD.md` implementation status only
- Regenerate OpenAPI/client if applicable

**Interfaces:**

- Documentation must describe implemented behavior, not aspirational behavior.
- Do not mark a checkbox complete until its corresponding automated evidence is green.

- [ ] **Step 1: Run GitNexus impact checks for changed high-impact symbols**

```bash
npm run gitnexus:analyze
npm run proposal:impact
```

Record the actual affected symbols and tests in `docs/development/gitnexus-impact-tracker.md`.

- [ ] **Step 2: Reconcile Sprint 4 OpenSpec checkboxes**

For each checked item, include the concrete evidence path in an adjacent note or implementation document. Leave truly Sprint 5 items out rather than falsely checking them.

- [ ] **Step 3: Validate OpenSpec**

```bash
npm run openspec:validate
```

Expected: PASS.

- [ ] **Step 4: Regenerate API artifacts only if public contracts changed**

```bash
npm run openapi:export
npm run openapi:lint
npm run openapi:diff
npm run client:generate
npm run client:typecheck
```

Commit generated changes; never hand-edit `client/shopcity-client.ts`.

- [ ] **Step 5: Run Bruno contract smoke**

Against a locally running API:

```bash
npm run bruno:test
```

Add/update Bruno requests only where a public endpoint behavior changed.

- [ ] **Step 6: Update migration evidence**

Replace the `Pending verification` entry for `20260811_outbox_fraud_completion` with the exact fresh/upgrade migration commands and passing evidence from Task 11.

- [ ] **Step 7: Commit**

```bash
git add openspec docs client bruno
git commit -m "docs: reconcile Sprint 4 closure evidence"
```

**Score impact:** Contracts/docs +1.

---

## Task 11: Produce one immutable 90%+ release candidate

**Files:**

- No feature changes unless a gate exposes a regression.
- Modify: `docs/database/migration-tracker.md` with final evidence.
- Modify: Sprint 4 trackers with final SHA.

**Interfaces:**

- Produces one immutable candidate SHA with complete local/CI evidence.

- [ ] **Step 1: Verify Prisma schema and generation**

```bash
npm run prisma:validate
npm run prisma:generate
```

Expected: PASS.

- [ ] **Step 2: Verify fresh migration chain**

Start a clean PostgreSQL 16 database and run:

```bash
DATABASE_URL="$FRESH_DATABASE_URL" npx prisma migrate deploy
DATABASE_URL="$FRESH_DATABASE_URL" npx prisma migrate status
```

Expected: all migrations applied including `20260811_outbox_fraud_completion`.

- [ ] **Step 3: Verify upgrade migration path**

Prepare a database at the migration immediately before `20260811_outbox_fraud_completion`, seed representative outbox/fraud/report rows, then run:

```bash
DATABASE_URL="$UPGRADE_DATABASE_URL" npx prisma migrate deploy
```

Assert:

```sql
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'OutboxEventStatus'
  AND enumlabel = 'COMPLETED';

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'OutboxEvent'
  AND column_name = 'processedAt';
```

Both must return one row.

- [ ] **Step 4: Run fast static/build gates**

```bash
npm run verify:fast
npm run architecture:check
npm run openspec:validate
```

Expected: PASS.

- [ ] **Step 5: Run unit coverage gates**

```bash
npm run test:coverage:critical
```

Expected: all configured branch thresholds pass, especially `outbox-worker.runtime.ts`.

- [ ] **Step 6: Run complete integration suite**

```bash
npm run test:integration:prime
npm run test:integration
```

Expected: PASS.

- [ ] **Step 7: Run HTTP/E2E suite**

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 8: Run API/client gates**

```bash
npm run openapi:lint
npm run openapi:diff
npm run client:generate
git diff --exit-code -- client/shopcity-client.ts docs/api/openapi.json
npm run client:typecheck
```

Expected: generated files are already committed and clean.

- [ ] **Step 9: Run targeted Sprint 2/3 financial regression**

At minimum rerun the existing suites covering:

- FIFO lot allocation;
- concurrent redemption/debit operations;
- approval E2E;
- earn/redeem reversal;
- exact-lot reversal isolation;
- manual adjustment;
- immutable ledger/receipt/lot constraints;
- outbox/SMS recovery.

Do not accept Sprint 4 closure if any previously accepted Sprint 3 invariant regresses.

- [ ] **Step 10: Commit evidence only after all gates pass**

```bash
git add docs openspec
git commit -m "chore: certify Sprint 4 90 percent gate"
```

Record the resulting immutable SHA in both Sprint 4 trackers.

- [ ] **Step 11: Push a branch/PR so GitHub Actions evaluates the immutable SHA**

The final move-on decision requires the repository CI status, not only local assertions. Confirm the PR workflow is green and that no required check is missing.

- [ ] **Step 12: Score the candidate**

Use this rubric only after all evidence is available:

| Area                         | Gate score |
| ---------------------------- | ---------: |
| Offline sync core            |      29/30 |
| Offline conflict/concurrency |       9/10 |
| Fraud detection/review       |      18/20 |
| Reporting/read models        |      18/20 |
| Reports/exports              |       9/10 |
| Contracts/docs               |        5/5 |
| CI/migration/regression      |        5/5 |
| **Total**                    | **93/100** |

If any P1 gate remains open, report **NO-GO regardless of numeric score**.

---

# 4. Required acceptance tests before declaring 90%+

## Fraud

- [ ] Pending high-value earn creates `FR-HV-002` evidence without pre-approval ledger/lot/SMS effect.
- [ ] Pending high-value redemption creates `FR-HV-003` evidence without pre-approval debit effect.
- [ ] Completed fraud outbox event redelivery does not increment occurrence count.
- [ ] Fraud flag upsert and outbox completion are atomic.
- [ ] Normal duplicate attempt persists evidence.
- [ ] DB uniqueness race loser persists duplicate evidence.
- [ ] `FR-CARD-001` threshold and below-threshold cases pass.
- [ ] `FR-CASH-001` requires minimum peer/sample size.
- [ ] `FR-ROUND-001` threshold and below-threshold cases pass.
- [ ] `FR-REV-001` counts immutable reversal links.
- [ ] `FR-REPL-001` counts replacement history in configured window.
- [ ] `FR-AUTH-001` counts attributable failed-login audit evidence without changing outward auth errors.

## Reporting

- [ ] Purchase value uses receipt amount; credit issued uses reward ledger amount.
- [ ] Future financial rows are excluded before the watermark.
- [ ] Lot balance before a later redemption reconstructs the pre-redemption amount.
- [ ] Lot balance after redemption reflects allocation.
- [ ] Lot balance after redemption reversal reflects restoration.
- [ ] Redemption is `CONFIRMED` before a later reversal and `REVERSED` after reversal.
- [ ] SMS is `QUEUED`, `SENT`, `DELIVERED` according to lifecycle timestamps at the requested watermark.
- [ ] Pending/rejected redemption does not increment customer `visitCount` or `lastActivityAt`.
- [ ] Expired lots do not count as outstanding liability.
- [ ] Duplicate-attempt reporting uses append-only observations visible at watermark.
- [ ] Concurrent same-tenant materializers produce one deterministic final read model.

## Offline

- [ ] Same local ID + same hash replays exact original response.
- [ ] Same local ID + changed hash conflicts without mutating canonical replay.
- [ ] Same idempotency key + changed canonical payload conflicts.
- [ ] Online then offline same receipt gives exactly one financial effect.
- [ ] Offline then online same receipt gives exactly one financial effect.
- [ ] Simultaneous offline same receipt gives exactly one financial effect.
- [ ] Wrong cashier/device/branch rejects with zero financial effect.
- [ ] Inactive/replaced/staff card/customer rejects with zero financial effect.
- [ ] Week mismatch and stale offline record reject deterministically.
- [ ] Mixed batch preserves valid neighbors.

---

# 5. What is deliberately not required for the 90% gate

Do not hold this plan hostage to Sprint 5 items:

- expiry job execution;
- expiry reminder SMS;
- full production SMS-provider certification;
- load testing/k6 certification;
- CodeQL/Trivy/ZAP production security certification beyond existing CI requirements;
- shared production backup/restore certification;
- pilot training and operational monitoring;
- broad production-readiness checklist.

Those are next-sprint hardening tasks unless they expose a direct regression in Sprint 4 behavior.

---

# 6. Stop conditions

Stop implementation and review before continuing if any task discovers:

1. a confirmed financial ledger mutation path;
2. a negative-balance concurrency regression;
3. a duplicate receipt path capable of crediting twice;
4. a report repair that requires editing financial source rows;
5. an outbox change that regresses SMS recovery semantics;
6. a public API breaking change not reflected in OpenAPI/oasdiff.

These are architecture regressions and must be fixed before proceeding to the next task.

---

# 7. Expected endpoint state after completion

At the target candidate:

- Sprint 3 remains functionally closed at 98% with no regression.
- Sprint 4 has no known P1 defect.
- Offline conflict/concurrency acceptance is substantially complete.
- All named Sprint 4 fraud rules have deterministic evidence paths.
- Fraud processing is independently retryable and infrastructure replay-safe.
- Reports can be rebuilt at a historical watermark without leaking later lot/redemption/SMS/approval state.
- Report materialization is safe under same-tenant concurrency.
- Tracker/documentation state matches implementation state.
- The final immutable SHA has green migration, static, unit, integration, E2E, contract, architecture and CI evidence.
- Expected Sprint 4 score: **93/100**, which clears the 90% move-on threshold with a three-point buffer.
