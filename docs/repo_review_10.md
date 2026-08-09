Review verdict

The latest commit is 04fb89d17b09fc5a49a3364066e324fe41de480d, “feat: complete immutable earn ledger,” one commit after the previously reviewed 2269cd1e....

This is a substantial improvement. The repository has moved from pre-ledger readiness to a genuine Sprint 2 earn-ledger alpha.

However, “complete” overstates the current condition. The core design is present, but the implementation is not yet merge-ready or at the TRD Sprint 2 exit gate. Issue #1 should remain open.

---

Previous status versus current status

Area Previous status Current status Verdict

Immutable ledger Absent LoyaltyLedgerEntry added Major improvement
Expiry-aware credit Absent CreditLot added with 12-month expiry Major improvement
Earn calculation Absent Integer-only 2% calculation implemented Major improvement
Earn transaction Receipt capture only Receipt, ledger, lot, audit, outbox and idempotency now share one transaction Major improvement
Purchase approvals Receipt-review fields only Generic Approval record with PENDING → APPROVED → EXECUTED Major improvement
Approval concurrency Basic review protection Simultaneous execution test added Improved
Duplicate earn concurrency Receipt-only test Receipt, ledger, lot and outbox uniqueness tested together Improved
Customer ledger Absent Ledger lookup endpoint added Improved
Transaction lookup Absent Transaction lookup endpoint added Improved
Outbox Absent Table and BullMQ scaffolding added Partial
SMS processing Absent Still functionally absent Not completed
Stable API contract Generic receipt contract Earn endpoint added, but status codes and response fields diverge from TRD Still blocked
CI confidence Strong pre-ledger suites New commit appears to contain type/lint/generated-contract failures Regressed
Production readiness Foundation only Financial core exists, but unsafe parallel paths and missing invariants remain Slight improvement

---

What was implemented well

1. The financial entities now exist

The schema now includes:

LoyaltyLedgerEntry

CreditLot

Approval

OutboxEvent

Ledger, approval and outbox enums

The ledger has a unique receipt association, correlation ID and tenant-safe relations. Each earn can have one linked credit lot.

This closes the previous review’s largest product gap.

---

2. Confirmed earns are genuinely atomic

For a normal purchase, the implementation creates:

1. Receipt evidence

2. EARN ledger entry

3. Credit lot

4. Transactional outbox row

5. Idempotency response

6. Audit record

All of these are inside a serializable PostgreSQL transaction.

That is the correct financial boundary.

---

3. The 2% calculation is integer-safe

The calculation uses BigInt and ceiling arithmetic:

(BigInt(purchaseAmountKobo) * earnRateBps + 9_999n) / 10_000n

This aligns with the TRD requirement to avoid floating-point financial calculations.

---

4. Approval-required purchases create no immediate financial effect

Purchases above the threshold create:

A receipt reservation

A pending approval

A completed idempotent pending response

An audit event

They do not create the ledger, lot or outbox until approval.

That is materially safer than the previous receipt-review-only model.

---

5. Approval execution is concurrency-aware

Approval execution:

Prevents self-approval

Checks that the approval is still pending

Revalidates branch, device, card, customer and staff status

Uses a serializable transaction

Creates the ledger, lot and outbox

Transitions the approval to EXECUTED

The new integration test also attempts two simultaneous approval executions and expects only one to succeed.

---

Critical blockers

P0 — The legacy receipt endpoint can bypass the loyalty ledger

POST /api/v1/receipts remains publicly available to cashiers, supervisors and admins. It still calls ReceiptsService, not the new LoyaltyService.

That service creates:

Receipt

Receipt idempotency record

Audit record

But it creates no ledger entry, credit lot or outbox event.

Failure scenario

1. A cashier accidentally or deliberately calls /receipts.

2. The physical receipt identity is permanently reserved.

3. No 2% credit is awarded.

4. A later call to /transactions/earn fails as a duplicate receipt.

5. The customer loses the earning opportunity.

For high-value receipts, the fallback legacy approval path can also mark the receipt approved without creating any financial effect.

Required fix

Before further financial development:

Remove cashier access to POST /receipts, or

Make it internal-only, or

Route it through the earn orchestration service.

The legacy approve/reject endpoints should also be deprecated or guaranteed to execute the same ledger workflow.

---

P0 — The committed verification suite appears unable to pass

The new integration test constructs:

new ApprovalsService(loyaltyService)

But the current constructor requires:

constructor(
loyaltyService: LoyaltyService,
prismaService: PrismaService,
auditService: AuditService,
)

That should fail npm run typecheck.

There is also an unused AuthenticatedRequest import in ApprovalsController, which is likely to fail the configured recommended ESLint rules.

Stale generated OpenAPI

The new commit adds several endpoints, but the committed OpenAPI artifact has the exact same blob SHA as before:

Previous: 9f02870836b7eee80e19f7a179fe056e635c0461

Current: 9f02870836b7eee80e19f7a179fe056e635c0461

CI regenerates OpenAPI and then requires no resulting diff.

Therefore, the latest commit is highly likely to fail at least:

Type checking

Possibly linting

Generated OpenAPI consistency

No visible PR-triggered workflow run exists for the commit, so there is no independent evidence that CI passed.

---

P0 — Database financial invariants are incomplete

The migration creates the ledger and credit-lot columns but does not add the TRD-required checks for:

amountKobo > 0
remainingAmountKobo >= 0
remainingAmountKobo <= originalAmountKobo

The migration defines the tables, indexes and foreign keys, but no financial CHECK constraints.

The OpenSpec tasks nevertheless mark the constraint work complete.

Other integrity gaps:

createdBy on ledger entries has no user foreign key.

Approval requester and decision-maker fields have no user foreign keys.

reversesEntryId has uniqueness but no self-referential foreign key.

Nothing at the database level prevents confirmed ledger rows from being updated or deleted.

The ledger includes an updatedAt field even though the stated rule is append-only.

These need correction before redemption and reversal logic depend on the ledger.

---

High-priority functional gaps

P1 — Pending approval returns HTTP 201, not 202

The earn controller documents and returns only a 201 response.

The shared response decorator only supports 200 or 201; it cannot describe 202.

The TRD and Phase 2 plan require:

201 CONFIRMED

202 PENDING_APPROVAL

The controller needs a way to set the HTTP status dynamically or separate confirmed and pending response handling.

---

P1 — The earn response is incomplete

The current response contains:

Receipt ID

Ledger ID

Purchase amount

Credit amount

Review state

But it does not contain:

availableBalanceKobo

expiresAt

smsStatus

A clear financial transaction ID

Also, id is the receipt ID, while getTransaction() accepts a parameter called transactionId but queries the Receipt table using it.

The public contract should clearly distinguish:

transactionId = ledger entry or transaction aggregate ID
receiptId = physical purchase evidence ID
approvalId = approval workflow ID

---

P1 — No authoritative available-balance calculation

A customer ledger list exists, but no service calculates and returns:

sum of remaining, unexpired confirmed credit lots

The earn endpoint therefore cannot satisfy the TRD response requirement for availableBalanceKobo.

Before redemption starts, add one reusable balance query that:

Excludes expired lots

Includes only positive remaining amounts

Uses the authoritative database timestamp

Can run within the redemption transaction

---

P1 — Rejected transactions have inconsistent state

When a generic approval is rejected, only the Approval row is updated. The associated receipt remains reviewStatus = PENDING.

getTransaction() derives state only from receipt review status:

reviewStatus === PENDING
? 'PENDING_APPROVAL'
: 'CONFIRMED'

Consequences:

Generic rejection may still appear as PENDING_APPROVAL.

A legacy receipt marked REJECTED could be represented as CONFIRMED.

Transaction state should derive from the approval and ledger records:

Approval PENDING → PENDING_APPROVAL
Approval REJECTED → REJECTED
Ledger exists → CONFIRMED
Otherwise → INVALID/INCOMPLETE

---

P1 — Approval does not revalidate current threshold policy

The archived specification requires approval execution to revalidate changed threshold state.

The implementation rechecks entity eligibility, but does not rerun:

Purchase ceiling validation

Current approval threshold logic

Current capture-policy resolution

A purchase could therefore be executed after an administrator lowers the hard ceiling or changes the applicable policy.

---

P1 — Stable domain errors remain unimplemented

The earn service still throws ordinary Nest exceptions such as:

Card not found

Physical receipt already captured

Device is not active

Idempotency key reused with different payload

The exception filter maps these primarily to broad codes such as:

VALIDATION_ERROR

NOT_FOUND

CONFLICT

POLICY_VIOLATION

The required stable codes remain absent:

RECEIPT_ALREADY_USED

IDEMPOTENCY_CONFLICT

CARD_INACTIVE

CUSTOMER_BLOCKED

