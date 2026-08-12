# Sprint 5 Hardening and Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the TRD Sprint 5 hardening-and-pilot scope so ShopCity has deterministic credit expiry, 30-day expiry reminders, production observability, security and load-test evidence, backup/restore proof, operational runbooks/training, and a signed production-readiness gate.

**Architecture:** Preserve the existing NestJS/Fastify modular monolith and its PostgreSQL-first financial authority. Credit expiry becomes a controlled append-only financial workflow backed by explicit expiry evidence and an `EXPIRY` ledger debit; reminders remain notification-only outbox work. Hardening is layered around the existing API/worker through observable health/operations signals, containerized release artifacts, security/performance workflows, disaster-recovery evidence, and pilot procedures rather than redesigning Sprints 1–4.

**Tech Stack:** NestJS 11/Fastify, TypeScript, Prisma/PostgreSQL, Redis/BullMQ, Pino, Sentry, OpenAPI/Spectral/oasdiff/Orval, Jest/Testcontainers, Bruno, Docker, GitHub Actions, Gitleaks, CodeQL, Trivy, OWASP ZAP, k6.

## Global Constraints

- `docs/TRD.md` Version 1.0 dated July 19, 2026 remains the product and engineering source of truth.
- The confirmed financial ledger is append-only. Never edit or delete confirmed financial ledger history.
- All money remains integer kobo; never use IEEE floating-point arithmetic for financial values.
- Credit expires exactly twelve months after earning using the existing month-clamp rule; expiry execution must debit only the remaining unconsumed amount.
- Expired credit must be unspendable even when the expiry worker is delayed; authoritative spend queries continue to require `expiresAt > now`.
- Offline earning remains continuity support only. Offline redemption, approval, card replacement, adjustment, and expiry execution are prohibited.
- Every financial workflow must be replay-safe and safe under multiple worker instances.
- The frontend never supplies authoritative credit, balance, role, approval, expiry, or reconciliation values.
- No high or critical security finding may remain unresolved at the production-readiness gate.
- Pilot backup target: automated database backup at least daily, RPO no worse than 24 hours, RTO within the same business day, and a completed restore test before launch.
- Redis/BullMQ is not the financial source of truth; financially relevant queue work must be recoverable from PostgreSQL/outbox evidence.
- Staging and load/security tests use synthetic data only.
- Sprint 3 remains frozen at its accepted functional gate. Sprint 4 remains an engineering PASS; its remaining immutable-SHA/CI evidence is release certification, not permission to redesign Sprint 4.
- Every task must preserve OpenAPI/client compatibility or explicitly update the contract and regenerate the client.
- Every new ledger/idempotency/permission/expiry defect receives a regression test before closure.

---

## TRD Sprint Review Baseline

### Sprint 0 — Foundation

**TRD outcome:** repository, Docker, NestJS/Fastify, Prisma, Redis/BullMQ, configuration validation, linting, CI, OpenAPI skeleton, health endpoints; exit gate is passing quality gates plus a staging skeleton.

**Current assessment:** functionally mature but release-hardening incomplete.

Already present:
- NestJS/Fastify bootstrap, Helmet, CORS, versioning, global validation, request envelopes.
- Prisma/PostgreSQL, Redis/BullMQ, Joi environment validation.
- Pino logging.
- `/health/live` and `/health/ready` with PostgreSQL/Redis readiness.
- Static, integration, E2E, OpenAPI/client and architecture CI jobs.

Carry into Sprint 5 rather than reopening Sprint 0:
- production Docker image definition and image-build gate;
- security scanning in CI;
- staging/release certification on one immutable SHA;
- release metadata and operational observability.

**Decision:** PASS for feature foundation; production-release evidence belongs to Sprint 5.

### Sprint 1 — Identity and Master Data

**TRD outcome:** auth/session, RBAC, users, branches/devices, customers, cards, audit basics; supervisor can register a customer and assign/replace a card through documented APIs.

**Current assessment:** PASS. Auth/session, RBAC, device attribution, customer/card lifecycle and audit modules exist and have accumulated migration and integration hardening. `SYSTEM` is explicitly blocked from human assignment, which is important for the Sprint 5 background-financial actor.

**Sprint 5 dependency:** training and operational runbooks must teach customer registration, lost-card replacement, role boundaries, and escalation; do not redesign the identity domain.

### Sprint 2 — Earn Ledger

**TRD outcome:** receipts, idempotency, earn policy, immutable ledger, credit lots, outbox and SMS; exit gate is concurrent duplicate protection and frontend earn integration.

**Current assessment:** PASS. The repository has immutable ledger/lot constraints, receipt uniqueness, idempotency, transactional outbox/SMS recovery and concurrent duplicate coverage.

**Sprint 5 dependency:** the data model already stores `earnedAt`, derived `expiresAt`, and `remainingAmountKobo`, but scheduled expiry execution and reminders were intentionally deferred. Sprint 5 must add a controlled expiry debit without weakening Sprint 2 source integrity.

### Sprint 3 — Redemption and Approvals

**TRD outcome:** FIFO allocation, redemption policy, approvals, reversals and adjustments; exit gate is no negative balance under concurrency plus approval E2E.

**Current assessment:** 98/100 functional PASS and frozen.

**Sprint 5 dependency:** expiry must coexist safely with redemption. A redemption and expiry racing the same lot must never over-debit or create negative remaining credit. Reversal of an allocation from an already-expired lot remains review-required rather than silently restoring spendable credit.

### Sprint 4 — Offline, Fraud and Reports

**TRD outcome:** offline batch sync, fraud rules, read models and exports; exit gate is accepted offline conflict/reporting definitions.

**Current assessment:** 95/100 engineering PASS. Historical reporting, offline replay ownership, same-receipt races and durable report refresh are closed. Remaining Review 44 work is immutable-SHA/green-CI certification only.

**Sprint 5 dependency:** expiry evidence must be included in historical reporting; pilot monitoring should consume fraud/offline/SMS/outbox/report signals without introducing a second financial authority.

### Sprint 5 — Hardening and Pilot

**TRD outcome:** expiry jobs/reminders, security scans, load testing, backups, runbooks, training support and pilot monitoring.

**TRD exit gate:** production-readiness checklist signed **and** restore test completed.

**Current baseline:** partial infrastructure only. Health endpoints, Pino, worker scheduling patterns, outbox recovery, migration tracking and several short runbooks exist. Core Sprint 5 deliverables still need implementation/certification: credit-expiry execution, 30-day reminders, Sentry/operational alert surfaces, security workflows, k6 suite, production container/image scan, backup automation + measured restore drill, complete runbooks/training, pilot monitoring and final production sign-off.

---

## Sprint 5 Scoring Rubric and Non-Negotiable Release Gates

