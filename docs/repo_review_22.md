Repository Progress Report

Repository: micahjatau/shopcity_LP
Current head: 8dc42591b1949eee4ac9a546120dcc9cac946975
Latest commit: feat: harden redemption approval concurrency

Verdict

Sprint 3 has moved from planning into substantial implementation. The repository now contains:

The Sprint 3 schema foundation.

FIFO credit-lot allocation.

Immediate redemption.

Pending high-value redemption requests.

Redemption approval execution, rejection and expiry.

Shared transaction retry handling.

Redemption OpenAPI documentation and unit tests.

However, Sprint 3 is not ready for integration sign-off or pilot use. There are two release-blocking correctness problems:

1. High-value redemption approvals conflict with the database constraint and are likely to fail when executed against PostgreSQL.

2. Concurrent duplicate or idempotent redemption requests can surface unhandled Prisma uniqueness errors instead of returning stable API responses.

Reversals and manual adjustments have not started.

---

Progress summary

The OpenSpec checklist marks 28 of 55 tasks complete: approximately 51%.

My assessment of effective delivery maturity is slightly lower because some checked tasks have unresolved database or test gaps.

Workstream Checklist progress Effective maturity

Planning, OpenSpec and ADR 100% Strong
Schema and migrations 100% marked About 70%
Shared FIFO primitives 100% marked About 75%
Immediate redemption 100% marked About 70%
Redemption approval lifecycle 100% marked About 50%
Reversals 0% 0%
Manual adjustments 0% 0%
Reads, frontend contract and documentation 0% marked About 25%
Audit, SMS and observability 0% marked About 30%
Integration, concurrency and release gates 0% marked About 15%
Overall Sprint 3 51% checklist About 40–45% release-ready

---

What has been delivered

1. Sprint 3 data model

The schema now supports:

REDEEM, REVERSAL and ADJUSTMENT ledger types.

Both CREDIT and DEBIT directions.

Redemption states.

Credit and debit adjustment kinds.

Earn and redeem approval targets.

Redemption intents.

Redemption allocations.

Allocation restorations.

Manual-adjustment persistence.

The Redemption model captures:

Customer, card, branch and device.

Purchase receipt.

Basket and requested amounts.

Maximum allowed redemption.

Policy version.

Pending or confirmed status.

Resulting ledger entry.

The repository also includes models for immutable allocation evidence, restorations and adjustments.

Migration evidence

The Sprint 3 migration has been applied successfully to:

A fresh disposable PostgreSQL database.

A database populated with representative Sprint 2 records.

The upgrade test confirmed that existing approvals were backfilled as EARN, existing ledger and credit-lot records remained intact and the new tables were created. Remote/shared deployment evidence remains pending.

---

2. FIFO allocation engine

A shared LotAllocationService now:

Locks active lots using FOR UPDATE.

Excludes expired and depleted lots.

Orders lots by earliest expiry, earned time and ID.

Creates allocation records.

Decrements each selected lot conditionally.

Rejects insufficient balance.

Supports future reversal-restoration planning.

The FIFO query is correctly deterministic:

ORDER BY "expiresAt" ASC, "earnedAt" ASC, "id" ASC
FOR UPDATE

Allocation planning supports:

Full-lot consumption.

Partial-lot consumption.

Multiple lots.

Exact balance use.

Insufficient-balance rejection.

This is the right core architecture for preventing double-spend, but it still needs real PostgreSQL concurrency testing.

---

3. Immediate redemption API

The following endpoint now exists:

POST /api/v1/transactions/redeem

It is available to cashiers, supervisors and admins, uses the existing authentication and CSRF guards, requires an idempotency key and has a 30-request-per-minute financial throttle.

The request captures:

Card serial number.

Receipt number.

Basket amount.

Requested redemption amount.

Transaction time.

The service validates:

Session device presence.

Device and branch status.

Card and customer eligibility.

Staff exclusion.

Branch context.

Idempotency.

Receipt uniqueness.

Active balance.

Minimum redemption.

Basket cap.

Available balance.

A confirmed redemption atomically creates:

1. Receipt evidence.

2. Redemption intent.

3. DEBIT/REDEEM ledger entry.

4. FIFO allocation rows.

5. Credit-lot reductions.

6. Outbox event.

7. SMS delivery record.

8. Idempotency response.

9. Audit record.

The response is JSON-safe and returns:

Transaction ID.

Redemption ID.

Receipt ID.

Redeemed amount.

Maximum allowed amount.

Remaining balance.

Lot allocations.

SMS status.

---

4. High-value redemption approvals

The implementation now includes:

Pending redemption creation.

Redemption-targeted approval records.

Approval list summaries.

Approval execution.

Rejection.

Expiry.

Self-decision prevention.

Current-policy and active-balance revalidation.

FIFO allocation during execution.

SMS and audit creation.

Conditional status transitions.

Approval execution correctly re-evaluates:

Current active balance.

Minimum redemption.

Basket percentage cap.

Approval threshold.

Policy version.

Branch, device, card and customer status.

The latest commit added bounded retry handling for recognised serialisation conflicts and unit tests for retries, exhausted retries and already-executed approvals.

