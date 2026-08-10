Sprint 4 — Offline, Fraud and Reporting Implementation Plan

> Recommended plan location: docs/superpowers/plans/2026-08-10-sprint-4-offline-fraud-reports.md
> Recommended OpenSpec change: openspec/changes/sprint-4-offline-fraud-reports/

Goal: Implement conflict-safe offline earn synchronization, deterministic fraud detection/review, dashboard/reporting read models, and controlled exports without weakening the financial guarantees established in Sprints 2–3.

Architecture: Keep ShopCity as the existing NestJS modular monolith. Offline sync must reuse the canonical earn engine rather than becoming a second financial path. Fraud detection produces separate operational evidence and must never mutate confirmed financial history. Reporting uses rebuildable read models derived from authoritative receipts, ledger entries, credit lots, allocations, approvals, SMS and audit records.

Tech stack: NestJS/Fastify, Prisma/PostgreSQL, Redis/BullMQ, existing transactional outbox, Jest/Testcontainers, OpenAPI/Spectral/oasdiff, Orval, Bruno.

The current TRD defines Sprint 4 specifically as offline batch sync, fraud rules, dashboard read models and exports, with an exit gate of offline conflict tests passing and reporting definitions being accepted. Expiry jobs/reminders, security/load hardening, backups and pilot readiness remain Sprint 5.

This separation should remain strict.

---

1. Sprint 4 scope

In scope

1. Offline earn-only synchronization.

2. Per-record conflict handling and replay.

3. Offline synchronization history/reconciliation.

4. Fraud signal/flag persistence.

5. Existing high-risk rules integrated with fraud evidence.

6. New behavioral fraud rules.

7. Supervisor/admin fraud review dashboard API.

8. Executive reporting.

9. Liability ageing.

10. Cashier activity.

11. Customer performance.

12. Redemption reporting.

13. SMS operations reporting.

14. Audit reporting.

15. CSV exports.

16. Report materialization/refresh.

17. OpenAPI, generated client and Bruno journeys.

18. Full offline/fraud/report integration and concurrency suite.

The TRD explicitly says offline mode is continuity support rather than another ledger, and that redemptions, approvals, card replacement and manual adjustments remain blocked offline.

Explicitly out of Sprint 4

Offline redemption.

Offline supervisor approvals.

Offline card replacement.

Offline manual adjustment.

Credit-expiry execution.

Expiry reminder SMS.

Production load testing.

Security certification.

Backup/restore certification.

Full pilot runbooks/training.

ML-based fraud detection.

Large data-warehouse infrastructure.

Direct POS integration.

---

2. First: freeze the Sprint 3 boundary

Before Sprint 4 implementation begins, I would make one small Sprint 3 closure patch, rather than allowing these items to leak into Sprint 4:

make adjustment effectiveAt contract explicitly required;

normalize already-reversed error semantics;

add redemption-vs-manual-debit concurrency test;

obtain the final green CI evidence and close Issue #3.

Then freeze Sprint 3.

Do not use Sprint 4 to continue redesigning redemption/reversal.

---

3. Architectural rules for Sprint 4

The repository already has a mature financial schema—receipts, immutable ledger entries, credit lots, redemptions, allocations, adjustments, approvals, outbox, SMS, idempotency and audit—but currently has no Sprint 4 offline/fraud/report domain models.

The following invariants should therefore govern every Sprint 4 task.

Financial authority

Offline sync must eventually execute the same earn command that online earning uses.

Never create:

OfflineEarnLedgerService

with its own ledger-writing implementation.

Conceptually:

Online request ───────┐
├─> Canonical Earn Execution
Offline sync record ──┘
│
├─ Receipt
├─ Ledger
├─ CreditLot
├─ Approval
├─ Audit
├─ Outbox/SMS
└─ Idempotency

Offline changes how the command arrives, not how money is created.

Trust boundary

Client-submitted offline values are evidence, not authority.

The server must derive or verify:

authenticated cashier;

session-bound device;

branch;

receipt week;

card state;

customer state;

staff eligibility;

earn percentage;

approval requirements;

resulting balance.

This continues the repository rule that frontend-supplied balances, roles and approvals cannot be trusted.

Reporting authority

