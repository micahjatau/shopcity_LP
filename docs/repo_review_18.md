Sprint 2 review

Current head: 7ec794ead8d21832ed305ed368c0b53a27838978 — fix: close repo review 17 blockers.

Verdict

Sprint 2 is functionally complete but not formally closed.

I would score it at roughly 88% complete:

The core earn workflow is production-shaped.

The approval and SMS defects from earlier reviews have been fixed.

The remaining work is concentrated around database invariants, API governance and visible release evidence.

Starting full Sprint 3 implementation before sealing those boundaries would be premature.

The Sprint 2 issue remains open, and its checklist has not been reconciled with what is already implemented.

---

What Sprint 2 now does well

1. The earn transaction is properly atomic

A confirmed earn creates, within one serializable PostgreSQL transaction:

Receipt evidence.

Immutable earn ledger entry.

Twelve-month credit lot.

Outbox event.

SMS delivery record.

Audit record.

Completed idempotency response.

That matches the central Sprint 2 architectural requirement.

2. The backend owns financial authority

The service:

Requires a session-bound active device.

Determines branch context on the server.

Derives the authoritative receipt week.

Revalidates card and customer status.

Excludes staff.

Calculates the reward internally.

Does not accept a client-calculated balance or credit amount.

This is exactly the right financial boundary.

3. Duplicate and replay protection are strong

The implementation has:

Tenant-scoped idempotency records.

Request hashes.

Exact-response replay.

Conflict detection when the same key is reused with a different payload.

Database-enforced weekly receipt uniqueness.

4. Approval handling is now credible

High-value purchases reserve the receipt but create no ledger, lot or SMS effect until approval. Approval then revalidates current policy and eligibility before executing.

Expired approvals now persist correctly without financial side effects, and there is a regression test proving it.

5. SMS is no longer pretend infrastructure

The repository now contains an eBulkSMS-specific provider that builds the expected authentication, message and recipient payload, applies timeouts and maps provider failures.

Fake providers are rejected in production unless an explicit override is enabled.

6. The ledger itself is protected

Confirmed ledger entries cannot be updated or deleted because of PostgreSQL triggers. Ledger and lot amounts also have basic positive and non-negative checks.

---

What still blocks Sprint 2 closure

P0 — Receipt evidence is still mutable

The Sprint 2 issue explicitly describes Receipt as immutable purchase evidence.

But the database currently allows changes to:

purchaseAmountKobo

posReceiptNumber

occurredAt

customerId

cardId

branchId

deviceId

capturedBy

This matters because pending approval execution later reads the receipt amount to calculate credit. A direct database modification before approval would change the resulting financial effect.

Required action

Create a PostgreSQL trigger that blocks updates to the purchase-evidence fields after insertion.

Only workflow metadata should remain mutable:

Review status.

Reviewer identity.

Approval identity.

Review and approval timestamps.

This is the most important remaining Sprint 2 fix.

---

P0 — Credit lots are not tied tightly enough to the ledger

The current constraints ensure:

Original lot amount is positive.

Remaining amount is not negative.

Remaining amount does not exceed the original.

They do not guarantee that:

CreditLot.originalAmountKobo equals the associated ledger amount.

The lot and ledger belong to the same customer.

earnedAt matches the ledger’s effective timestamp.

The lot’s immutable fields remain unchanged.

This is manageable while the system only creates earn lots. It becomes dangerous as soon as Sprint 3 begins reducing lot balances during redemption.

Required action

Add database validation that:

creditLot.tenantId = ledger.tenantId
creditLot.customerId = ledger.customerId
creditLot.originalAmountKobo = ledger.amountKobo
creditLot.earnedAt = ledger.effectiveAt
ledger.type = EARN
ledger.direction = CREDIT

Prevent updates to:

Tenant.

Customer.

Earn ledger reference.

Original amount.

Earned timestamp.

remainingAmountKobo should eventually change only through the controlled redemption, reversal and expiry workflows.

---

P1 — Serialization conflicts still masquerade as duplicate receipts

The catch path currently treats both receipt uniqueness errors and transaction conflicts as:

RECEIPT_ALREADY_CAPTURED

That is factually wrong. A PostgreSQL serialization conflict means competing transactions could not be ordered safely. It does not prove that the physical receipt was duplicated.

Required action

Implement bounded transaction retry:

1. Retry known serialization failures two or three times.

2. Use slight random jitter between retries.

3. Return a temporary concurrency error when retries are exhausted.

4. Return RECEIPT_ALREADY_USED only when the receipt uniqueness index is violated.

This becomes more important in Sprint 3, where concurrent redemptions will be routine rather than exceptional.

---

P1 — The API contract and the TRD disagree

The TRD specifies:

Success envelope: {data, meta}.

RFC 7807-style error objects.

Stable codes such as RECEIPT_ALREADY_USED.

The implementation returns:

{success, data, meta} for success.

{success, error, meta} for errors.

Different codes in several cases.

The implemented format is not inherently bad. The problem is having two authoritative contracts.

Required action

Make a formal decision before frontend integration:

Option A: Change the implementation to match the TRD.

Option B: Amend the TRD and record the envelope decision in an ADR.

I favour Option B because the current implementation is internally consistent and already generated into OpenAPI. Rewriting it now produces work without much product value. But the error catalogue should still be standardised.

---

P1 — Duplicate public workflows remain

The repository exposes both:

POST /transactions/earn

POST /receipts

It also exposes both:

POST /approvals/:id/decision

Receipt-specific approve/reject endpoints.