| Area | Weight |
| --- | ---: |
| Credit expiry execution and reminder correctness | 25 |
| Observability, reconciliation and pilot monitoring | 15 |
| Security hardening and scans | 15 |
| Performance/load evidence | 10 |
| Backup/restore/disaster recovery | 15 |
| Container, deployment and rollback readiness | 10 |
| Runbooks and training support | 5 |
| Final production certification | 5 |
| **Total** | **100** |

A score of 90+ is an engineering PASS, but **production launch is still blocked** if any of these are false:

1. High/critical security findings are unresolved.
2. Restore drill has not completed within the same-business-day RTO or cannot prove an acceptable <=24-hour RPO.
3. Expiry/redeem concurrency can produce duplicate expiry or negative/incorrect lot balance.
4. The current release image does not build and pass Trivy/security gates.
5. Required k6 checkout/report-isolation thresholds fail without an approved capacity decision.
6. Staging readiness + Bruno critical journeys are not green on the release SHA.
7. Production-readiness checklist is unsigned or references a different SHA than the tested artifact.

---

## File Structure

### New implementation files

```text
src/common/system/system-actor.service.ts
src/common/system/system-actor.service.spec.ts

src/modules/credit-expiry/credit-expiry.module.ts
src/modules/credit-expiry/credit-expiry.service.ts
src/modules/credit-expiry/credit-expiry.service.spec.ts
src/modules/credit-expiry/expiry-reminder.service.ts
src/modules/credit-expiry/expiry-reminder.service.spec.ts
src/modules/credit-expiry/credit-expiry.types.ts

src/jobs/credit-expiry.worker.ts
src/jobs/credit-expiry.worker.spec.ts

src/common/observability/sentry.ts
src/common/observability/logging.ts
src/modules/operations/operations.module.ts
src/modules/operations/operations.controller.ts
src/modules/operations/operations.service.ts
src/modules/operations/operations.dto.ts
src/modules/operations/operations.service.spec.ts

performance/k6/lib/auth.js
performance/k6/lib/data.js
performance/k6/card-lookup.js
performance/k6/earn.js
performance/k6/redeem.js
performance/k6/report-isolation.js
performance/k6/pilot-mixed.js

scripts/backup/backup-postgres.sh
scripts/backup/restore-postgres.sh
scripts/backup/verify-restored-database.ts
scripts/release/verify-sprint5-readiness.cjs

Dockerfile
.dockerignore
.github/workflows/security.yml
.github/workflows/zap.yml

openspec/changes/sprint-5-hardening-and-pilot/.openspec.yaml
openspec/changes/sprint-5-hardening-and-pilot/proposal.md
openspec/changes/sprint-5-hardening-and-pilot/design.md
openspec/changes/sprint-5-hardening-and-pilot/tasks.md
openspec/changes/sprint-5-hardening-and-pilot/specs/credit-expiry/spec.md
openspec/changes/sprint-5-hardening-and-pilot/specs/expiry-reminders/spec.md
openspec/changes/sprint-5-hardening-and-pilot/specs/production-observability/spec.md
openspec/changes/sprint-5-hardening-and-pilot/specs/security-hardening/spec.md
openspec/changes/sprint-5-hardening-and-pilot/specs/performance/spec.md
openspec/changes/sprint-5-hardening-and-pilot/specs/backup-restore/spec.md
openspec/changes/sprint-5-hardening-and-pilot/specs/pilot-readiness/spec.md

text fixtures / evidence:
docs/operations/pilot-monitoring.md
docs/runbooks/database-backup.md
docs/runbooks/duplicate-credit.md
docs/runbooks/lost-card.md
docs/runbooks/security-incident.md
docs/runbooks/outbox-backlog.md
docs/training/cashier-pilot.md
docs/training/supervisor-pilot.md
docs/training/owner-pilot.md
docs/pilot/day-0-checklist.md
docs/pilot/daily-review.md
docs/release/production-readiness-checklist.md
docs/release-evidence/sprint-5/evidence.example.json
```

### Existing files expected to change

```text
prisma/schema.prisma
prisma/migrations/<timestamp>_sprint_5_credit_expiry/migration.sql
src/worker.ts
src/app.module.ts
src/config/env.validation.ts
src/modules/loyalty/loyalty.controller.ts
src/modules/loyalty/loyalty.service.ts
src/modules/reports/report-materializer.service.ts
src/modules/reports/report-materializer.service.spec.ts
src/jobs/outbox-worker.runtime.ts
src/jobs/outbox-worker.runtime.spec.ts
.github/workflows/ci.yml
package.json
package-lock.json
docs/database/migration-tracker.md
docs/runbooks/deployment.md
docs/runbooks/rollback.md
docs/runbooks/database-restore.md
docs/runbooks/incident-response.md
README.md
CHANGELOG.md
```

Do not create a new microservice or a second ledger. New files exist to isolate responsibilities while remaining inside the current modular monolith and worker process.

---

### Task 1: Freeze Sprint 5 Scope and Create the OpenSpec Change

**Files:**
- Create: `openspec/changes/sprint-5-hardening-and-pilot/**`
- Modify: `docs/development/gitnexus-impact-tracker.md`
- Modify: `docs/sprint-4-final-gate-evidence.md` only if current Sprint 4 certification evidence becomes available during this task

**Interfaces:**
- Consumes: TRD Sections 18, 20, 21, 22, 23, 24 and 25.
- Produces: one accepted Sprint 5 change whose task list is the source of truth for execution.

- [ ] **Step 1: Record the implementation baseline**

Record the exact starting SHA and classify Sprint 4 as engineering-closed/release-certification-pending. Do not copy old Sprint 4 defects into Sprint 5.

- [ ] **Step 2: Run proposal-time impact analysis**

```bash
npm run proposal:impact -- CreditLot
npm run proposal:impact -- LoyaltyLedgerEntry
npm run proposal:impact -- ReportMaterializerService
npm run proposal:impact -- OutboxWorkerRuntime
npm run proposal:impact -- worker
```

Record HIGH/CRITICAL blast-radius findings in `docs/development/gitnexus-impact-tracker.md` before implementation.

- [ ] **Step 3: Create the OpenSpec proposal/design/specs/tasks**

The credit-expiry spec must explicitly contain these scenarios:

```text
full remaining lot expires exactly once
partially consumed lot expires only its remaining amount
fully consumed lot creates no expiry debit
future lot does not expire early
expiry and redemption race cannot over-debit
multiple expiry workers cannot duplicate an expiry
retry after commit returns/no-ops against original expiry evidence
historical report before expiry sees pre-expiry liability
after-expiry report sees expired credit and zero outstanding liability for that amount
```