Reports may be mutable and rebuildable.

Financial history may not.

Authoritative domain tables
↓
Reporting materializer
↓
Derived reporting tables
↓
Dashboard / CSV

Deleting and rebuilding report read models is acceptable.

Editing a confirmed ledger row to correct a report is not.

---

4. Proposed file structure

New feature modules

src/modules/offline-sync/
offline-sync.module.ts
offline-sync.controller.ts
offline-sync.service.ts
offline-sync.dto.ts
offline-sync.types.ts
offline-sync.policy.ts
offline-sync.service.spec.ts

src/modules/fraud/
fraud.module.ts
fraud.controller.ts
fraud.service.ts
fraud-rules.service.ts
fraud.dto.ts
fraud.types.ts
fraud.service.spec.ts
fraud-rules.service.spec.ts

src/modules/reports/
reports.module.ts
reports.controller.ts
reports.service.ts
reports.dto.ts
reports.queries.ts
report-materializer.service.ts
report-export.service.ts
reports.service.spec.ts
report-materializer.service.spec.ts
report-export.service.spec.ts

src/jobs/
fraud-evaluation.worker.ts
report-materialization.worker.ts

Existing files to modify

src/app.module.ts
src/bootstrap.ts
src/worker.ts
src/config/env.validation.ts
src/modules/loyalty/loyalty.service.ts
src/jobs/outbox-worker.runtime.ts
prisma/schema.prisma
package.json
.github/workflows/ci.yml
docs/api/error-catalogue.md
docs/database/migration-tracker.md
docs/TRD.md

The current AppModule cleanly follows feature-module boundaries, so OfflineSync, Fraud and Reports should follow the same pattern rather than being pushed into LoyaltyModule.

---

5. Workstream A — Sprint 4 contracts and policy

Task 1: Create Sprint 4 OpenSpec

Create:

openspec/changes/sprint-4-offline-fraud-reports/
proposal.md
design.md
tasks.md

specs/
offline-earn-sync/spec.md
fraud-detection/spec.md
fraud-review/spec.md
reporting/spec.md
report-export/spec.md

Before modifying implementation symbols, run the repository-required GitNexus impact analysis and record it in:

docs/development/gitnexus-impact-tracker.md

The repository explicitly requires impact analysis before implementation proposals and before symbol edits.

Lock these policy values

Add internal configuration for:

OFFLINE_SYNC_MAX_RECORDS
OFFLINE_EARN_MAX_AGE_HOURS

FRAUD_CARD_DAILY_COUNT_THRESHOLD
FRAUD_CASHIER_MIN_SAMPLE_SIZE
FRAUD_CASHIER_VALUE_RATIO_THRESHOLD
FRAUD_ROUNDED_VALUE_MIN_SAMPLE
FRAUD_REVERSAL_WINDOW_HOURS
FRAUD_REVERSAL_COUNT_THRESHOLD
FRAUD_CARD_REPLACEMENT_WINDOW_DAYS
FRAUD_CARD_REPLACEMENT_COUNT_THRESHOLD

DORMANT_CUSTOMER_DAYS
REPORT_EXPORT_MAX_ROWS
REPORT_MATERIALIZE_INTERVAL_MS

I would use 90 days for DORMANT_CUSTOMER_DAYS, because that is the TRD's recommended initial definition.

Fraud thresholds should remain server-side and must not be exposed through /configuration/public.

---

6. Workstream B — database foundation

Task 2: Offline synchronization evidence

Add:

enum OfflineSyncStatus {
CONFIRMED
PENDING_APPROVAL
REJECTED
RETRYABLE
}

And approximately:

OfflineSyncAttempt

- id
- tenantId
- localId
- idempotencyKey
- requestHash
- cashierId
- branchId
- deviceId
- posReceiptNumber
- receiptWeekStartSubmitted
- receiptWeekStartDerived
- purchaseAmountKobo
- occurredAt
- status
- errorCode
- transactionId
- approvalId
- syncedAt
- createdAt

Critical constraints:

UNIQUE tenantId + deviceId + localId
INDEX tenantId + status + syncedAt
INDEX tenantId + branchId + syncedAt
INDEX tenantId + cashierId + syncedAt

This table is sync evidence, not a second ledger.

