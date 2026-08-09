Deep completion review

Repository: micahjatau/shopcity_LP
Reviewed head: 6dd004b460ae37fb7c6a4c1d88baf9d3dfbda136 — fix: harden redemption approval integrity

Verdict

Your proposed direction is correct:

> Freeze new Sprint 3 development and complete a Sprint 3A hardening pass first.

The main Sprint 3 tracker currently has 29 of 55 tasks checked. After verifying those tasks against runtime code, database constraints, tests and API contracts, I would presently certify approximately 23 of 55 as genuinely complete.

The repository does not need a fundamental redesign. The architecture is largely sound. The remaining gaps are mostly where one layer has advanced ahead of another:

The tests or checklist say one thing, but the production service still behaves differently.

The application enforces an invariant, but PostgreSQL does not.

The endpoint works, but OpenAPI does not describe it.

The outbox persists the right event, but the real SMS renderer does not support the template.

A concurrency test proves one success, but does not prove the losing response is stable.

A route is publicly exposed even though its service cannot succeed.

---

What is already close to complete

These components should be preserved and hardened rather than replaced.

Approval target integrity

REDEEM approvals now correctly persist only redemptionId, while receipt evidence is loaded through redemption.receipt. A real PostgreSQL integration test creates, lists and executes the approval with receiptId = null.

FIFO allocation mechanics

The allocation service locks eligible lots, orders them by expiry, earning date and ID, and conditionally decrements them. PostgreSQL integration tests also reject mismatched allocation totals and lot balances.

Concurrency evidence

Real Testcontainers tests now cover:

Same idempotency key.

Duplicate receipt races.

Overlapping redemptions.

Concurrent approval execution.

Approval execution racing another redemption.

SMS production protection

The worker rejects deterministic and sandbox providers in production unless an explicit override is enabled. Real provider success is recorded as SENT, not falsely as delivered.

---

Feature-by-feature completion audit

Implemented feature Current maturity Main work required

Planning, ADR and task tracking 75% Reconcile task status with code
Schema and migration foundation 82% Add state and ledger-evidence constraints
Configuration and active balance 90% Stronger config validation and tests
FIFO allocation engine 87% Input XOR, timeout and restoration locking
Immediate redemption 68% Validation order, timestamps, conflict mapping
Pending redemption approval 60% Correct receipt audit state
Approval execution and rejection 75% Explicit locking and unified policy engine
Approval expiry 45% Automatic expiry rather than decision-time only
SMS and outbox 72% Redemption template, references and backfill
Transaction reads 30% Discriminated financial transaction responses
Reversal boundary 25% Hide or make contract truthful
Tests and release evidence 65% HTTP coverage, stronger assertions and CI

---

1. Correct the task trackers first

Before code changes, restore truthful project status.

Main Sprint 3 tracker

The following checked tasks should be reopened or divided into completed and remaining subtasks:

2.8 — Migration evidence

It says local and remote evidence is complete, but every new Sprint 3 migration is documented as locally verified with remote/shared deployment still pending.

Split it into:

2.8a Fresh and upgrade migration verified locally
2.8b Migration verified in CI
2.8c Migration deployed and verified in shared staging
2.8d Backup/restore or forward-fix rehearsal recorded

Only 2.8a is currently complete.

4.4 — All policy failures

Minimum, cap, balance, duplicate receipt and same-purchase failures exist. “Offline redemption prohibited” is not reliably implemented.

An online endpoint cannot know that a request was created offline unless it validates timestamp age or receives an explicit offline-origin marker. The redemption service currently accepts any valid ISO timestamp without the skew controls used by earning.

Reopen the task until stale cashier redemption attempts are rejected.

5.2 — Approval execution with locking

Execution uses a serializable transaction and conditional updates, but it does not explicitly lock the Approval and Redemption rows before evaluating them. The initial query is an ordinary findFirst.

Either:

Add SELECT ... FOR UPDATE for approval and redemption rows, or

Rewrite the task to say serializable transaction plus compare-and-set transitions, then document why explicit locks are unnecessary.

For financial approval, explicit locking is clearer.

5.4 — Approval expiry