The reminder spec must explicitly contain:

```text
30-day window uses authoritative expiresAt
one customer/day reminder aggregates multiple lots
fully consumed lots are excluded
repeat sweep does not create duplicate SMS/outbox work
SMS failure does not alter credit validity
```

- [ ] **Step 4: Validate OpenSpec before code changes**

```bash
npm run openspec:validate
```

Expected: all Sprint 5 change artifacts validate.

- [ ] **Step 5: Commit**

```bash
git add openspec/changes/sprint-5-hardening-and-pilot docs/development/gitnexus-impact-tracker.md
git commit -m "docs: define sprint 5 hardening and pilot scope"
```

---

### Task 2: Add Explicit Credit-Expiry Evidence and a Non-Human System Actor

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_sprint_5_credit_expiry/migration.sql`
- Create: `src/common/system/system-actor.service.ts`
- Create: `src/common/system/system-actor.service.spec.ts`
- Test: `test/credit-expiry-invariants.int-spec.ts`

**Interfaces:**
- Produces: `LedgerEntryType.EXPIRY` and one immutable `CreditExpiry` row per expired credit lot.
- Produces: `SystemActorService.getOrCreate(client, tenantId)` returning a tenant-owned `SYSTEM` user for background ledger writes.
- Consumes: existing `UserRole.SYSTEM`, `CreditLot`, `LoyaltyLedgerEntry`, audit and financial DB invariants.

- [ ] **Step 1: Write the failing schema/invariant integration tests**

Test that an expiry debit cannot exist without matching expiry evidence and that two expiry records cannot target one lot.

Target model:

```prisma
enum LedgerEntryType {
  EARN
  REDEEM
  REVERSAL
  ADJUSTMENT
  EXPIRY
}

model CreditExpiry {
  id            String             @id @default(uuid())
  tenantId      String
  customerId    String
  creditLotId   String
  ledgerEntryId String
  amountKobo    BigInt
  expiredAt     DateTime
  createdAt     DateTime           @default(now())
  tenant        Tenant             @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  customer      Customer           @relation(fields: [tenantId, customerId], references: [tenantId, id], onDelete: Restrict)
  creditLot     CreditLot          @relation(fields: [tenantId, creditLotId], references: [tenantId, id], onDelete: Restrict)
  ledgerEntry   LoyaltyLedgerEntry @relation(fields: [tenantId, ledgerEntryId], references: [tenantId, id], onDelete: Restrict)

  @@unique([tenantId, creditLotId])
  @@unique([tenantId, ledgerEntryId])
  @@index([tenantId, expiredAt])
  @@index([tenantId, customerId, expiredAt])
}
```

Add inverse relations to `Tenant`, `Customer`, `CreditLot`, and `LoyaltyLedgerEntry`.

- [ ] **Step 2: Update the deferred credit-lot evidence constraint**

The existing balance evidence is conceptually:

```text
remaining = original - allocations + restorations
```

Change the Sprint 5 migration so it is:

```text
remaining = original - allocations + restorations - expiry debit evidence
```

The expiry amount for one lot must be positive and must not exceed the lot balance implied immediately before expiry.

- [ ] **Step 3: Add expiry-row immutability**

Create database triggers preventing update/delete of `CreditExpiry`, following the existing immutable allocation/restoration pattern.

- [ ] **Step 4: Implement the system actor service**

```ts
export const SYSTEM_USERNAME = 'system@shopcity.internal';

export class SystemActorService {
  async getOrCreate(
    client: Pick<Prisma.TransactionClient, 'user'>,
    tenantId: string,
  ): Promise<{ id: string; tenantId: string }>;
}
```

The created row must use:

```ts
{
  tenantId,
  branchId: null,
  username: SYSTEM_USERNAME,
  role: UserRole.SYSTEM,
  status: UserStatus.ACTIVE,
  supabaseAuthId: null,
}
```

Do not expose this service through a controller. Human user APIs already reject assignment of `SYSTEM` and must continue doing so.

- [ ] **Step 5: Run fresh and upgrade migration tests**

```bash
npm run prisma:generate
npm run prisma:validate
npx jest test/credit-expiry-invariants.int-spec.ts --config ./test/jest-int.json --runInBand
npm run test:integration
```

Expected: fresh migration and representative upgrade data pass; invalid direct expiry evidence fails closed.

- [ ] **Step 6: Commit**

```bash
git add prisma src/common/system test/credit-expiry-invariants.int-spec.ts docs/database/migration-tracker.md
git commit -m "feat: add immutable credit expiry evidence"
```

---

### Task 3: Implement the Replay-Safe Credit Expiry Transaction

**Files:**
- Create: `src/modules/credit-expiry/credit-expiry.module.ts`
- Create: `src/modules/credit-expiry/credit-expiry.service.ts`
- Create: `src/modules/credit-expiry/credit-expiry.types.ts`
- Create: `src/modules/credit-expiry/credit-expiry.service.spec.ts`
- Test: `test/credit-expiry.int-spec.ts`
- Modify: `src/app.module.ts`

**Interfaces:**

```ts
export interface ExpireDueCreditInput {
  now: Date;
  batchSize: number;
}

export interface ExpirySweepResult {
  examined: number;
  expiredLots: number;
  expiredAmountKobo: bigint;
}

CreditExpiryService.expireDueCredit(input: ExpireDueCreditInput): Promise<ExpirySweepResult>
```

- [ ] **Step 1: Write failing integration cases**

Create cases for full expiry, partial-redemption remainder, fully consumed lot, future lot, repeat sweep, and two concurrent sweep calls.

- [ ] **Step 2: Lock due lots deterministically**

Inside a PostgreSQL transaction select:

```sql
SELECT "id", "tenantId", "customerId", "remainingAmountKobo", "expiresAt"
FROM "CreditLot"
WHERE "expiresAt" <= $1
  AND "remainingAmountKobo" > 0
ORDER BY "expiresAt" ASC, "earnedAt" ASC, "id" ASC
LIMIT $2
FOR UPDATE SKIP LOCKED;
```

- [ ] **Step 3: For each locked lot, write one financial expiry atomically**

For a locked remaining amount `R`:

```text
get/create SYSTEM actor
create LoyaltyLedgerEntry:
  type=EXPIRY
  direction=DEBIT
  amountKobo=R
  status=CONFIRMED
  effectiveAt=max(expiresAt, sweep now policy timestamp)
  correlationId="credit-expiry:<lotId>"
  createdBy=SYSTEM actor