---

7. Workstream C — offline earn synchronization

Task 3: Implement the batch contract

Endpoint:

POST /api/v1/offline-sync/earn-batch

Request:

{
"deviceId": "uuid",
"records": [
{
"localId": "uuid",
"idempotencyKey": "uuid",
"cashierId": "uuid",
"branchId": "uuid",
"cardBarcode": "SC-00001234",
"receiptNumber": "10452",
"receiptWeekStart": "2026-07-13",
"purchaseAmountKobo": 1000000,
"occurredAtLocal": "2026-07-19T09:44:00+01:00"
}
]
}

This follows the TRD's existing offline contract.

Response should always preserve localId:

{
"localId": "uuid",
"status": "CONFIRMED",
"transactionId": "uuid",
"approvalId": null,
"creditEarnedKobo": 20000,
"errorCode": null,
"retryable": false
}

Batch semantics

Do not wrap the entire batch in one transaction.

Each record is independently atomic.

Therefore:

100 records
├─ 97 CONFIRMED
├─ 1 PENDING_APPROVAL
└─ 2 REJECTED

must not become:

0 records because record 99 was bad

Process records sequentially initially. The financial path is sufficiently sensitive that aggressive parallelism inside one request provides little MVP benefit.

---

8. Workstream D — canonical offline-to-online earn reuse

Task 4: Refactor the earn command boundary

LoyaltyService should retain one financial execution implementation.

Introduce a trusted execution context concept such as:

type EarnSource = 'ONLINE' | 'OFFLINE_SYNC';

Then make both entry points converge before any financial write.

Offline-specific behavior should affect only:

timestamp tolerance
submitted-week verification
sync metadata
source/audit metadata

It must not alter:

earn calculation
receipt uniqueness
card/customer validation
staff exclusion
approval policy
ledger creation
credit-lot creation
idempotency
outbox/SMS

---

9. Workstream E — offline conflict engine

Task 5: Implement all TRD conflict outcomes

The TRD already establishes the primary conflict matrix.

Implement these stable outcomes:

Situation Result

Existing same local ID + same hash replay original sync result
Same local ID + different payload SYNC_RECORD_CONFLICT
Same idempotency key + same canonical request original financial response
Same key + changed canonical request IDEMPOTENCY_CONFLICT
Receipt already captured RECEIPT_ALREADY_USED
Card replaced/inactive CARD_INACTIVE
Staff customer STAFF_INELIGIBLE
Approval threshold crossed PENDING_APPROVAL
Local/server week disagreement SYNC_WEEK_MISMATCH
Wrong authenticated cashier SYNC_ACTOR_MISMATCH
Wrong device SYNC_DEVICE_MISMATCH
Wrong branch SYNC_BRANCH_MISMATCH
Offline record too old SYNC_RECORD_EXPIRED
Exhausted serialization retries retryable transaction conflict

Server week is authoritative

Never use:

receiptWeekStartSubmitted

to populate the authoritative receipt.

Calculate it again from:

occurredAtLocal

- branch timezone
- branch receiptWeekStartDay

and compare.

---

10. Mandatory offline conflict test suite

This should be the first major Sprint 4 gate.

Create:

test/offline-earn-sync.int-spec.ts
test/offline-earn-sync-http.int-spec.ts

It must prove:

1. disconnected earn syncs once;

2. identical replay returns exactly the original response;

3. changed payload under same local ID is rejected;

4. changed payload under same idempotency key is rejected;

5. online earn followed by offline replay cannot duplicate credit;

6. offline earn followed by online retry cannot duplicate credit;

7. simultaneous sync of one receipt from two requests produces exactly one financial effect;

8. inactive card fails;

9. replaced card fails;

10. staff account fails;

11. wrong cashier fails;

12. wrong device fails;

13. wrong branch fails;

14. incorrect submitted receipt week fails;

15. high-value record produces pending approval;

16. pending approval creates no ledger/lot/SMS effect;

17. successful sync produces exactly one receipt, ledger entry and lot;

18. mixed-result batch does not roll back valid neighboring records.

Sprint 4 checkpoint A

Do not start reporting implementation until this suite is green.

This directly attacks Sprint 4's principal exit gate.

---