STAFF_INELIGIBLE

DEVICE_BRANCH_MISMATCH

APPROVAL_REQUIRED

This still blocks reliable frontend integration.

---

P1 — The outbox is persistence-only, not operational

The commit adds BullMQ and a queue helper with retries.

However, the worker handler is currently a no-op:

void job;

There is also:

No PostgreSQL outbox scanner/publisher loop

No SMS provider adapter

No SmsMessage model

No delivery-status persistence

No code marking outbox events PUBLISHED or FAILED

No recovery process for aged pending events

No worker start script in package.json

The archived task list nevertheless marks SMS delivery status and recovery as complete.

That task should be reopened.

---

Testing comparison

Improved coverage

The new integration suite tests:

Confirmed earn creation

Idempotent replay

Changed-payload conflict

One ledger/lot/outbox result

Simultaneous approval execution

Simultaneous duplicate earning

That is a meaningful improvement over the previous receipt-only suite.

Still missing

The phase plan required tests for:

Staff exclusion

Pending approval creating zero ledger/lot/outbox rows before decision

Card blocked before approval

Customer blocked before approval

Device or branch disabled before approval

Threshold or ceiling changed before approval

Rejected transaction state

Forced failure during lot creation

Forced failure during outbox creation

Exact expiry behavior, including leap-day earning

Actual HTTP 201 versus 202

Stable error codes

Outbox retry and recovery

SMS failure independence

Generated OpenAPI contract

The new suite directly instantiates services rather than exercising the public HTTP API, so it does not validate guards, CSRF, response envelopes or HTTP status codes.

---

Updated scores

Area Previous Current Change

Architecture 8.3 8.0 Slight decline from parallel receipt paths and a 1,100-line orchestration service
Receipt integrity 8.7 8.7 Unchanged
Migration verification 8.2 7.4 New migration is recorded as not run and lacks financial checks
Test infrastructure 8.4 6.5 Better scenarios, but committed test/type and contract issues reduce confidence
Financial transaction readiness 6.5 7.2 Atomic earn path now exists
API contract maturity 6.5 5.8 Endpoint exists, but 202, response fields, errors and generated OpenAPI are wrong
Core loyalty functionality 2.5 6.5 Largest improvement
Outbox/SMS maturity 1.5 3.0 Persistence and BullMQ scaffolding only
Production readiness 5.2 5.4 Product capability improved, but current commit is not safely deployable

Overall TRD position

Previous overall MVP implementation: approximately 40–45%

Current overall MVP implementation: approximately 50–55%

Sprint 2 source-code coverage: approximately 65–70%

Sprint 2 verified exit-gate completion: approximately 40–45%

Pilot readiness: approximately 35%

---

Required correction order

Gate 1 — Eliminate the parallel financial path

1. Disable or internalize POST /receipts.

2. Remove the legacy approval fallback for new transactions.

3. Ensure every eligible purchase goes through one earn orchestration path.

4. Add a regression test proving no public endpoint can reserve an eligible receipt without either creating credit or a generic approval.

Gate 2 — Restore a passing verification pipeline

1. Fix the ApprovalsService test construction.

2. Fix nullable test-user typing.

3. Remove unused imports and run formatting.

4. Regenerate and commit docs/api/openapi.json.

5. Run build, lint, typecheck, unit, HTTP, integration and OpenAPI checks.

6. Do not archive the change as completed until visible CI passes.

Gate 3 — Harden database invariants

Add:

CHECK ("amountKobo" > 0)
CHECK ("originalAmountKobo" > 0)
CHECK ("remainingAmountKobo" >= 0)
CHECK ("remainingAmountKobo" <= "originalAmountKobo")

Also add actor foreign keys and a documented append-only enforcement mechanism.

Gate 4 — Finish the public contract

1. Return 202 for pending approvals.

2. Add availableBalanceKobo.

3. Add expiresAt.

4. Add smsStatus.

5. Clarify transaction ID versus receipt ID.

6. Implement stable domain errors.

7. Add HTTP and contract tests.

Gate 5 — Complete outbox delivery

1. Scan pending PostgreSQL outbox rows.

2. Publish them idempotently to BullMQ.

3. Add the SMS provider abstraction.

4. Persist SMS status and attempts.

5. Update outbox status after processing.

6. Add failed-event recovery and tests.

Do not start redemption and FIFO allocations yet. The earning path should first be reduced to one authoritative API, made database-safe, and proven through the full CI and HTTP contract gates.
