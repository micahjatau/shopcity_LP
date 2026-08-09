Updated Review: micahjatau/shopcity_LP

Overall verdict

The latest commit improves the repository’s security foundation, but it does not materially advance the loyalty product itself.

The repository is currently:

> A strong pre-ledger backend foundation with one unresolved architectural contradiction that blocks safe loyalty earning.

The latest commit, e2aea49, primarily adds multi-dimensional login throttling, Redis fail-closed testing and archives the pre-ledger specification.

I would not approve the repository to begin wallet/ledger implementation yet. The receipt identity model must first be corrected.

---

What improved since the previous review

1. Login throttling is now genuinely multi-dimensional

The previous implementation used only one combined IP + username counter. It now creates three counters:

IP

Account identity

IP-account pair

The guard can now consume multiple throttle keys and reject the request when any counter is exhausted.

This closes the earlier credential-spraying weakness.

Remaining concern

All three counters currently share the same limit:

5 attempts per 15 minutes

This means five failed attempts from ShopCity’s public IP would exhaust the IP bucket and block every employee behind that IP for 15 minutes. Separate limits would be safer:

Counter Suggested starting limit

IP 30 attempts / 15 minutes
Account 8 attempts / 15 minutes
IP-account pair 5 attempts / 15 minutes

This should be configurable rather than embedded in one decorator.

2. Redis now fails closed

A new integration test confirms that login returns 503 Service Unavailable when Redis cannot be reached.

Failing closed is appropriate for login and other abuse-sensitive endpoints. Allowing requests through when the throttling infrastructure is unavailable would weaken the security boundary.

3. The official Redis client replaced the hand-written protocol implementation

The repository now uses the official Redis client with URL-based configuration and a connection timeout.

That is materially better than maintaining a custom TCP/RESP implementation.

---

P0 blocker: the receipt model is still wrong

This remains the most serious issue.

The approved business rule

The TRD says:

The printed POS receipt number exists.

It resets weekly.

It is unique across tills within the week.

Weekly duplicate receipt prevention is in scope.

Receipt number uniqueness must be enforced by the database.

The archived implementation specification says the opposite

The newly archived specification says:

POS receipt number may be omitted.

It is informational only.

It must not be used as a uniqueness constraint.

That is not a small documentation discrepancy. It is a direct contradiction between the internal implementation specification and the confirmed store requirement.

The code follows the incorrect specification

The receipt DTO makes both deviceId and externalReceiptNumber optional.

When creating the receipt, the service generates a random UUID for receiptNumber:

receiptNumber: randomUUID(),
externalReceiptNumber,

The database unique constraint applies to that generated UUID:

branchId + receiptNumber + receiptWeekStart

Because a fresh UUID is generated for every request, the constraint does not prevent reuse of a physical POS receipt.

Fraud scenario that currently succeeds

A cashier could submit:

POS receipt: 4587
Card: Customer A
Idempotency key: operation-A

Then submit:

POS receipt: 4587
Card: Customer B
Idempotency key: operation-B

Both requests receive different generated UUIDs. The database therefore sees two unique receiptNumber values and accepts both.

A different cashier could also reuse the same receipt because idempotency is scoped to the caller’s key, not the physical sale.

Required design

The receipt should contain:

id Internal UUID
posReceiptNumber Required printed receipt number
receiptWeekStart Server-calculated week
purchaseAmountKobo Final paid amount
occurredAt POS transaction time
capturedAt Server time
idempotencyKey Network retry protection

The database constraint should be:

UNIQUE (
tenant_id,
branch_id,
receipt_week_start,
normalized_pos_receipt_number
)

Idempotency and receipt uniqueness must both exist:

Idempotency prevents duplicate processing of one client request.

Receipt uniqueness prevents one physical sale from earning multiple rewards.

---

P0 authorization issue: cashier branch and device are not enforced

The receipt service verifies that the submitted branch belongs to the tenant, but it does not verify that the cashier belongs to that branch.

Device attribution is optional. When supplied, only the device’s tenant and branch are checked.

Consequently, a cashier can currently:

Submit another branch’s ID.

Omit device attribution.

Select any valid device ID available to the tenant.

Capture a transaction without proving which checkout computer was used.

Required rule

For cashiers:

Branch must be derived from the authenticated cashier or registered device.

Device must be required.

Device must be active.

Device must belong to the cashier’s branch.

A cashier must not submit an arbitrary branch ID.

Supervisor overrides must be explicit and audited.

For one branch this may appear unnecessary, but enforcing it now protects the model before multi-branch support is introduced.

---

P0 time manipulation risk

occurredAt is fully client-supplied and is used to calculate the receipt week.

There is no visible range policy restricting it to:

The current day

The current shift

A reasonable number of hours in the past

A non-future time

Once physical receipt uniqueness is implemented, an attacker could attempt to move the same receipt into another week by changing occurredAt.

Recommended rule

For online transactions:

capturedAt comes from the server.