11. Workstream F — fraud evidence model

Task 6: Add FraudFlag

Suggested model:

FraudFlag

- id
- tenantId
- ruleCode
- severity
- status
- subjectType
- subjectId
- branchId?
- transactionId?
- customerId?
- cardId?
- actorId?
- dedupeKey
- occurrenceCount
- evidence JSON
- firstDetectedAt
- lastDetectedAt
- acknowledgedAt?
- acknowledgedBy?
- resolvedAt?
- resolvedBy?
- resolutionReason?

Enums:

FraudSeverity
LOW
MEDIUM
HIGH

FraudFlagStatus
OPEN
ACKNOWLEDGED
RESOLVED

dedupeKey prevents asynchronous replay from creating multiple dashboard cases for the same subject/window.

Fraud data may be updated as operational state changes.

Financial records still may not be changed.

---

12. Workstream G — implement the TRD fraud rules

The TRD defines ten named rules.

Existing financial-policy rules

Wire fraud evidence into functionality that already exists:

FR-DUP-001
Duplicate branch + receipt + week
→ block + HIGH fraud flag

FR-HV-001
High-value purchase
→ allow + MEDIUM flag

FR-HV-002
Very-high-value purchase
→ HIGH flag + existing approval workflow

FR-RED-001
High-value redemption
→ HIGH signal + existing approval workflow

Do not reimplement approval logic in FraudService.

Fraud detects.

Financial policy decides.

---

13. Behavioral fraud rules

Task 7: FraudRulesService

Implement deterministic evaluators for:

FR-CARD-001

Same card used above configured daily count.

Query:

Receipt
WHERE tenant + card
AND occurredAt within branch-local day

FR-CASH-001

Cashier transaction count/value materially above peer baseline.

Require:

minimum peer/sample count
configured ratio threshold
same branch/comparable period

Never flag someone based on a one- or two-transaction sample.

FR-ROUND-001

Repeated rounded values from one cashier.

Define "rounded" explicitly, for example values divisible by configurable NGN boundaries, and require a minimum sample before flagging.

FR-REV-001

Unusual reversal frequency.

Use immutable reversal links rather than guessing from adjustments.

FR-REPL-001

Frequent card replacements within a configured time window.

FR-AUTH-001

Repeated login failures/forbidden API access.

Use security/audit evidence.

---

14. Workstream H — durable asynchronous fraud evaluation

The TRD explicitly defines fraud.evaluate as a background job after transactions and during scheduled summary analysis.

There is an architectural issue to address first: the existing outbox runtime currently queries only sms.send and explicitly dead-letters unsupported event types.

Task 8: Generalize outbox dispatch safely

Refactor:

OutboxWorkerRuntime
│
▼
Outbox Handler Registry
├── sms.send
└── fraud.evaluate

Do not intermingle SMS-specific validation with fraud payload validation.

Conceptually:

interface OutboxEventHandler {
eventType: string;
handle(event: OutboxEvent): Promise<void>;
}

Existing SMS behavior must remain bit-for-bit regression tested.

Fraud event requirements

Financial transaction commits:

financial state

- existing SMS intent
- fraud.evaluate outbox intent

atomically where applicable.

The asynchronous evaluator may fail or retry without invalidating the financial transaction.

---

15. Fraud dashboard API

Task 9

Endpoints:

GET /api/v1/fraud/flags

GET /api/v1/fraud/flags/{id}

POST /api/v1/fraud/flags/{id}/decision

Filtering:

status
severity
ruleCode
branchId
actorId
customerId
from
to
cursor
limit

Decision:

{
"decision": "ACKNOWLEDGED",
"reason": "Reviewed receipt history with supervisor"
}

or:

{
"decision": "RESOLVED",
"reason": "Legitimate bulk purchase"
}

Authorization

Cashier: no access.

Supervisor: own branch.

Admin/Owner: tenant-wide.

Cross-branch supervisor requests should remain non-enumerating.

---

16. Workstream I — reporting definitions before reporting code

This is extremely important.

The Sprint 4 exit gate explicitly says reporting definitions accepted, not merely "some SQL returns numbers."

Create:

docs/database/reporting-definitions.md

and freeze every metric before materialization code.

The TRD already provides the foundation.