create CreditExpiry amount=R
update CreditLot remainingAmountKobo -= R
write audit action="credit.expire"
```

All writes occur in the same DB transaction. Do not rely on a BullMQ unique job as the idempotency boundary; PostgreSQL uniqueness on expiry evidence is authoritative.

- [ ] **Step 4: Add redemption-versus-expiry concurrency evidence**

Run one redemption and one expiry sweep against a nearly-due/just-due lot under synchronized start. Assert:

```text
remainingAmountKobo >= 0
redemption allocations + expiry amount - restorations = original amount - final remaining
at most one CreditExpiry per lot
ledger debits never exceed spendable source credit
```

The expected winner depends on the authoritative `now`: a lot at or after expiry must not be redeemable; a redemption that locked/validated before expiry must either complete consistently under transaction isolation or lose with a recognized conflict. Never allow both to consume the same remaining kobo.

- [ ] **Step 5: Run tests**

```bash
npx jest src/modules/credit-expiry/credit-expiry.service.spec.ts --runInBand
npx jest test/credit-expiry.int-spec.ts test/redemption-allocation-invariants.int-spec.ts --config ./test/jest-int.json --runInBand
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/credit-expiry src/app.module.ts test/credit-expiry.int-spec.ts
git commit -m "feat: expire due credit lots safely"
```

---

### Task 4: Add the Daily Expiry Worker and 30-Day Aggregated Reminder Workflow

**Files:**
- Create: `src/jobs/credit-expiry.worker.ts`
- Create: `src/jobs/credit-expiry.worker.spec.ts`
- Create: `src/modules/credit-expiry/expiry-reminder.service.ts`
- Create: `src/modules/credit-expiry/expiry-reminder.service.spec.ts`
- Modify: `src/worker.ts`
- Modify: `src/config/env.validation.ts`
- Modify: `prisma/schema.prisma` and the Sprint 5 migration if reminder dedupe persistence is added before migration release
- Test: `test/expiry-reminder.int-spec.ts`

**Interfaces:**

```ts
CreditExpiryWorkerRuntime.start(): Promise<void>
CreditExpiryWorkerRuntime.stop(): Promise<void>

ExpiryReminderService.enqueueDueReminders(input: {
  now: Date;
  reminderDays: number;
  batchSize: number;
}): Promise<{ customers: number; amountKobo: bigint }>
```

Recommended config defaults:

```text
CREDIT_EXPIRY_SWEEP_INTERVAL_MS=86400000
CREDIT_EXPIRY_BATCH_SIZE=100
CREDIT_EXPIRY_REMINDER_DAYS=30
CREDIT_EXPIRY_REMINDER_BATCH_SIZE=100
```

- [ ] **Step 1: Add deterministic worker clock/config tests**

Follow the existing `ApprovalExpiryWorkerRuntime` start/stop/active-sweep pattern. Tests must inject the sweep function/clock or call exported sweep functions directly rather than waiting a real day.

- [ ] **Step 2: Add explicit reminder dedupe evidence**

Add a small immutable reminder record rather than assuming BullMQ prevents duplicates:

```prisma
model CreditExpiryReminder {
  id                  String   @id @default(uuid())
  tenantId            String
  customerId          String
  reminderDate        DateTime
  totalExpiringKobo   BigInt
  earliestExpiresAt   DateTime
  latestExpiresAt     DateTime
  outboxEventId       String
  createdAt           DateTime @default(now())

  @@unique([tenantId, customerId, reminderDate])
  @@unique([tenantId, outboxEventId])
  @@index([tenantId, reminderDate])
}
```

Relate it to tenant/customer/outbox if practical in the same migration.

- [ ] **Step 3: Select reminder lots from authoritative state**

For the branch/customer business date, select lots whose `expiresAt` falls on the date `now + 30 days`, with `remainingAmountKobo > 0`, group by customer, and aggregate all due lots into one reminder per customer/day.

- [ ] **Step 4: Persist reminder intent transactionally**

For each customer group, in one transaction create:

```text
CreditExpiryReminder
OutboxEvent eventType="sms.send"
SmsMessage status=QUEUED
```

Use template `credit-expiry-reminder-v1` and payload fields limited to customer-facing values:

```ts
{
  version: 1,
  customerId,
  totalExpiringKobo: total.toString(),
  earliestExpiresAt: earliest.toISOString(),
  latestExpiresAt: latest.toISOString(),
  template: 'credit-expiry-reminder-v1',
  phoneE164,
}
```

No ledger ID, provider secret, or internal diagnostic information appears in the SMS body.

- [ ] **Step 5: Register both sweeps in `src/worker.ts`**

The worker lifecycle must start and stop expiry work alongside outbox/report/approval workers and wait for active sweeps during shutdown.

- [ ] **Step 6: Prove replay and SMS-failure independence**

Tests must assert repeat reminder sweeps create one reminder/outbox/SMS only, and provider failure leaves the lot/ledger unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/jobs/credit-expiry.worker.ts src/jobs/credit-expiry.worker.spec.ts src/modules/credit-expiry src/worker.ts src/config/env.validation.ts prisma test/expiry-reminder.int-spec.ts
git commit -m "feat: add expiry worker and reminder workflow"
```

---

### Task 5: Integrate Expiry into Historical Reporting, Ledger Reads, SMS Templates, and Contracts

**Files:**
- Modify: `src/modules/reports/report-materializer.service.ts`
- Modify: `src/modules/reports/report-materializer.service.spec.ts`
- Modify: `src/modules/loyalty/loyalty.controller.ts`
- Modify: `src/modules/loyalty/loyalty.service.ts` as required for relation/read shaping
- Modify: `src/jobs/outbox-worker.runtime.ts`
- Modify: `src/jobs/outbox-worker.runtime.spec.ts`
- Modify: `docs/api/openapi.json` through generator
- Modify: `client/shopcity-client.ts` through Orval
- Test: `test/report-materialization.int-spec.ts`
- Test: `test/openapi.int-spec.ts`

**Interfaces:**
- Reporting source adds expiry evidence with `{ creditLotId, amountKobo, expiredAt }`.
- Public ledger transaction type enum adds `EXPIRY`.

- [ ] **Step 1: Write a historical reporting regression**

Fixture:

```text
Aug 1: earn 20,000 kobo
Aug 15: redeem 5,000
Sep 1: remaining 15,000 expires in controlled test clock
```

Assert report immediately before expiry reconstructs 15,000 outstanding and 0 expired for that event; report after expiry reconstructs 0 outstanding and 15,000 expired.

- [ ] **Step 2: Extend lot reconstruction**

Change report lot arithmetic to:

```text
original
- allocations created <= asOf
+ restorations created <= asOf
- CreditExpiry.amountKobo where expiredAt <= asOf
```

Never use the current mutable lot balance to answer an earlier watermark.

- [ ] **Step 3: Make expired-credit reporting date-correct**