The high-value flow is nevertheless blocked by the schema contradiction described below.

---

Critical findings

P0 — Redemption approval inserts violate the database constraint

The migration defines this rule:

targetType = 'REDEEM'
AND receiptId IS NULL
AND redemptionId IS NOT NULL

But the redemption service creates a redemption approval with both fields:

receiptId: receipt.id,
redemptionId: redemption.id,
targetType: REDEEM

These cannot both be correct. Against the actual migrated database, the high-value pending-redemption transaction should fail its Approval_target_xor_check.

The unit test does not detect this because it mocks approval.create; no PostgreSQL constraint is evaluated.

Impact

High-value redemption requests are likely broken.

The claimed 202 pending-approval flow cannot be considered delivered.

Approval execution tests do not prove that a valid redemption approval can first be persisted.

OpenAPI currently also assumes a redemption approval has a receipt ID, extending the inconsistency.

Required correction

Use one consistent design:

EARN: receiptId only.

REDEEM: redemptionId only.

Retrieve receipt evidence through redemption.receipt.

The redemption service should stop populating Approval.receiptId for REDEEM. Approval queries and decision handlers should include the receipt through the redemption relation.

---

P0 — Concurrent idempotent and duplicate requests do not handle Prisma P2002

The redemption service performs advisory checks for existing idempotency records and duplicate receipts before writing. It then relies on the database transaction for final protection.

However, the shared financial retry helper recognises only Prisma P2034 transaction conflicts.

It does not handle P2002 unique-constraint errors.

During simultaneous redemption requests, the losing transaction can encounter:

Unique receipt conflict.

Unique idempotency-record conflict.

Unique ledger receipt conflict.

Those are likely P2002, not P2034. The current wrapper will rethrow them without:

Returning the original response for same-key/same-payload requests.

Returning IDEMPOTENCY_CONFLICT for a conflicting payload.

Returning RECEIPT_ALREADY_USED for a duplicate physical receipt.

The redemption wrapper only attempts replay after a recognised financial transaction conflict.

Impact

The Sprint 3 concurrency exit gate is not met. Sequential idempotent replay works, but simultaneous replay is not safely normalised.

The existing test confirms only a previously completed record, not two concurrent database transactions.

Required correction

Add constraint-aware error handling similar to the hardened earn path:

Idempotency unique conflict → fetch completed response and replay when hash matches.

Same key, different hash → IDEMPOTENCY_CONFLICT.

Receipt unique conflict → RECEIPT_ALREADY_USED.

Ledger/redemption one-to-one conflicts → stable transaction conflict or replay.

Then prove this with real Testcontainers concurrency tests.

---

P1 — Database allocation invariants are incomplete

The migration adds a deferred credit-lot balance check, but the trigger runs only after CreditLot.remainingAmountKobo is updated.

This means an allocation row could theoretically be inserted without updating the corresponding lot, and no credit-lot validation trigger would run.

Similarly, restoration inserts verify only that total restoration does not exceed the original allocation.

The migration does not yet visibly enforce at commit that:

Total allocations equal the debit ledger amount.

The debit ledger is REDEEM or ADJUSTMENT and has direction DEBIT.

Allocation customer matches the credit lot, ledger entry and redemption.

RedemptionAllocation.redemptionLedgerEntryId equals the target redemption’s ledger entry.

Allocation insertion must be accompanied by the corresponding lot reduction.

Restoration insertion must be accompanied by the corresponding lot increase.

The application service follows the expected sequence, but the database does not yet fully protect the financial model from future application defects, direct writes or incomplete later implementations.

Required correction

Add deferred constraint triggers on:

Allocation insert.

Restoration insert.

Relevant lot balance updates.

Redemption/adjustment ledger linkage.

Validate all affected ledger, allocation and lot totals at transaction commit.

---

P1 — Invalid high-value requests are queued before policy validation

The service checks policy.requiresApproval before checking:

Minimum redemption.

Basket cap.

Available balance.

The pending-approval branch immediately creates the receipt, redemption and approval.

The minimum and maximum validation is performed only after that branch.

Therefore, a request above the approval threshold can enter the approval queue even when:

The customer has insufficient balance.

The request exceeds 30% of the basket.

The maximum allowed redemption is zero.

Approval execution eventually rejects it, but by then:

The approval queue contains an invalid request.

The physical receipt identity has been reserved.

The cashier cannot correct and resubmit using the same receipt.

Required correction

Validate minimum, basket cap and active balance before deciding whether the otherwise-valid request requires approval.

The sequence should be:

validate eligibility
calculate current maximum
reject invalid amount
then choose CONFIRMED or PENDING_APPROVAL

---

P1 — SMS persistence cannot support adjustment and reversal notifications

SmsMessage still requires a receipt and permits only one SMS record per tenant and receipt.

That works for earns and redemptions because each has a receipt.

It does not work cleanly for:

Manual adjustments, which have no receipt.

Reversals, which may have no receipt of their own.

A second notification relating to a receipt that already has its earn or redemption SMS record.

Yet Sprint 3 requires SMS intent for reversals and adjustments.

Required correction