posOccurredAt may come from the cashier/POS.

posOccurredAt must fall within a configured tolerance.

Late entries require supervisor approval.

For offline transactions:

Store both device time and server-received time.

Keep the transaction pending.

Do not make pending credit redeemable.

---

Database issues still present

1. Receipt branch relation is not tenant-composite

Customer and card relations use tenant-aware composite foreign keys, but receipt-to-branch and receipt-to-device do not.

The stronger model is:

Receipt(tenantId, branchId)
→ Branch(tenantId, id)

and:

Receipt(tenantId, deviceId)
→ Device(tenantId, id)

The database should enforce tenant ownership rather than depending only on service code.

2. Duplicate actor fields

Receipt stores both:

cashierId

capturedBy

capturedBy has a user relationship; cashierId does not. They can eventually disagree.

Use one authoritative field:

capturedByUserId

Later fields can separately represent:

approvedByUserId

reversedByUserId

adjustedByUserId

3. Customer uniqueness contradicts the TRD

The TRD describes one active customer per phone number, implying a partial unique constraint.

The schema instead places unconditional unique constraints on tenant-plus-phone and tenant-plus-email.

A blocked customer’s number therefore remains unavailable permanently.

Either policy is defensible, but the PRD, database and error messages must agree.

4. Idempotency lifecycle is incomplete

The schema defines PENDING and COMPLETED, but receipt capture creates the record directly as COMPLETED before the response is stored.

The idempotency table also lacks:

Tenant ID

User foreign key

Operation/resource relationship

Visible cleanup ownership for expired records

The model is usable for a prototype but should be corrected before it becomes shared financial infrastructure.

---

Redis still has an operational weakness

Redis reconnects are deliberately disabled:

reconnectStrategy: () => false

Errors are also consumed by an empty listener.

This produces two risks:

1. A temporary Redis disconnect may leave the cached client unusable until the application restarts.

2. Redis failures may return 503 without generating useful operational logs or alerts.

Fail-closed behaviour is correct, but the application must recover automatically after Redis returns.

Recommended changes:

Add bounded reconnection with backoff.

Reset the cached client when it closes.

Log connection failures and reconnect attempts.

Add Redis health alerts.

Differentiate initial connection failure from a later disconnection.

---

CI remains non-self-contained

Integration tests assume Redis exists at 127.0.0.1:6379 and execute redis-cli directly.

The new throttling test also inspects Redis keys using redis-cli.

The GitHub Actions workflow does not explicitly provision or start Redis before running integration tests.

Use a Redis Testcontainer, matching the existing PostgreSQL Testcontainer approach. This avoids dependence on the runner’s installed packages or service state.

---

Core product completion has not advanced

The active application currently loads:

Auth

Users

Branches/devices

Customers

Cards

Receipts

Audit

Configuration

The central product modules remain empty:

Loyalty

Approvals

Notifications

Fraud

Reports

The dependency list still has Redis but no BullMQ or equivalent queue implementation for SMS, expiry and background work.

Therefore, the platform still cannot:

Earn 2% store credit

Calculate a wallet balance

Create expiry lots

Redeem credit

Approve high-value transactions

Reverse/refund transactions

Send SMS notifications

Flag suspicious behaviour

Produce owner liability reports

---

Updated maturity assessment

Dimension Previous Current

Architecture 8/10 8/10
Authentication/session security 7.5/10 8/10
Throttling/security controls 6/10 7.5/10
Database integrity 6.5/10 6/10
Receipt fraud protection 3/10 2/10
Core loyalty functionality 2.5/10 2.5/10
Production readiness 3/10 3/10

The database score drops slightly because the receipt behaviour is no longer merely an unfinished assumption—it has now been formally archived as an intentional design that conflicts with the approved business requirement.

---

Required next change set

Create a new OpenSpec change such as:

correct-pos-receipt-integrity-gate

It should include:

1. Make POS receipt number required.

2. Remove the generated business receiptNumber.

3. Add normalized weekly physical-receipt uniqueness.

4. Require and validate device attribution.

5. Derive cashier branch from authenticated context.

6. Bound occurredAt.

7. Use tenant-composite foreign keys.

8. Consolidate receipt actor fields.

9. Add tests for:

Same receipt, different idempotency keys

Same receipt, different cashiers

Same receipt, different cards

Same receipt near a week boundary

Cross-branch submissions

Missing/inactive/wrong-branch device

Future and stale transaction timestamps

10. Provision Redis through Testcontainers or CI services.

11. Add Redis reconnection and observable failure handling.

Only after this gate passes should development proceed to:

Receipt validation
→ Earn calculation
→ Immutable ledger entry
→ Credit lot
→ Balance
→ SMS outbox

Final decision

The latest commit is an improvement, but the repository is still not ready for ledger development.

The next work should not be loyalty earning. It should be a corrective receipt-integrity change that reconciles the TRD, OpenSpec, API, database schema and tests around the supermarket’s actual printed receipt workflow.