`creditExpiredKobo` must be attributable to the expiry date/period rather than copied as one cumulative number onto unrelated daily rows. Add/adjust report rows and tests so executive period totals reconcile to expiry evidence.

- [ ] **Step 4: Update public ledger/API schemas**

Add `EXPIRY` to every ledger enum/schema and generated contract. Expiry entries have no receipt and may have `creditLotId`/expiry metadata in the transaction read model if needed for operations; keep customer-safe responses free of internal worker details.

- [ ] **Step 5: Add/verify the reminder template**

Ensure the SMS adapter accepts `credit-expiry-reminder-v1` and that template rendering is versioned/tested. Keep transaction success independent of SMS status.

- [ ] **Step 6: Run contract gates**

```bash
npm run openapi:lint
npm run openapi:diff
npm run client:generate
npm run client:typecheck
npx jest test/openapi.int-spec.ts --config ./test/jest-int.json --runInBand
git diff --exit-code -- docs/api/openapi.json client/shopcity-client.ts
```

The final `git diff --exit-code` is run after generated artifacts have been intentionally committed/regenerated a second time; it proves generation is deterministic.

- [ ] **Step 7: Commit**

```bash
git add src/modules/reports src/modules/loyalty src/jobs docs/api client test/report-materialization.int-spec.ts test/openapi.int-spec.ts
git commit -m "feat: expose expiry in reports and contracts"
```

---

### Task 6: Add Production Observability, Reconciliation, and Pilot Operations Signals

**Files:**
- Create: `src/common/observability/sentry.ts`
- Create: `src/common/observability/logging.ts`
- Create: `src/modules/operations/operations.module.ts`
- Create: `src/modules/operations/operations.controller.ts`
- Create: `src/modules/operations/operations.service.ts`
- Create: `src/modules/operations/operations.dto.ts`
- Create: `src/modules/operations/operations.service.spec.ts`
- Modify: `src/app.module.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/config/env.validation.ts`
- Modify: `package.json`, `package-lock.json`
- Test: `test/operations.int-spec.ts`

**Interfaces:**

```ts
GET /api/v1/operations/pilot-summary
Role: ADMIN only
```

Response contains operational aggregates only:

```ts
{
  release: string;
  generatedAt: string;
  outbox: { pending: number; deadLettered: number; oldestPendingAgeSeconds: number | null };
  sms: { failed24h: number; queued: number };
  offlineSync: { rejected24h: number; retryable24h: number };
  fraud: { openHigh: number; openTotal: number };
  reports: { staleMaterializations: number };
  ledger: { reconciliationOk: boolean; mismatchCount: number };
}
```

- [ ] **Step 1: Add release/observability environment validation**

Add:

```text
APP_VERSION
SENTRY_DSN (optional locally, required by deployment checklist for staging/production)
SERVICE_NAME=shopcity-api
PILOT_OUTBOX_MAX_AGE_SECONDS=300
PILOT_SMS_FAILURE_ALERT_COUNT=5
PILOT_OFFLINE_REJECTION_ALERT_COUNT=20
PILOT_REPORT_STALE_SECONDS=600
```

- [ ] **Step 2: Configure Pino metadata and redaction**

Ensure production logs include `service`, `environment`, `release`, request ID and HTTP endpoint; add actor/branch IDs after authentication where available. Explicitly redact authorization, cookies, session/CSRF tokens, SMS credentials and full sensitive payload fields.

- [ ] **Step 3: Initialize Sentry only when configured**

Capture unhandled exceptions and selected worker operational failures with environment/release tags and PII scrubbing. Do not make Sentry availability a dependency for financial writes.

- [ ] **Step 4: Implement reconciliation queries**

At minimum compare source-backed customer/lot financial invariants and report materialization health. Do not repair mismatches in this service; return counts/signals for investigation.

- [ ] **Step 5: Implement the admin-only pilot summary**

Use RBAC guard and stable response DTO. Cashier/supervisor direct calls must return 403 and create the existing security/audit evidence where guard policy does so.

- [ ] **Step 6: Add health/operations tests**

```bash
npx jest src/modules/operations/operations.service.spec.ts --runInBand
npx jest test/operations.int-spec.ts test/health.int-spec.ts --config ./test/jest-int.json --runInBand
```

Include stale outbox, failed SMS, offline rejection and reconciliation mismatch fixtures.

- [ ] **Step 7: Commit**

```bash
git add src/common/observability src/modules/operations src/app.module.ts src/bootstrap.ts src/config/env.validation.ts package.json package-lock.json test/operations.int-spec.ts
git commit -m "feat: add pilot observability and reconciliation signals"
```

---

### Task 7: Produce a Reproducible Production Container and Release Metadata

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `docs/runbooks/deployment.md`
- Modify: `docs/runbooks/rollback.md`

**Interfaces:**
- One immutable image can run either API or worker from the same build.

- [ ] **Step 1: Create a multi-stage Node 22 image**

Required shape:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
USER node
CMD ["node", "dist/src/main.js"]
```

During implementation, prune development dependencies if and only if Prisma/runtime dependencies and worker startup remain functional. Do not sacrifice reproducibility to minimize image size prematurely.

- [ ] **Step 2: Add a `.dockerignore`**

Exclude `.git`, local env files, coverage, node_modules, local DB artifacts, logs and unneeded evidence containing secrets.

- [ ] **Step 3: Prove both entrypoints**

```bash
docker build -t shopcity-lp:test .
docker run --rm shopcity-lp:test node dist/src/worker.js --help
```

For API smoke, launch with synthetic Postgres/Redis and verify `/health/live` and `/health/ready`.

- [ ] **Step 4: Add Docker build to CI**

Static success must be followed by an image build. The image becomes the input to Trivy in Task 8.

- [ ] **Step 5: Add immutable release metadata**

Pass `APP_VERSION=$GITHUB_SHA` or release tag at deployment. Ensure logs/Sentry/operations endpoint expose that value.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore .github/workflows/ci.yml package.json docs/runbooks/deployment.md docs/runbooks/rollback.md
git commit -m "build: add production container artifact"
```

---

### Task 8: Add Security Certification Workflows

**Files:**
- Create: `.github/workflows/security.yml`
- Create: `.github/workflows/zap.yml`
- Modify: `.github/workflows/ci.yml`
- Create: `docs/security/remediation-policy.md`
- Modify: `docs/runbooks/security-incident.md` or create it if absent

**Interfaces:**
- PR/release security gates: Gitleaks, CodeQL, Trivy.
- Staging/manual dynamic gate: OWASP ZAP baseline.

- [ ] **Step 1: Add Gitleaks secret scanning**

Run against the repository history/working tree appropriate to PRs. Any verified secret blocks release and triggers rotation, not merely deletion from the latest commit.