This undermines the Sprint 2 decision to centralise earning and approval orchestration.

Required action

Adopt one canonical workflow:

POST /transactions/earn
GET /approvals
POST /approvals/:id/decision

Then either:

Remove the receipt write and decision endpoints, or

Mark them deprecated and exclude them from new frontend integration.

Do not carry duplicate financial APIs into Sprint 3.

---

P1 — No visible current-head release proof

The migration tracker explicitly records that current-head CI evidence is still pending.

The latest commit also has no commit statuses exposed through the connected GitHub result. That does not prove the tests fail; it means Sprint 2 lacks visible release evidence.

Required action

The Sprint 2 closure PR must visibly pass:

Formatting.

Lint.

Typecheck.

Architecture boundaries.

Unit tests.

E2E tests.

PostgreSQL/Redis integration tests.

Migration deployment tests.

OpenAPI generation and lint.

OpenAPI breaking-change check.

API and worker build.

Capture the run or artifact reference in the migration tracker and issue.

---

Important but non-blocking carryovers

These should be tracked, but they do not all need to delay Sprint 3 design.

Cashier PII exposure

Cashiers can currently retrieve unmasked customer data through customer and card lookup paths.

Create role-specific response DTOs before pilot deployment.

Earn endpoint rate limiting

The TRD expects financial endpoint throttling, but the earn controller currently has no throttle configuration.

Add per-user and per-device limits before external testing.

Unpaginated ledger and approval results

The service currently loads the complete customer ledger and tenant approval history.

Pagination can be implemented alongside Sprint 3 because the ledger response will need redesign for debit and reversal entries anyway.

Fake SMS override semantics

The explicit production override may be useful for emergency operation, but sandbox messages should be marked SUPPRESSED, not SENT.

---

Recommended next steps

Step 1 — Create one Sprint 2 closure change

Do not scatter the remaining fixes across another series of “close 18 blockers” commits. Create one narrowly scoped change:

sprint-2-financial-integrity-closure

Its scope should contain only:

1. Receipt evidence immutability.

2. Positive receipt amount database constraint.

3. Credit-lot-to-ledger consistency constraints.

4. Serialization retry handling.

5. Regression tests for all four.

This is the real financial closure gate.

---

Step 2 — Finalise the public API contract

Create an ADR covering:

The chosen response envelope.

The canonical error catalogue.

The canonical earn endpoint.

Deprecation of receipt-specific write endpoints.

Canonical approval decisions.

Frontend migration rules.

Then regenerate:

OpenAPI.

Orval client.

Bruno examples.

Error mapping documentation.

---

Step 3 — Run a Sprint 2 acceptance suite

The final acceptance suite should prove:

Scenario Expected result

Normal earn One receipt, ledger entry, lot, outbox, SMS record and audit entry
Same idempotency key and payload Exact original response
Same key, changed payload IDEMPOTENCY_CONFLICT
Same receipt, different keys Exactly one financial effect
Staff customer No financial effect
High-value purchase Receipt and approval only
Concurrent approvals Exactly one execution
Expired approval Persists EXPIRED; no financial effect
Inactive card/customer/device/branch Approval execution blocked
Ledger mutation Database rejects update and delete
Receipt evidence mutation Database rejects update
Lot identity mutation Database rejects update
SMS provider timeout Transaction remains committed
Serialization conflict Retried or returned as concurrency failure, not duplicate receipt

---

Step 4 — Close Issue #1 properly

The issue’s checklist is still entirely unchecked despite substantial implementation.

Update it with:

Completed boxes.

Deferred items with linked follow-up issues.

Final migration names.

CI run evidence.

OpenAPI artifact reference.

Explicit exit-gate decision.

Then close it only after the financial-integrity closure PR is green.

---

After Sprint 2: how to start Sprint 3

Do not begin Sprint 3 with a redemption controller.

Begin with the financial model.

Sprint 3A — Ledger vocabulary and schema

Expand:

LedgerEntryType:
EARN
REDEEM
REVERSAL
EXPIRY
ADJUSTMENT

LedgerEntryDirection:
CREDIT
DEBIT

Add:

RedemptionAllocation

Redemption approval target/type information.

Reversal relationships.

Adjustment reason and authorisation metadata.

Indexes for active lots ordered by expiry.

Sprint 3B — FIFO domain engine

Build a pure, heavily tested allocation function before touching controllers:

Input:
available lots ordered by expiresAt
requested redemption
basket amount
policy

Output:
allocations
total redeemed
remaining balance
policy decision

The function should handle:

Minimum redemption.

Basket percentage cap.

Insufficient balance.

Earliest-expiry consumption.

Partially consumed lots.

Same-purchase prohibition.

High-value approval threshold.

Sprint 3C — Concurrent redemption transaction

Then implement the database transaction with:

Row locking on eligible credit lots.

Fresh balance calculation.

Allocation rows.

Debit ledger entry.

Lot reductions.

Outbox and SMS record.

Audit record.

Idempotency response.

The key test is not “redemption succeeds.” It is:

> Two simultaneous redemption requests can never consume more credit than exists.

That test is Sprint 3’s spine.

---

Final decision

Do not declare Sprint 2 closed today.

Complete one tightly controlled closure change covering:

1. Receipt immutability.

2. Credit-lot integrity.

3. Serialization retries.

4. API-contract decision.

5. Visible green CI evidence.

After that, close Issue #1 and begin Sprint 3 with schema and FIFO domain design—not endpoints. The earning engine is strong. The job now is to seal the vault before installing the withdrawal door.
