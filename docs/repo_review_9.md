Repository review against the TRD

Executive verdict

The latest reviewed commit is 2269cd1e29bd1e3381cb7d82bce6be912d0b8541, “chore: archive remaining migration risks.”

The repository has now completed:

Most of Sprint 0 — Foundation

Most of Sprint 1 — Identity and Master Data

The receipt-integrity and transaction-readiness portion of Sprint 2

It has not yet implemented the actual loyalty financial engine. There is still no immutable ledger, credit lots, balance reconstruction, redemption, expiry, transactional outbox, SMS worker, fraud processing, or reporting.

My estimated position is:

Pre-ledger platform readiness: approximately 80–85%

Full TRD MVP implementation: approximately 40–45%

Production pilot readiness: approximately 30%

The correct next phase is now unambiguously TRD Sprint 2 — Earn Ledger. The TRD defines that sprint as receipts, idempotency, earn policy, ledger, credit lots, outbox, and SMS, with concurrent-duplicate tests and a frontend-integrable earn flow as the exit gate.

---

TRD implementation matrix

TRD phase Current status Assessment

Sprint 0 — Foundation Mostly complete NestJS/Fastify, Prisma, Redis, validation, logging, health checks, OpenAPI, Testcontainers and CI definition exist. BullMQ worker, Sentry and several security pipeline gates remain.
Sprint 1 — Identity and Master Data Substantially complete Auth, sessions, RBAC, users, branches, devices, customers, cards, audit and public configuration are implemented.
Receipt integrity preparation Strong Physical receipt identity, weekly uniqueness, tenant-safe relations, idempotency, device binding, approval thresholds and concurrency protection are implemented.
Sprint 2 — Earn Ledger Partially started Receipt evidence and idempotency are ready, but ledger, credit lots, balance, outbox and SMS are absent.
Sprint 3 — Redemption and Approvals Scaffold only Receipt approval exists, but not the generic TRD approval state machine, redemption, FIFO allocation, reversal or adjustments.
Sprint 4 — Offline, Fraud and Reports Not started Modules are placeholders.
Sprint 5 — Hardening and Pilot Early foundation only Some security and migration testing exists, but restore tests, workers, scans, load testing, pilot operations and full runbooks remain.

The TRD’s release criteria require immutable balances, expiry-aware lots, redemption controls, compensating reversals, offline earning, asynchronous SMS, reports, backups and production operations.

---

What improved since the previous review

1. The receipt migration blockers are substantially closed

The migration now checks for both:

Missing or blank legacy POS references

Duplicate normalized legacy receipt identities

These checks happen before destructive column changes.

The upgrade-test harness now stops when it reaches the target migration instead of accidentally including future migrations.

There is also an explicit regression test for duplicate legacy POS references with case and whitespace normalization.

Verdict: the previous P0 migration concern has been addressed.

---

2. Receipt processing is now financially safer

Receipt capture now runs in a serializable transaction and revalidates the device, branch, card, customer and staff eligibility inside that transaction.

The transaction also handles:

Tenant-scoped idempotency

Expired idempotency records

Database-backed receipt uniqueness

Purchase flag and approval thresholds

Atomic audit and stored response creation

A real simultaneous duplicate test now sends two receipt requests concurrently and verifies exactly one 201, one 409, and one stored receipt.

This is the correct foundation for extending the transaction to also create the ledger entry, credit lot and outbox event.

---

3. Purchase policy handling is much closer to the business rules

The implementation now distinguishes:

Normal purchase: CAPTURED

Above ₦100,000: FLAGGED

Above ₦200,000: PENDING_APPROVAL

Above the hard system ceiling: rejected

The status resolution is configuration-backed rather than hardwired to one amount.

The tests cover pending approval and amounts below, at and above the hard ceiling.

---

4. Device attribution is stronger

Sessions can now be bound to an enrolled active device. Login verifies:

Tenant ownership

Branch compatibility

Device and branch activity

A time-bound HMAC attestation

Receipt capture obtains the device from the authenticated session rather than trusting a submitted receipt field.