- [ ] **Step 2: Add CodeQL for TypeScript/JavaScript**

Run on pull requests and protected main/release branches. High/critical actionable findings block the production-readiness checklist.

- [ ] **Step 3: Scan the built container with Trivy**

Scan OS and application packages. Fail the production gate on HIGH/CRITICAL vulnerabilities unless a documented, time-bounded exception is signed by the technical lead and does not affect a reachable production path.

- [ ] **Step 4: Add ZAP staging baseline workflow**

Use `STAGING_BASE_URL` as a protected environment variable. Run only against the synthetic staging environment, never localhost from the hosted runner and never an unapproved production target.

- [ ] **Step 5: Document remediation SLA**

Policy:

```text
CRITICAL: release blocker; remediate before deployment
HIGH: release blocker unless formal exception with owner and expiry
MEDIUM: triage before release; tracked remediation date
LOW: backlog unless exploit chain elevates risk
secret exposure: immediate rotation + incident review
```

- [ ] **Step 6: Prove workflows and record evidence**

Store scan summaries/artifacts with the release evidence while excluding secrets and raw customer data.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows docs/security docs/runbooks/security-incident.md
git commit -m "ci: add sprint 5 security gates"
```

---

### Task 9: Build the k6 Pre-Release Performance Suite

**Files:**
- Create: `performance/k6/lib/auth.js`
- Create: `performance/k6/lib/data.js`
- Create: `performance/k6/card-lookup.js`
- Create: `performance/k6/earn.js`
- Create: `performance/k6/redeem.js`
- Create: `performance/k6/report-isolation.js`
- Create: `performance/k6/pilot-mixed.js`
- Create: `docs/performance/pilot-baseline.md`
- Modify: `package.json`

**Interfaces:**
- Tests consume only synthetic staging users/cards/receipts.
- Receipt/idempotency generators guarantee unique legitimate values while deliberate duplicate scenarios are isolated.

**Initial pilot thresholds (engineering defaults to validate, not business guarantees):**

```text
card lookup p95 <= 300 ms
checkout earn p95 <= 500 ms
redeem p95 <= 500 ms
admin report p95 <= 1500 ms
http_req_failed < 1%
no ledger/receipt/lot invariant failures
report load must not increase checkout p95 above 2x the checkout-only baseline
```

- [ ] **Step 1: Implement reusable authenticated session setup**

The k6 setup function logs in synthetic users, captures required cookies/CSRF state, and never writes credentials to output.

- [ ] **Step 2: Add endpoint-specific scenarios**

Use modest pilot-scale concurrency aligned with the TRD's approximately 100 transactions/day, while adding burst headroom:

```text
card lookup: 20 VUs for 2 minutes
earn: 10 VUs for 2 minutes
redeem: 10 VUs for 2 minutes
report: 5 VUs for 2 minutes
mixed pilot: 15 VUs for 5 minutes
```

- [ ] **Step 3: Add report-isolation scenario**

Run checkout traffic while admin reporting refresh/reads execute concurrently. Capture baseline and mixed p95; fail if checkout p95 exceeds 2x baseline or error/invariant rates breach thresholds.

- [ ] **Step 4: Validate financial postconditions after load**

After each financial scenario query/admin-check source counts or run a reconciliation command so a fast response with corrupted financial state cannot count as a pass.

- [ ] **Step 5: Record baseline**

`docs/performance/pilot-baseline.md` records release SHA, environment, VUs, duration, p50/p95/p99, failure rate, DB/Redis conditions and reconciliation result.

- [ ] **Step 6: Commit**

```bash
git add performance package.json docs/performance
git commit -m "test: add sprint 5 k6 performance suite"
```

---

### Task 10: Automate Backup and Restore Verification and Perform the Pre-Launch Drill

**Files:**
- Create: `scripts/backup/backup-postgres.sh`
- Create: `scripts/backup/restore-postgres.sh`
- Create: `scripts/backup/verify-restored-database.ts`
- Create: `docs/runbooks/database-backup.md`
- Modify: `docs/runbooks/database-restore.md`
- Modify: `docs/database/migration-tracker.md`
- Create: `docs/release-evidence/sprint-5/restore-drill.example.md`
- Modify: `package.json`

**Interfaces:**

```bash
scripts/backup/backup-postgres.sh "$DATABASE_URL" "$OUTPUT_DIR"
scripts/backup/restore-postgres.sh "$BACKUP_FILE" "$RESTORE_DATABASE_URL"
npm run verify:restored-db -- --database-url "$RESTORE_DATABASE_URL"
```

- [ ] **Step 1: Implement backup script**

Use `pg_dump --format=custom --no-owner --no-acl`, fail on any command error, calculate SHA-256 checksum, and write backup timestamp metadata without embedding credentials.

- [ ] **Step 2: Implement restore script**

Require a non-production target URL, create/clean the target explicitly, use `pg_restore --exit-on-error`, then run Prisma migration status and the verification script.

- [ ] **Step 3: Implement restored-database verification**

Verify:

```text
all expected migrations present
custom pg_constraint/pg_trigger/pg_proc financial objects present
no negative lot balances
lot balance equation reconciles allocations/restorations/expiry evidence
ledger source-link invariants hold
report materialization can rebuild
outbox financially relevant work remains recoverable
```

Exit non-zero on any mismatch.

- [ ] **Step 4: Configure real environment backup ownership**

Document the actual staging/production database provider's daily backup/PITR setting in deployment evidence. Repository scripts are a verification/drill mechanism; they do not substitute for enabling provider-managed encrypted scheduled backups.

- [ ] **Step 5: Perform the restore drill before production sign-off**

Measure:

```text
backup/source timestamp
restore start
restore completed
verification completed
observed RPO
observed RTO
release SHA
migration inventory hash
result PASS/FAIL
```

The pilot cannot launch unless observed RPO <=24h and RTO is within the same business day.

- [ ] **Step 6: Commit automation/docs; evidence from the actual drill is committed separately**

```bash
git add scripts/backup docs/runbooks/database-backup.md docs/runbooks/database-restore.md docs/database/migration-tracker.md docs/release-evidence/sprint-5 package.json
git commit -m "ops: add backup and restore verification workflow"
```

---

### Task 11: Complete Operational Runbooks and Pilot Training Support

**Files:**
- Modify: `docs/runbooks/deployment.md`
- Modify: `docs/runbooks/rollback.md`
- Modify: `docs/runbooks/database-restore.md`
- Modify: `docs/runbooks/incident-response.md`
- Modify: `docs/runbooks/sms-failure.md`
- Create: `docs/runbooks/duplicate-credit.md`
- Create: `docs/runbooks/lost-card.md`
- Create: `docs/runbooks/security-incident.md`
- Create: `docs/runbooks/outbox-backlog.md`
- Create: `docs/training/cashier-pilot.md`
- Create: `docs/training/supervisor-pilot.md`
- Create: `docs/training/owner-pilot.md`
- Create: `docs/pilot/day-0-checklist.md`
- Create: `docs/pilot/daily-review.md`
- Create: `docs/operations/pilot-monitoring.md`

**Interfaces:**
- These documents point to real commands/endpoints/error codes already present; they do not invent manual SQL that mutates confirmed ledger history.

- [ ] **Step 1: Expand deploy/rollback into executable runbooks**

Deployment sequence must match the TRD:

```text
freeze release SHA/tag
verify backup + migration precheck
deploy/migrate staging
readiness + Bruno + contract + security/perf evidence
manual production approval
deploy worker before/with API
postdeploy health
earn/redeem synthetic smoke
monitor queue/SMS/offline/fraud/reconciliation
```

Rollback explains when application rollback is safe versus when schema requires forward-fix, and prohibits reversing already-applied financial data migrations by deleting evidence.

- [ ] **Step 2: Add duplicate-credit and lost-card runbooks**

Duplicate credit flow must use receipt/audit/ledger evidence, then supervisor/admin reversal/adjustment APIs where policy allows; never edit ledger rows directly.

Lost card flow uses customer verification, block/replace card, confirms balance stays customer-owned, and reviews FR-REPL-001 when replacement frequency is suspicious.

- [ ] **Step 3: Add security and outbox backlog runbooks**

Security incident includes credential rotation, session revocation, scope assessment, logs/audit/Sentry evidence and notification/escalation ownership.

Outbox backlog includes DB/Redis health, oldest pending event age, dead-letter review, worker restart, recovery verification and duplicate-send protections.

- [ ] **Step 4: Create role-specific pilot training**

Cashier training covers card lookup, earn, redeem limits, duplicate receipts, offline earn queue, prohibition of offline redemption, and request-ID escalation.

Supervisor training covers registration, card replacement, approvals, reversals, fraud flags, offline conflicts, SMS failures and exception escalation.

Owner/admin training covers reports, operations summary, backup/restore responsibility, user suspension, policy/incident review and pilot daily review.

- [ ] **Step 5: Create pilot monitoring cadence**

Daily pilot review records:

```text
checkout errors/5xx
oldest outbox age/dead letters
SMS failures/backlog
offline rejected/retryable counts
open HIGH fraud flags
credit issued/redeemed/expired/outstanding liability
ledger reconciliation status
restore/backup freshness
security alerts
operator incidents and request IDs
```

- [ ] **Step 6: Commit**

```bash
git add docs/runbooks docs/training docs/pilot docs/operations
git commit -m "docs: add sprint 5 pilot operations and training"
```

---

### Task 12: Create a Machine-Verifiable Production Readiness Gate

**Files:**
- Create: `docs/release/production-readiness-checklist.md`
- Create: `docs/release-evidence/sprint-5/evidence.example.json`
- Create: `scripts/release/verify-sprint5-readiness.cjs`
- Create: `scripts/release/verify-sprint5-readiness.spec.cjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