Required definitions

Outstanding liability

SUM(CreditLot.remainingAmountKobo)
WHERE remainingAmountKobo > 0
AND expiresAt > asOf

Credit issued

SUM confirmed EARN credits

Do not count manual credit adjustments as "earn credit issued."

Credit redeemed

confirmed REDEEM debit
minus confirmed reversal amounts against those redemptions

Expired credit

Until Sprint 5 physically expires lots:

remainingAmountKobo
WHERE expiresAt <= asOf

This is analytical expiry, not an expiry ledger transaction.

Active customer

Recommended Sprint 4 definition:

> Customer with at least one confirmed financial transaction during the selected period.

Dormant customer

No confirmed transaction during the configured dormant period; initial TRD recommendation is 90 days.

---

17. Workstream J — reporting read models

Task 10: Prisma reporting tables

I recommend derived tables rather than expensive dashboard aggregation on every request:

ReportDailyFinancialSummary
ReportCashierDailySummary
ReportCustomerSnapshot
ReportLiabilityBucket
ReportRedemptionDailySummary
ReportSmsDailySummary
ReportMaterializationState

They should contain:

tenantId
branchId where applicable
period/date
metric dimensions
integer-kobo values
materializedAt

These tables are:

derived;

rebuildable;

mutable;

never financial authority.

Materializer

ReportMaterializerService

must support:

materializeTenant(tenantId, options)
materializeBranch(tenantId, branchId, options)
rebuildTenant(tenantId)

A retry must produce the same values rather than adding metrics twice.

Use UPSERT/replace semantics, not incremental blind addition.

---

18. Reporting API

Task 11

Implement:

GET /api/v1/reports/executive-summary
GET /api/v1/reports/liability-ageing
GET /api/v1/reports/cashier-activity
GET /api/v1/reports/customer-performance
GET /api/v1/reports/redemptions
GET /api/v1/reports/sms-operations
GET /api/v1/reports/audit

All reporting money values remain integer kobo.

All endpoints should accept:

from
to
branchId
timezone where appropriate
cursor
limit

Never make the client infer the timezone used for bucketing.

Return it.

---

19. Required report semantics

Executive summary

Return:

registeredCustomers
activeCustomers
loyaltyPurchaseValueKobo
creditIssuedKobo
creditRedeemedKobo
creditExpiredKobo
outstandingLiabilityKobo

Liability ageing

Return:

expiryMonth
ageBucket
customerCount
lotCount
outstandingKobo

Cashier activity

Return:

cashierId
transactionCount
purchaseValueKobo
creditIssuedKobo
duplicateAttempts
reversalCount
approvalRequests
fraudFlags

Customer performance

Return:

customerId
maskedPhone
purchaseValueKobo
currentBalanceKobo
visitCount
lastActivityAt
dormant

Supervisor views must remain branch-scoped.

Redemption report

Return:

redemptionCount
redeemedKobo
basketValueKobo
averageBasketRatioBps
approvalCount
allocationCount
reversalCount

Use basis points for ratios rather than floating-point percentages.

SMS operations

Return:

queued
sent
delivered
failed
suppressed
retryCount
deadLetterCount

This can derive directly from the existing SMS operational records.

---

20. Workstream K — report materialization worker

The existing worker currently boots the outbox and approval-expiry runtimes.

Task 12

Add:

ReportMaterializationWorkerRuntime

with:

scheduled periodic refresh
safe overlapping-run prevention
tenant-by-tenant isolation
watermark tracking
bounded batch processing
structured result logging
graceful shutdown

Also support an admin-only asynchronous refresh:

POST /api/v1/reports/refresh

Response:

202 Accepted

Do not make an HTTP report request perform a full tenant rebuild synchronously.

---

21. Workstream L — exports

Task 13

MVP format:

CSV

No XLSX/PDF export in Sprint 4.

Endpoint pattern:

GET /api/v1/reports/{report}/export?format=csv&from=...&to=...

Security rules

Admin/Owner only for raw exports.

Supervisor dashboard queries may remain branch-scoped, but no unrestricted exports.

Phone numbers masked unless explicitly permitted.

Every export creates an audit event.

Export row count capped.

Report/export rate limiting: 10/minute per admin, matching the TRD baseline.