Bearer requests are also correctly exempted from cookie CSRF checks, while cookie-authenticated write requests still require CSRF verification.

---

Important TRD gaps that remain

1. There is still no loyalty ledger

The current Prisma schema ends with receipts, idempotency records and audit logs. It does not contain:

LoyaltyLedgerEntry

CreditLot

RedemptionAllocation

Approval

OutboxEvent

SmsMessage

FraudFlag

The LoyaltyModule, NotificationsModule, FraudModule, and ReportsModule remain empty placeholders.

Therefore, the system currently records purchase evidence but cannot:

Calculate and award 2%

Produce a financial transaction ID

Create 12-month credit

Determine an authoritative balance

Expire credit

Redeem credit

Reverse an earn

Report outstanding loyalty liability

This is the principal product gap.

---

2. The current API is a receipt API, not the TRD earn API

The implemented endpoint is:

POST /api/v1/receipts

It returns receipt capture and review status.

The TRD requires:

POST /api/v1/transactions/earn

with:

201 CONFIRMED containing credit earned, balance, expiry and SMS status

202 PENDING_APPROVAL containing an approval ID and reason code

Recommended boundary

Keep Receipt as internal, immutable purchase evidence.

Add TransactionsService or LoyaltyService as the orchestration layer that atomically creates:

Receipt
└── EARN Ledger Entry
├── Credit Lot
├── Audit Log
└── Outbox Event

/receipts should eventually become internal-only or be deprecated after the frontend moves to /transactions/earn.

---

3. Approval is still receipt review, not the TRD approval state machine

Current approval endpoints are:

POST /api/v1/receipts/:id/approve
POST /api/v1/receipts/:id/reject

They are restricted to supervisors/admins and prevent self-approval.

However, the current workflow:

Has no independent Approval entity

Does not require a decision reason

Has no EXECUTED or EXPIRED state

Does not revalidate customer, card, device and current policy before financial execution

Only changes fields on the receipt

Cannot guarantee one-time ledger execution

The TRD requires approval to remain separate from execution and explicitly states that approved actions must be revalidated before any financial write.

There is also duplicated review logic in both ReceiptsService and ApprovalsService. The controller uses ApprovalsService, making the receipt-service version redundant.

This should be centralized before ledger execution is attached to approval.

---

4. Stable domain error contracts are still missing

OpenAPI currently describes all error statuses with the same generic schema and example:

{
"statusCode": 400,
"code": "VALIDATION_ERROR",
"message": "Validation failed"
}

The TRD requires frontend-stable codes such as:

RECEIPT_ALREADY_USED

IDEMPOTENCY_CONFLICT

STAFF_INELIGIBLE

CARD_INACTIVE

INSUFFICIENT_BALANCE

APPROVAL_REQUIRED

DEPENDENCY_UNAVAILABLE

These codes should be implemented during Sprint 2 rather than deferred, because the frontend earn flow depends on them.

---

5. The background-processing stack is incomplete

The TRD requires Redis with BullMQ for SMS, expiry and outbox recovery. The current dependencies contain Redis but no BullMQ or Sentry.

The transactional outbox is especially important: notification intent must commit with the financial transaction even though SMS delivery occurs afterward. The TRD explicitly requires this separation.

---

Smaller contract deviations to record

GET /config/public

The TRD catalogue marks it authenticated, but the current endpoint is decorated as public.

This may be reasonable for initial app bootstrapping, but it should be an explicit decision rather than accidental contract drift.

Customer and card registration

The TRD workflow describes creating the customer and initial card atomically. The implementation currently uses separate /customers and /cards calls.

This is workable, but a failed second call can leave a customer without a card. A combined onboarding endpoint could be introduced later without removing the administrative endpoints.

Phone uniqueness

The TRD specifies uniqueness for active customers. The schema currently enforces tenant-wide phone uniqueness regardless of customer status.

That stricter rule may be preferable, but it should be documented as a deliberate business decision.

---

Next phase: immutable earning ledger

Phase 2A — freeze the contract

Implement and document:

POST /api/v1/transactions/earn
GET /api/v1/transactions/:id
GET /api/v1/customers/:id/ledger
GET /api/v1/approvals
POST /api/v1/approvals/:id/decision

The immediate earn contract should support:

201 CONFIRMED

202 PENDING_APPROVAL

Stable domain errors

Idempotent replay

Integer-kobo fields

SMS status

Credit expiry

Reconstructed balance

---

Phase 2B — add the financial data model

Add these models first:

LoyaltyLedgerEntry

Core fields:

id
tenantId
customerId
receiptId
type
direction
amountKobo
status
correlationId
reversesEntryId
createdBy
effectiveAt
createdAt

Constraints:

Positive amount only

Exactly one EARN entry per receipt

Append-only after confirmation

Tenant-safe foreign keys

Unique reversal linkage

CreditLot

id
tenantId
customerId
earnLedgerEntryId
originalAmountKobo
remainingAmountKobo
earnedAt
expiresAt
createdAt

Constraints:

originalAmountKobo > 0
remainingAmountKobo >= 0
remainingAmountKobo <= originalAmountKobo
one lot per earn entry

Approval

PENDING
APPROVED
EXECUTED
REJECTED
EXPIRED

It should store requester, decision maker, reason, target and execution timestamps separately.

OutboxEvent

Store notification intent in PostgreSQL before queue publication.

---

Phase 2C — implement the atomic earn transaction

The earn transaction should:

1. Resolve idempotency.

2. Revalidate session device and branch.

3. Revalidate card, customer and staff eligibility.

4. Derive receipt week.

5. Reserve the physical receipt identity.

6. Determine normal, flagged or approval-required status.

7. For approval-required purchases:

Create approval

Create no ledger or credit lot

Return 202

8. For confirmed purchases:

Calculate 2% with integer arithmetic

Create one immutable EARN ledger entry

Create one 12-month credit lot

Create one outbox event

Write audit events

Store the complete idempotent response

9. Commit everything together.

Recommended calculation:

const creditKobo =
(purchaseAmountKobo * BigInt(earnRateBps) + 9_999n) / 10_000n;

No conversion to JavaScript floating-point numbers should occur during financial calculations.

---

Phase 2D — execute approvals safely

Approval should:

Require a supervisor/admin and a reason

Prohibit requester self-approval

Re-fetch and lock the approval target

Revalidate card, customer, device, receipt and current thresholds

Create the ledger, lot and outbox exactly once

Move from APPROVED to EXECUTED

Leave rejected or expired approvals with zero financial effect

Two simultaneous approval attempts must never create two earns.

---

Phase 2E — minimum outbox and SMS worker

Add:

BullMQ

API and worker entry points

Outbox publisher

SMS provider interface

Fake provider for CI/local work

Retry/backoff rules

Delivery status persistence

Outbox recovery job

SMS failure must never invalidate a confirmed earning transaction.

---

Phase 2 exit tests

The most important test should assert that two simultaneous earn requests for the same receipt produce:

1 Receipt
1 EARN Ledger Entry
1 Credit Lot
1 Outbox Event
1 successful response
1 duplicate conflict

Other mandatory tests:

Exact 2% integer calculation

Staff exclusion

Idempotent replay

Changed-payload idempotency conflict

Pending approval creates zero financial effect

Approval executes exactly once

Approval revalidation after card/customer/device blocking

Lot or outbox insertion failure rolls back everything

Exact 12-month lot expiry

Stable 201/202/409/422/503 OpenAPI contracts

---

Planning started

I created the planning issue:

Issue #1 — Phase 2: Implement immutable earning ledger

It contains the schema, API contract, atomic earn workflow, approval execution, outbox/SMS workstreams, required tests and Sprint 2 exit gate.

No source code was modified during this review.

CI evidence

The repository’s CI definition runs build, formatting, linting, architecture checks, type checking, OpenAPI checks, unit tests, end-to-end tests and integration tests.

However, I could not independently verify a successful run for the latest commit: the available workflow query returned no PR-triggered workflow runs.