```bash
npm run verify:sprint5-readiness -- docs/release-evidence/sprint-5/evidence.json
```

Evidence schema must contain at least:

```json
{
  "releaseSha": "40-hex-sha",
  "security": {
    "gitleaks": "PASS",
    "codeql": "PASS",
    "trivy": "PASS",
    "zap": "PASS",
    "highCriticalOpen": 0
  },
  "performance": { "result": "PASS" },
  "restore": {
    "result": "PASS",
    "rpoHours": 24,
    "rtoMinutes": 480
  },
  "staging": {
    "health": "PASS",
    "bruno": "PASS",
    "contract": "PASS"
  },
  "rollback": { "rehearsed": true },
  "training": {
    "cashier": true,
    "supervisor": true,
    "owner": true
  },
  "signoff": {
    "technicalLead": true,
    "qaReviewer": true,
    "shopCityRepresentative": true
  }
}
```

The example is documentation only; the real evidence file is created during certification with measured values and the actual release SHA.

- [ ] **Step 1: Write verifier tests first**

Cases must fail for SHA mismatch/invalid SHA, security HIGH/CRITICAL >0, failed restore, RPO >24h, RTO beyond configured same-business-day threshold, failed staging smoke, missing training, or missing required signoff.

- [ ] **Step 2: Implement the verifier**

Use Node standard library only. Print concise failing gate names and exit `1`; print release SHA and all passed categories on success.

- [ ] **Step 3: Add the checklist**

The human checklist includes links/paths to every evidence artifact and explicitly separates:

```text
engineering complete
staging certified
production approved
pilot started
```

- [ ] **Step 4: Run verifier tests**

```bash
node --test scripts/release/verify-sprint5-readiness.spec.cjs
npm run verify:sprint5-readiness -- docs/release-evidence/sprint-5/evidence.example.json
```

The example may be a structurally valid demonstration file; it must be clearly marked `example` and never be accepted as actual production evidence by release scripts unless explicitly passed for test mode.

- [ ] **Step 5: Commit**

```bash
git add docs/release docs/release-evidence/sprint-5 scripts/release package.json .github/workflows/ci.yml
git commit -m "ops: add sprint 5 production readiness gate"
```

---

### Task 13: Final Sprint 5 Release Candidate Certification

**Files:**
- Modify: `docs/release-evidence/sprint-5/evidence.json`
- Modify: `docs/release/production-readiness-checklist.md`
- Modify: `docs/database/migration-tracker.md`
- Modify: `CHANGELOG.md`
- Reconcile: `openspec/changes/sprint-4-review-44-certification/tasks.md`
- Complete: `openspec/changes/sprint-5-hardening-and-pilot/tasks.md`

**Interfaces:**
- Produces one immutable release-candidate SHA referenced by local evidence, GitHub Actions, security scans, performance results, restore drill and sign-off.

- [ ] **Step 1: Freeze the release candidate**

No code/doc mutation after this point without generating a new candidate SHA and rerunning affected gates.

- [ ] **Step 2: Run the complete local gate on that SHA**

```bash
npm ci
npm run prisma:generate
npm run prisma:validate
npm run format:check
npm run lint:src
npm run lint:test
npm run typecheck
npm run build
npm run verify:prod-entrypoints
npm run architecture:check
npm run test -- --runInBand
npm run test:coverage:critical
npm run test:integration:prime
npm run test:integration
npm run test:e2e
npm run openapi:lint
npm run openapi:diff
npm run client:generate
npm run client:typecheck
npm run openspec:validate
npm run verify:release-artifacts
npm run validate:scope
node --test scripts/release/verify-sprint5-readiness.spec.cjs
```