CSV serializer must escape quotes/newlines correctly.

Prevent spreadsheet-formula injection for values starting with =, +, - or @.

---

22. Workstream M — report correctness suite

Create:

test/reporting.int-spec.ts
test/report-materialization.int-spec.ts
test/report-export-http.int-spec.ts

Build one deterministic financial fixture containing:

earn
high-value earn approval
redemption
redemption reversal
manual credit
manual debit
expired lot
active lot
duplicate attempt
fraud flag
successful SMS
failed SMS
multiple cashiers
multiple branches
active customer
dormant customer

Then assert the exact expected numbers.

This should become the golden reporting fixture for future reviews.

Important test

Compute each report two ways:

authoritative source query
vs.
materialized reporting result

and require equality.

That prevents silent reporting drift.

---

23. Workstream N — OpenAPI and frontend integration

Task 14

Update bootstrap.ts tags:

offline-sync
fraud
reports

The project already generates and verifies OpenAPI and the Orval client in CI.

Required contracts:

offline batch request/response
per-record conflicts
fraud list/detail/decision
all reports
CSV export
report refresh
pagination
role restrictions
stable error codes

Then run:

npm run openapi:lint
npm run openapi:diff
npm run client:generate
npm run client:typecheck

Commit generated:

docs/api/openapi.json
client/shopcity-client.ts

No manual edits to generated client code.

---

24. Bruno journeys

Task 15

Add runnable journeys for:

offline confirmed earn
offline replay
offline duplicate conflict
offline inactive card
offline week mismatch
offline pending approval

fraud flag listing
fraud acknowledgement
fraud resolution
supervisor cross-branch denial

executive report
liability report
cashier report
customer report
redemption report
SMS report
CSV export

---

25. Sprint 4 observability

Add structured fields for offline sync:

batchSize
confirmedCount
pendingApprovalCount
rejectedCount
retryableCount
deviceId
branchId
durationMs

For fraud:

ruleCode
severity
subjectType
flagId
deduped
evaluationDurationMs

For reports:

reportType
tenantId
branchId
dateRange
rowCount
materializedThrough
durationMs

Never log:

full phone
card secrets
session tokens
attestation secrets
SMS credentials

---

26. Sprint 4 migration strategy

I would use two major migrations, not one giant migration.

Migration A — operational foundation

202608xx_sprint_4_offline_fraud_foundation

Adds:

OfflineSyncAttempt
FraudFlag
fraud enums
indexes
constraints

Migration B — reporting read models

202608xx_sprint_4_reporting_read_models

Adds:

ReportDailyFinancialSummary
ReportCashierDailySummary
ReportCustomerSnapshot
ReportLiabilityBucket
ReportRedemptionDailySummary
ReportSmsDailySummary
ReportMaterializationState

Both require:

fresh database migration test
Sprint 3 → Sprint 4 upgrade test
Prisma validation
migration tracker update

---

27. Test hierarchy

Unit

offline policy
week comparison
fraud rules
report metric definitions
CSV escaping
masking

Application

offline record orchestration
fraud flag deduplication
report materializer
report RBAC

PostgreSQL integration

offline replay uniqueness
financial idempotency reuse
fraud dedupe constraints
materialization idempotency
migration upgrade

Concurrency

two offline copies of same receipt
online earn vs offline earn
two offline batches with same local record
fraud evaluator duplicate delivery
two report materializers for same tenant

HTTP

auth
CSRF
RBAC
DTO validation
batch size
statuses
pagination
export content type

Contract

OpenAPI lint
oasdiff
generated client
Bruno

---

28. Critical Sprint 4 acceptance tests

These are the tests I would personally use when deciding whether Sprint 4 is finished.

Gate Required outcome

Offline vs online same receipt exactly one earn
Offline identical replay exact original response
Offline changed replay conflict, no financial mutation
Mixed offline batch valid records survive invalid neighbors
Offline high-value earn pending approval, zero pre-approval financial effect
Wrong week deterministic rejection
Wrong device/cashier deterministic rejection
Duplicate fraud evaluation one logical flag
Fraud rule replay no duplicate case explosion
Report materialization rerun same totals
Report source vs read model exact equality
Cross-branch supervisor report denied/non-enumerating
Cashier raw report/export denied
CSV export audited + row-capped + escaped
Full Sprint 2/3 financial suite no regression