Expiry occurs only when someone tries to decide an already expired approval. An untouched approval can remain stored and returned as PENDING indefinitely.

That is decision-time expiry detection, not a complete expiry workflow.

5.5 — Stable concurrent approval outcome

The integration test proves one execution, but it does not assert the exact error returned to the losing caller.

A complete test must require the loser to receive one documented outcome, such as:

APPROVAL_ALREADY_DECIDED

It should not accept any arbitrary rejection.

6.1 — Reversal boundary

The route exists, but its service has Promise<never> and can never produce the advertised success response. It does not even verify that the transaction exists.

This should be marked as a scaffold, not a completed public capability.

---

Corrective review tracker

In address-repo-review-22, reopen:

3.1–3.4: validation order and pending receipt state are not fixed.

4.1–4.6: explicit P2002 classification is not present.

7.1–7.2: the transaction and customer-ledger read models remain earn-shaped.

The tracker currently marks all of these complete.

---

2. Complete the database financial model

The database is much stronger than before, but application correctness still carries too much responsibility.

Add a redemption state-machine constraint

The schema currently allows logically impossible combinations such as:

CONFIRMED redemption with no ledger entry.

PENDING_APPROVAL redemption with a ledger entry.

REJECTED redemption with a confirmed amount.

REVERSED redemption without a reversal.

Confirmed amount different from requested amount.

The current database checks only ensure positive values.

Add a forward migration enforcing:

PENDING_APPROVAL
ledgerEntryId IS NULL
confirmedAmountKobo IS NULL
confirmedAt IS NULL
rejectedAt IS NULL
reversedAt IS NULL

CONFIRMED
ledgerEntryId IS NOT NULL
confirmedAmountKobo = requestedAmountKobo
confirmedAt IS NOT NULL
rejectedAt IS NULL

REJECTED
ledgerEntryId IS NULL
confirmedAmountKobo IS NULL
rejectedAt IS NOT NULL

EXPIRED
ledgerEntryId IS NULL
confirmedAmountKobo IS NULL

REVERSED
ledgerEntryId IS NOT NULL
confirmedAmountKobo IS NOT NULL
reversedAt IS NOT NULL

Add expiredAt to avoid using only the status to represent expiry time.

Add approval state constraints

Enforce:

PENDING: no decision actor, reason, decision time or execution time.

APPROVED: decision fields present, execution time absent.

EXECUTED: decision and execution fields present.

REJECTED: decision fields present, execution absent.

EXPIRED: decided time and expiry reason present, execution absent.

The target XOR constraint is good, but state coherence is not currently enforced.

Enforce ledger type and evidence at commit

The ledger is append-only and amounts are positive, which is strong.

Still, PostgreSQL can currently accept orphan ledger entries such as:

An EARN/CREDIT without a credit lot.

A REDEEM/DEBIT without a redemption or allocation.

An ADJUSTMENT without an adjustment aggregate.

A reversal with incoherent source evidence.

Add deferred triggers that validate every newly inserted confirmed ledger entry at commit:

Ledger type Required evidence

EARN/CREDIT Receipt and exactly one matching credit lot
REDEEM/DEBIT Receipt, confirmed redemption and allocations equal to ledger amount
ADJUSTMENT/CREDIT Credit adjustment and new lot
ADJUSTMENT/DEBIT Debit adjustment and FIFO allocations
REVERSAL reversesEntryId, opposite direction and matching compensation evidence

Complete restoration invariants

The restoration trigger checks that its ledger is REVERSAL/CREDIT and that lot balance agrees with restoration evidence.

Before implementing actual reversal, also enforce:

Sum of restorations equals reversal ledger amount.

Reversal customer equals original debit customer.

Every restoration belongs to allocations from one original debit.

Reversal ledger’s reversesEntryId equals that original debit.

Only one automatic reversal exists per original entry.

Protect immutable redemption evidence

Add a trigger preventing mutation of:

Tenant, branch, customer, card and device.

Receipt ID.

Requested amount.

Basket amount.

Maximum allowed snapshot.

Policy version.

Requesting actor and request timestamp.

Only lifecycle fields should be mutable.

---

3. Finish configuration and policy handling

The required variables exist, including minimum redemption, basket cap, approval threshold and adjustment expiry.