Generalise notification ownership before implementing those workstreams. Possible design:

Make receiptId optional.

Add a generic transaction/ledger reference.

Preserve outboxEventId as the unique delivery intent.

Remove the one-message-per-receipt assumption.

Allow several notification events relating to one receipt while keeping each outbox event replay-safe.

---

P2 — Pending redemption receipts are marked approved by the requester

For pending redemption approval, the service creates the receipt with:

reviewStatus: APPROVED

reviewedBy: requesting cashier

approvedBy: requesting cashier

approvedAt: now

At that point, the associated redemption approval is still pending and the financial effect has not been authorised.

This does not create a balance effect, but it makes the receipt audit state misleading.

Recommended correction

Use a pending review state, or clearly separate receipt-evidence validation from controlled-action approval. The capturing cashier should not appear as the approver of a transaction awaiting supervisor approval.

---

P2 — The progress checklist overstates validation evidence

OpenSpec marks migration evidence—including remote evidence—as completed.

The migration tracker explicitly states that remote/shared deployment evidence is still pending.

The approval-concurrency task is also marked complete, but the latest tests simulate serialisation errors with Jest mocks rather than running two simultaneous PostgreSQL transactions.

No pull-request-triggered workflow run was surfaced for the current head by the connector.

That does not prove push CI did not run, but there is currently no connector-visible current-head CI evidence to support Sprint 3 release claims.

---

Remaining Sprint 3 work

Reversals — not started

Still outstanding:

Reverse endpoint and module.

Safe full earn reversal.

Redemption allocation restoration.

Adjustment reversal.

Review-required cases.

One-reversal-per-transaction enforcement.

Manual adjustments — not started

Still outstanding:

Admin-only adjustment endpoint.

Credit adjustment and new expiring lot.

Debit adjustment using FIFO.

Mandatory reasons and limits.

Idempotency, SMS and audit.

The app currently registers only the new RedemptionsModule; there are no reversal or adjustment modules.

Transaction and ledger reads — partially addressed

GET /transactions/{id} now returns confirmed redemption debit details, receipt evidence, ledger entry, and allocation summaries for redemption transactions.

Redemption transaction lookup and allocation details are present; reversal and adjustment read-model support remains a separate gap.

The customer ledger now includes redemption allocation summaries and restoration references.

Configuration and frontend integration — incomplete

Still outstanding:

Frontend-safe redemption policy values from /config/public.

Complete frontend integration guide.

Bruno redemption and approval journeys.

Generated-client validation.

Reversal and adjustment contracts.

Testing and release gates — largely outstanding

Still required:

Real migration integration tests in the repository suite.

Redemption HTTP tests.

Actual overlapping-redemption tests.

Concurrent same-key tests.

Concurrent different-key receipt tests.

Actual concurrent approval tests.

Approval racing another redemption.

Reversal racing a redemption.

Outbox and provider-failure tests.

Complete CI evidence.

---

Recommended next implementation sequence

1. Correct the approval target model immediately

Before adding more features:

Stop setting receiptId on REDEEM approvals.

Load receipt through redemption.receipt.

Update approval queries, response mapping and OpenAPI.

Add a PostgreSQL integration test that creates and executes a real high-value redemption approval.

2. Harden unique-constraint race handling

Add P2002 classification for:

Idempotency record.

Receipt identity.

Redemption receipt.

Ledger receipt.

Approval target.

Return stable domain responses and replay the original completed response when appropriate.

3. Complete database-level financial constraints

Add deferred checks for:

Allocation sum equals debit.

Lot/customer/ledger ownership.

Allocation-to-redemption or adjustment linkage.

Allocation insert plus lot reduction.

Restoration insert plus lot increase.

Ledger type and direction.

4. Add real concurrency integration tests

The minimum useful suite should prove:

1. Two redemptions against one balance cannot overdraw.

2. Same key and payload returns the original response.

3. Different keys for one receipt produce one confirmed transaction.

4. Two supervisors cannot execute one approval twice.

5. Approval execution racing another redemption cannot overdraw.

6. Implement reversals

Only after allocation/restoration invariants are proven:

Redemption restoration first.

Safe earn reversal second.

Review-required cases.

Idempotency and one-reversal constraint.

6. Generalise SMS persistence

Do this before reversals and adjustments require notifications.

7. Implement manual adjustments

Reuse the proven allocation engine:

Credit adjustment → new lot.

Debit adjustment → FIFO allocations.

Mandatory admin reason and limits.

8. Finish read models and release evidence

Discriminated transaction lookup.

Full ledger details.

Public policy config.

HTTP/OpenAPI/Bruno coverage.

Current-head CI.

---

Release decision

Capability Decision

Continue Sprint 3 development Go
Frontend mock integration against redemption contract Go
Immediate redemption against disposable development data Conditional
High-value redemption approvals No-go
Real-money redemption pilot No-go
Reversals Not available
Manual adjustments Not available
Sprint 3 closure No-go

The repository has a promising and mostly correct redemption architecture. The immediate priority should not be adding more endpoints; it should be fixing the approval persistence contradiction, completing database invariants and proving concurrency against real PostgreSQL.