---

29. Sprint checkpoints

Checkpoint 1 — Offline foundation

Must have:

schema;

endpoint;

canonical earn reuse;

conflict matrix;

idempotency;

mixed batches;

concurrency;

HTTP contract.

Gate: the complete offline conflict suite passes.

At this point I would consider Sprint 4 approximately 35% complete.

---

Checkpoint 2 — Fraud foundation

Must have:

FraudFlag model;

synchronous rules;

asynchronous fraud.evaluate;

outbox dispatcher;

dashboard endpoint;

deduplication;

supervisor/admin scope.

Gate: all ten TRD rules are either implemented or explicitly mapped to an existing Sprint 2/3 control with fraud evidence.

Approximate completion: 60%.

---

Checkpoint 3 — Reporting definitions and read models

Must have:

reporting definitions accepted;

materializer;

executive summary;

liability;

cashier;

customer;

redemption;

SMS;

audit.

Gate: golden reporting fixture passes source-vs-read-model reconciliation.

Approximate completion: 85%.

---

Checkpoint 4 — Contract and exit gate

Must have:

CSV export;

OpenAPI;

Orval;

Bruno;

migration upgrade;

full CI;

Sprint 2/3 regression suite;

documentation.

Gate: one immutable SHA passes everything.

Sprint 4 = 100%.

---

30. Sprint 4 scoring rubric

I recommend using this when we review completion later:

Workstream Weight

Offline synchronization 30%
Offline conflict/concurrency evidence 10%
Fraud detection/review 20%
Reporting definitions/read models 20%
Reports + exports 10%
Contracts/docs/frontend integration 5%
Final CI/migration/regression gate 5%
Total 100%

This makes it difficult to claim "90% complete" while the offline conflict engine or reporting definitions are still missing.

---

31. Definition of Done — Sprint 4

Sprint 4 should be considered 100% complete only when:

[ ] Offline mode supports earn only.

[ ] Offline sync reuses the canonical earn financial engine.

[ ] Client cashier/device/branch/week claims are revalidated server-side.

[ ] Offline replay cannot duplicate receipts, ledger entries, lots, outbox events or approvals.

[ ] Online-vs-offline concurrent earn cannot double-credit a receipt.

[ ] Mixed batches return deterministic per-record outcomes.

[ ] High-value offline earns enter the existing approval workflow safely.

[ ] All TRD fraud rules are implemented or explicitly backed by existing financial controls.

[ ] Fraud evaluation is replay-safe and cannot mutate financial history.

[ ] Supervisor fraud visibility is branch-scoped; admin visibility is tenant-wide.

[ ] Executive, liability, cashier, customer, redemption, SMS and audit reporting definitions are documented.

[ ] Materialized reporting data reconciles exactly to authoritative source data.

[ ] CSV exports enforce RBAC, row limits, masking and audit logging.

[ ] Fresh and Sprint-3-upgrade migrations pass.

[ ] OpenAPI and generated client match runtime.

[ ] Bruno journeys pass.

[ ] Sprint 2 and Sprint 3 financial regression suites remain green.

[ ] Unit, integration, concurrency, HTTP, contract, architecture, lint, typecheck and build checks pass on one final SHA.

[ ] The Sprint 4 OpenSpec tracker has no unchecked implementation items.

The most important sequencing decision

I would build Sprint 4 in this order:

Offline sync → offline concurrency gate → fraud evidence/rules → asynchronous fraud evaluation → reporting definitions → reporting materialization → report APIs → exports → full acceptance.

I would not start with dashboards. Offline sync is the highest-risk addition because it touches the boundary of the financial engine. Once we prove that offline traffic cannot create a second ledger or bypass Sprint 2/3 protections, the fraud and reporting work becomes substantially safer.

The other important architectural decision is to generalize the existing outbox carefully: its current runtime is deliberately SMS-specific and will dead-letter non-SMS events, so adding fraud.evaluate without addressing that first would create a deceptively broken Sprint 4 background path.

This is the Sprint 4 baseline I would use for implementation and all future completion reviews.