To reach 100%:

Strengthen configuration bounds

MIN_REDEMPTION_KOBO should normally have .min(1), not .min(0).

Apply Number.MAX_SAFE_INTEGER maximums to all kobo values.

Validate percentage and threshold combinations.

Validate that production cannot boot with nonsensical redemption policy values.

Examples:

MIN_REDEMPTION_KOBO > 0
REDEMPTION_APPROVAL_THRESHOLD_KOBO >= MIN_REDEMPTION_KOBO
MAX_REDEMPTION_BASKET_PERCENT between 1 and 100

The threshold rule may be intentionally different, but it should be a conscious, tested configuration decision.

Use one policy engine

Immediate redemption uses RedemptionPolicyService, while approval execution duplicates the same calculation inside LoyaltyService.

Remove the duplicate function. Both request capture and approval execution should use the same service and policy-version generator.

Expand policy tests

Current tests cover basket cap, active-balance cap and approval threshold.

Add:

Exact approval threshold boundary.

Zero balance.

Basket smaller than minimum.

Rounding of basket percentage.

Maximum safe integer.

Invalid configuration.

Policy version changes when any controlling value changes.

Policy version stability when values are unchanged.

---

4. Finish FIFO and shared financial primitives

Reject both allocation targets

allocateDebit() rejects when neither redemptionId nor adjustmentId is provided, but does not reject when both are supplied. The database eventually rejects that, but the service should fail before writes.

Use:

const targetCount =
Number(Boolean(input.redemptionId)) +
Number(Boolean(input.adjustmentId));

if (targetCount !== 1) {
throw validationError;
}

Add transaction limits

The shared transaction options currently specify only serializable isolation. Add explicit Prisma limits:

{
isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
maxWait: 5_000,
timeout: 15_000
}

The exact values should be load-tested.

Make restoration planning lock-safe

planRestorations() uses an ordinary read. Two reversal attempts could calculate the same remaining restoration before either inserts evidence.

Replace it with a locked query that locks:

Original debit ledger.

Allocation rows.

Affected credit lots.

Existing restoration evidence.

The method should return its plan only inside the same transaction that commits the reversal.

Add real multi-lot FIFO integration coverage

The current FIFO unit test gives already ordered mocked lots.

Add PostgreSQL tests proving:

Lots inserted in random order are consumed by earliest expiry.

Equal expiry uses earned time.

Equal expiry and earned time uses ID.

Partial consumption of the last lot.

Expired and zero-balance lots are excluded.

Multiple customers and tenants cannot cross-allocate.

---

5. Complete immediate redemption

Fix validation ordering

This is the highest-priority service defect.

The service still branches into pending approval before checking minimum, basket cap and balance.

The correct sequence is:

1. Validate session, device, branch, card and customer
2. Resolve idempotency replay/conflict
3. Validate receipt identity
4. Calculate active balance and current policy
5. Reject below-minimum request
6. Reject basket-cap violation
7. Reject insufficient balance
8. Decide immediate versus pending approval
9. Create the selected atomic transaction

Extract this into a method such as:

assertRedemptionRequestAllowed(policy, requestedAmountKobo)

Both immediate and pending paths must consume the result.

Enforce online-only redemption with timestamps

Add the earning endpoint’s timestamp protections to redemption:

Cashier requests cannot be significantly stale.

Future timestamps beyond allowed clock skew are rejected.

Supervisor/admin overrides require a reason and audit event.

This is the practical backend control that prevents deferred offline redemption submission.

Use a stable error such as:

OFFLINE_REDEMPTION_NOT_ALLOWED

instead of treating every offline-like condition as DEVICE_NOT_ACTIVE.

Validate headers and identifiers

Add limits for:

Idempotency key length, preferably UUID or maximum 128 characters.

Card serial minimum and maximum length.

Receipt number minimum and maximum length.

UUID path parameters.

Whitespace-only strings.

The DTO currently validates the money and timestamp fields but applies only IsString to card and receipt values.

Add explicit unique-conflict normalisation

The production retry helper only recognises Prisma P2034. It explicitly treats P2002 as a non-retryable error.