Also verify generated files are clean:

```bash
git diff --exit-code -- docs/api/openapi.json client/shopcity-client.ts
```

- [ ] **Step 3: Run fresh and upgrade migration certification**

Apply every migration to a clean PostgreSQL database and apply only the new Sprint 5 migration(s) to a representative pre-Sprint5 database copy. Verify all custom constraint/trigger/function inventory.

- [ ] **Step 4: Build and scan the exact image**

```bash
docker build --label org.opencontainers.image.revision="$GIT_SHA" -t "shopcity-lp:$GIT_SHA" .
```

Record digest and scan result. The digest becomes the deployment artifact identifier.

- [ ] **Step 5: Deploy candidate to staging and run live gates**

Required:

```text
health/live PASS
health/ready PASS
Bruno critical journeys PASS
OpenAPI/contract PASS
ZAP baseline PASS
k6 pilot suite PASS
operations/pilot-summary healthy
ledger reconciliation PASS
SMS sandbox/real-provider approved smoke PASS
```

- [ ] **Step 6: Complete the restore and rollback rehearsals**

Restore a current backup into an isolated environment, run invariant verification, then exercise the documented application rollback/forward-fix path against synthetic data.

- [ ] **Step 7: Push and require GitHub Actions green on the same SHA**

Required jobs:

```text
Static Checks
Integration Tests
End-to-End Tests
GitNexus
security/Gitleaks
security/CodeQL
security/Trivy
container build
```

Do not reuse a green run from an earlier SHA.

- [ ] **Step 8: Close Sprint 4 certification carry-forward**

Update Review 44 evidence with the actual historical/final certified SHA state as appropriate. Do not leave `_pending final commit and CI run_` placeholders when the project is being declared production-ready.

- [ ] **Step 9: Complete the real Sprint 5 evidence and obtain sign-off**

The final `evidence.json` and checklist must reference the same SHA/image digest and measured restore/performance/security evidence. Required human sign-off: technical lead, QA/reviewer, ShopCity representative.

- [ ] **Step 10: Run the readiness verifier against the real evidence**

```bash
npm run verify:sprint5-readiness -- docs/release-evidence/sprint-5/evidence.json
```

Expected: PASS with the release SHA and zero unresolved mandatory gates.

- [ ] **Step 11: Commit certification evidence**

```bash
git add docs/release-evidence/sprint-5 docs/release/production-readiness-checklist.md docs/database/migration-tracker.md CHANGELOG.md openspec/changes/sprint-4-review-44-certification openspec/changes/sprint-5-hardening-and-pilot
git commit -m "chore: certify sprint 5 pilot readiness"
```

Because this evidence commit changes the SHA, distinguish the **tested application artifact SHA/image digest** from the **evidence-only commit SHA**. If policy requires evidence to live on the exact application SHA, generate the evidence outside Git and attach it as a release artifact instead; do not create an impossible self-referential SHA requirement.

---

## Sprint 5 Checkpoints

### Checkpoint A — 25%: expiry foundation

Required before moving on:
- `EXPIRY` ledger type + immutable `CreditExpiry` evidence exists.
- System actor is non-human and cannot be assigned through user APIs.
- Full, partial and replay expiry integration tests pass.
- Historical reporting design accounts for expiry evidence.

### Checkpoint B — 45%: expiry/reminders operational

Required:
- Daily expiry worker is multi-worker safe.
- 30-day reminder aggregates one customer/day and is replay-safe.
- Expiry vs redemption concurrency passes.
- SMS failure has no financial effect.
- OpenAPI/client/reporting understand expiry.

### Checkpoint C — 65%: production hardening

Required:
- Pino release metadata + redaction and Sentry integration.
- Pilot operations/reconciliation endpoint.
- Docker image builds API + worker.
- Gitleaks, CodeQL, Trivy workflows exist and have no unresolved high/critical findings.
- ZAP staging workflow is configured.

### Checkpoint D — 80%: capacity and recovery

Required:
- k6 suite meets agreed pilot thresholds.
- Provider-managed backup policy is enabled/documented.
- Automated backup/restore verification scripts pass.
- Restore drill demonstrates <=24h RPO and same-business-day RTO.

### Checkpoint E — 90%: pilot-ready engineering

Required:
- All runbooks complete and executable.
- Cashier/supervisor/owner training material complete.
- Pilot daily monitoring and escalation process complete.
- Full local/static/integration/E2E/contracts/migration suite green.

### Final 100% release certification

Required regardless of numeric score:
- exact release candidate/image digest deployed to staging;
- security, k6, Bruno, health and reconciliation evidence green;
- restore + rollback rehearsal passed;
- GitHub Actions green on the tested SHA;
- no high/critical security findings;
- production-readiness checklist signed;
- ShopCity pilot owner accepts Day-0 readiness.

---

## Self-Review Against the TRD

### Spec coverage

- Sprint 5 expiry jobs: Tasks 2–4.
- 30-day expiry reminder aggregation: Task 4.
- Expiry-aware reports/API/SMS: Task 5.
- Pino/Sentry/health/pilot alerts/reconciliation: Task 6.
- Docker/release artifact: Task 7.
- Gitleaks/CodeQL/Trivy/ZAP: Task 8.
- k6 card lookup/earn/redeem/report isolation: Task 9.
- Daily backup, RPO/RTO, restore test, Redis reconstruction principle: Task 10.
- Deploy/rollback/restore/SMS/duplicate credit/lost card/security runbooks: Task 11.
- Training support and pilot monitoring: Task 11.
- Production readiness checklist and signed exit gate: Tasks 12–13.
- Every-story quality gates/OpenAPI/migrations/no high-critical findings: Tasks 1–13 and final certification.

### Intentional non-goals

- No POS integration.
- No offline redemption.
- No customer portal/digital card/WhatsApp.
- No microservices migration.
- No ML fraud system.
- No data warehouse.
- No rewrite of Sprint 3 redemption/reversal or Sprint 4 reporting/offline architecture unless a Sprint 5 regression test exposes a concrete correctness defect.

### Stop conditions during implementation

Stop the current task and treat the finding as a release blocker if any test shows:

```text
confirmed ledger mutation/deletion
negative lot or customer balance
duplicate expiry debit for one lot
expiry amount greater than remaining credit
expired credit redeemable after authoritative expiry time
historical report leaking post-watermark expiry backward
SMS/Redis/Sentry outage rolling back a committed financial transaction
backup restore losing migration/custom-SQL financial invariants
security scan finding an unresolved reachable HIGH/CRITICAL issue
load test causing financial invariant failure
```

The Sprint 5 goal is not merely “all tasks checked”; it is demonstrable pilot safety on one identified release artifact.