Create a redemption-specific outer error resolver for:

Unique conflict Domain outcome

Idempotency record, same hash Replay completed response
Idempotency record, different hash IDEMPOTENCY_CONFLICT
Receipt identity RECEIPT_ALREADY_USED or same-purchase violation
Redemption/ledger receipt link Stable replay or REDEMPTION_TRANSACTION_CONFLICT
Approval target Return existing pending approval where safely reconstructable

The global filter hides raw Prisma details but turns an unclassified P2002 into a generic 500.

Populate notification ownership consistently

Immediate redemption creates an SMS row without the new ledgerEntryId and redemptionId references. Approval execution does populate them.

All confirmed redemption paths should write:

ledgerEntryId
redemptionId
receiptId
outboxEventId

Use one shared notification builder so these paths cannot diverge again.

---

6. Complete the pending approval workflow

Separate receipt evidence from financial approval

The pending branch currently records the cashier as both reviewer and approver while the redemption is still pending.

Use one clearly documented model.

A minimal correction is:

captureStatus = PENDING_APPROVAL
reviewStatus = PENDING
reviewedAt = null
reviewedBy = null
approvedAt = null
approvedBy = null

Then:

Approval execution → receipt APPROVED.

Rejection → receipt REJECTED.

Expiry → either add an explicit expired receipt state or document why the receipt remains only captured while the redemption is expired.

A cleaner long-term model is to distinguish receipt evidence validation from financial action approval, but the minimal state transition above is enough for Sprint 3.

Ensure invalid requests never reserve receipts

After validation is reordered, add tests asserting that invalid high-value requests create none of:

Receipt.

Redemption.

Approval.

Ledger entry.

Allocation.

Idempotency completion.

Outbox event.

SMS row.

Success audit event.

The current tests do not exercise invalid requests with requiresApproval = true.

---

7. Complete approval execution, rejection and expiry

Introduce explicit target executors

LoyaltyService currently owns both earn and redemption approval logic and has become very large.

Refactor into:

ApprovalsService
├── EarnApprovalExecutor
└── RedemptionApprovalExecutor

The router loads and locks the approval, then delegates based on targetType.

Benefits:

One policy service per domain.

Smaller transactions.

Easier unit tests.

Lower risk of earn regressions while editing redemption approval.

Lock approval and redemption rows

Within the serializable transaction:

1. Lock Approval.

2. Lock target Redemption.

3. Lock receipt evidence if its lifecycle changes.

4. Re-read the full state.

5. Revalidate policy.

6. Lock and allocate lots.

7. Commit effect and final state.

Conditional updateMany() should remain as an additional compare-and-set guard.

Add automatic expiry

Introduce ApprovalExpiryService run by the worker or a scheduled process.

It should:

Select PENDING approvals with expiresAt <= now().

Use FOR UPDATE SKIP LOCKED.

Update the approval and redemption atomically.

Record an audit event.

Produce no ledger, allocation, outbox or SMS effect.

Add:

INDEX Approval(tenantId, status, expiresAt)

The list endpoint should never return an already expired approval as pending merely because the expiry worker has not run yet. A defensive lazy-expiry check can remain.

Define policy-change outcomes

When approval policy or balance changes, the current transaction throws and rolls back, leaving the approval pending.

Choose an explicit policy:

Retryable: leave pending and record the last execution failure.

Terminal: mark rejected or expired with a machine-readable reason.

For balance insufficiency after another redemption, leaving pending until expiry may be reasonable, but the UI needs the current non-executable reason.

Strengthen concurrency assertions

For concurrent approval execution, assert:

One caller returns EXECUTED.

The other returns exactly APPROVAL_ALREADY_DECIDED.

One debit ledger entry.

One allocation set.

One outbox event.

One SMS row.

One execution audit event.

Final approval is EXECUTED.

Final redemption is CONFIRMED.

The current test uses the same supervisor for both calls; create two distinct supervisor users to match the stated scenario.

---

8. Complete SMS and outbox behaviour

Implement the redemption SMS template

The real provider renderer handles only earn-confirmed. Every other template receives a generic receipt notification.

Therefore, a successful redemption currently sends generic text rather than the promised balance notification.

Add a typed template registry:

type SmsTemplate =
| 'earn-confirmed'
| 'redemption-confirmed'
| 'transaction-reversed'
| 'balance-adjusted';

For redemption-confirmed, render:

Redeemed amount.

Remaining balance.

Possibly the POS receipt number, not an internal UUID.

Validate template payloads

Add per-template validation:

earn-confirmed:
creditKobo

redemption-confirmed:
redeemedKobo
remainingBalanceKobo
redemptionId
transactionId

Invalid payloads should be dead-lettered with a clear category rather than generating generic text.

Backfill transaction references

The schema supports ledger, redemption and adjustment ownership, but historical and some current write paths leave them null.

Add a forward data migration or administrative backfill that derives:

ledgerEntryId from payload transactionId.

redemptionId from payload or receipt relationship.

Existing earn ledger from receipt.

Test real redemption rendering

The provider test suite currently tests only earn-confirmed.

Add tests for:

Redemption text.

Missing required redemption fields.

Null receipt with adjustment/reversal reference.

Retryable and terminal failures for each template class.

Duplicate outbox delivery using the same provider idempotency key.

---

9. Complete transaction reads and customer ledger

This is the largest contract gap.

getTransaction() still returns an earn-specific structure and labels any receipt-backed amount as creditKobo.

Create a dedicated TransactionReadService returning a discriminated union.

Common shape

{
"transactionId": "uuid",
"type": "REDEEM",
"direction": "DEBIT",
"amountKobo": 500000,
"customerId": "uuid",
"effectiveAt": "date",
"createdAt": "date",
"smsStatus": "SENT"
}

Redemption details

{
"redemption": {
"id": "uuid",
"receiptId": "uuid",
"basketAmountKobo": 2000000,
"requestedAmountKobo": 500000,
"confirmedAmountKobo": 500000,
"status": "CONFIRMED",
"approvalId": null,
"allocations": []
}
}

SMS lookup

Use:

1. ledgerEntryId

2. redemptionId or adjustmentId

3. Receipt fallback for historical rows

Do not choose the latest SMS for a receipt, because multiple notifications per receipt are now allowed.

Customer ledger

Add:

Transaction type and direction.

Redemption/adjustment ID.

Reversal source/target linkage.

Allocation summary.

Restoration summary.

Role-safe adjustment/reversal reason.

SMS state where operationally useful.

---

10. Make OpenAPI truthful

The generated redemption endpoint currently documents:

A blank 201.

No 202 success schema.

Generic error schemas.

No confirmed or pending response body.

Yet the controller dynamically returns 201 or 202.

Add explicit decorators for both responses:

201 RedeemConfirmedResponse
202 RedeemPendingApprovalResponse

Document every stable domain error with examples.

Also correct the generic OpenAPI helper: it currently gives the same example code and status values to multiple HTTP statuses.

Reversal contract

OpenAPI advertises a 201 Transaction reversal processed response even though no execution path can return it.

Until reversal is implemented:

Remove the route from public OpenAPI, or

Gate it behind REVERSALS_ENABLED=false, or

Document it only as an unavailable/review-required boundary.

Do not advertise a success body that cannot occur.

Finish client and runnable contract evidence

Add scripts for:

openapi:export
openapi:lint
openapi:diff
client:generate
client:typecheck
bruno:test

The repository already has Orval and Bruno dependencies, but the final consumer validation remains outstanding.

---

11. Correct the reversal scaffold without implementing reversal yet

Because the goal is to finish current work before continuing Sprint 3, do not implement reversal financial logic in this hardening pass.

Instead:

Recommended option: hide the route

Keep the internal module and tests, but do not register the controller until reversal execution is ready.

This prevents frontend teams from treating the endpoint as available.

Alternative: make the boundary truthful

When called, it should at least:

1. Validate transaction ID format.

2. Load the tenant-scoped transaction.

3. Return TRANSACTION_NOT_FOUND if absent.

4. Confirm that the transaction is reversible in principle.

5. Record an attempted-reversal audit event.

6. Return REVERSAL_REVIEW_REQUIRED with structured details.

7. Persist and replay that exact outcome idempotently.

It should not expose a 201 response until it creates a real compensating ledger entry.

---

12. Complete testing and release evidence

Make time deterministic

Several integration tests use Date.now(). The TRD requires deterministic clocks for financial tests.

Introduce a Clock port:

interface Clock {
now(): Date;
}

Use a fixed test clock for:

Receipt week derivation.

Lot expiry.

Approval expiry.

Transaction timestamps.

Retry response timestamps where relevant.

Add HTTP integration tests

Use Supertest against the actual Nest application for:

Confirmed redemption 201.

Pending redemption 202.

Validation envelope.

Auth and role failures.

CSRF behaviour.

Device inactivity.

Duplicate receipt.

Idempotency replay and conflict.

Basket cap and balance errors.

Rate limiting.

Approval approve/reject/expiry.

Strengthen database integration assertions

Every concurrency test should assert not only the number of fulfilled promises but also:

Exact losing error code.

Ledger count.

Receipt count.

Redemption count.

Allocation total.

Credit-lot remaining balance.

Idempotency-record count.

Outbox and SMS count.

Audit count.

Enforce coverage

The TRD targets 90% branch coverage for financial packages.

Add Jest thresholds for:

src/modules/redemptions
src/modules/approvals
src/common/balance
src/jobs/outbox-worker*

Run coverage in CI.

Obtain current-head evidence

The recent migrations are locally verified, but shared deployment evidence remains pending.

The connector also surfaced no pull-request workflow run for the current head.

Before declaring these features complete, record:

Green current-head static checks.

Unit tests.

E2E tests.

Integration tests.

OpenAPI generation and cleanliness.

Architecture checks.

Staging migration.

Staging redemption and approval smoke test.

Real or sandbox SMS-provider verification with truthful status.

---

Recommended implementation order

Phase 1 — Restore truth and close P0 defects

1. Correct both task files.

2. Reorder redemption validation.

3. Correct pending receipt state.

4. Add timestamp/offline enforcement.

5. Add explicit P2002 resolution.

6. Populate SMS ownership references consistently.

Estimated effort: 2–3 engineering days.

Phase 2 — Database completion

1. Redemption state constraint.

2. Approval state constraint.

3. Ledger type/evidence triggers.

4. Redemption evidence immutability.

5. Restoration/reversal aggregate constraints.

6. Migration and upgrade tests.

Estimated effort: 2–3 engineering days.

Phase 3 — Approval and SMS completion

1. Shared policy engine.

2. Approval/redemption row locks.

3. Automatic expiry worker.

4. Stable concurrency outcomes.

5. Redemption SMS template registry and validation.

Estimated effort: 2–3 engineering days.

Phase 4 — Reads and API truth

1. Discriminated transaction read model.

2. Expanded customer ledger.

3. Correct SMS lookup.

4. Complete 201/202 OpenAPI.

5. Hide or correct reversal contract.

6. Bruno and generated-client validation.

Estimated effort: 2–3 engineering days.

Phase 5 — Release evidence

1. Deterministic clock conversion.

2. HTTP tests.

3. Stronger integration assertions.

4. Coverage thresholds.

5. Current-head CI.

6. Staging migration and smoke test.

Estimated effort: 2–3 engineering days.

Total hardening estimate

Approximately 10–15 engineering days before resuming unfinished reversal and adjustment implementation.

---

Exit gate before continuing Sprint 3

Do not begin reversal execution or manual adjustments until all of these are true:

Invalid high-value redemption creates zero records.

Pending receipt audit state is truthful.

All redemption uniqueness races return documented domain responses.

PostgreSQL rejects orphan or incoherent redemption ledger effects.

Approval expiry happens without a user attempting a decision.

Concurrent approval loser has one deterministic response.

Real redemption SMS contains redeemed amount and remaining balance.

Transaction lookup correctly identifies REDEEM/DEBIT.

OpenAPI documents both 201 and 202 response bodies.

The reversal scaffold is hidden or contractually truthful.

All reopened tasks have regression tests.

Current-head CI and shared migration evidence are recorded.

Once those conditions pass, the existing redemption and approval work can reasonably be called 100% complete, and reversal/adjustment development can proceed on a trustworthy financial foundation.
