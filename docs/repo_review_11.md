# Repository review — latest head

Current head: `0101aedf9d68ab8c80a7646c81b26f58938f0b29`, **“feat: finalize earn ledger public contract.”** It is one commit ahead of the previously reviewed earn-ledger implementation.

## Verdict

This commit fixes several major defects from the last review. The repository now has a credible **Sprint 2 earning workflow**, rather than merely an earn-ledger prototype.

However, **Sprint 2 is not complete yet**. The main blockers are now concentrated around:

1. Transactional outbox correctness
2. Actual SMS processing and recovery
3. Legacy pending-approval migration
4. Stable error contracts
5. Transaction identity
6. Approval policy revalidation
7. Missing high-risk tests and visible CI evidence

GitHub issue #1 should remain open.

---

# What improved since the previous review

## 1. The receipt bypass is fixed

`POST /api/v1/receipts` no longer uses the independent receipt persistence service. It now delegates directly to `LoyaltyService.earn()` and reshapes the result for legacy consumers. This means an eligible purchase submitted through either public endpoint follows the same receipt, approval, ledger and credit-lot decision path.

This closes the most serious previous failure scenario, where `/receipts` could reserve a physical receipt without awarding credit.

## 2. Runtime 201/202 behavior is implemented

Confirmed earns now return HTTP `201`, while approval-required earns return HTTP `202`. The shared OpenAPI helper also supports accepted responses, and both outcomes are documented.

The HTTP receipt integration suite also verifies the `202` result for high-value purchases.

## 3. Balance, expiry and SMS-intent fields were added

Confirmed earn responses now include:

- `availableBalanceKobo`
- `expiresAt`
- `smsStatus`
- `deviceId`
- `captureStatus`

The balance is calculated from positive, unexpired credit lots.

Transaction reads now distinguish confirmed, rejected, pending and invalid states more accurately.

## 4. Rejected approvals now update the receipt

A generic approval rejection now updates the associated receipt to `REJECTED` instead of leaving it indefinitely pending.

That fixes the previous mismatch between approval state and transaction state.

## 5. The financial database constraints are considerably stronger

The hardening migration adds:

- Positive ledger amount checks
- Positive original credit-lot amount
- Non-negative remaining amount
- Remaining amount not exceeding original
- Ledger actor foreign key
- Approval requester and decision-maker foreign keys
- Reversal self-reference
- Update and delete prevention triggers for ledger rows

The Prisma relations were updated accordingly.

## 6. The previous test-construction error is fixed

The immutable-ledger integration suite now constructs `ApprovalsService` with all three required dependencies.

Generated OpenAPI was also refreshed, and the OpenAPI test now checks that both `201` and `202` are published for the earn and receipt routes.

---

# Remaining release blockers

## 1. The outbox is published **before the database transaction commits**

This is the most important remaining architectural issue.

Inside the serializable earning transaction, the code:

1. Creates the outbox row

2. Immediately opens a Redis queue

3. Adds the job

4. Continues with idempotency and audit writes

5. Only commits when the entire callback finishes

Approval execution does the same thing.

The TRD explicitly requires the worker to publish **after commit**, preventing an SMS or job from being created for a financial transaction that later rolls back.

### Why this matters

A BullMQ worker could receive the job before PostgreSQL exposes the corresponding outbox row. It can then:

- Fail because the row is not visible yet
- Retry unnecessarily
- Process an event for a transaction that eventually rolls back
- Leave an orphan queue job if the database transaction never commits

The current catch prevents Redis failure from rolling back finance, which is good, but it does not make publication transactionally safe.

### Required design

The request transaction should only insert the outbox row. A separate publisher should:

```text
select committed PENDING outbox rows
→ claim them atomically
→ enqueue with outbox ID as job ID
→ mark queued/published
→ retry aged rows
```

Redis communication should not occur inside the financial transaction.

---

## 2. The worker still does not send SMS

The worker currently marks an outbox event `PUBLISHED` as soon as the BullMQ job runs. It does not:

- Render an SMS template
- Call an SMS provider
- Hand off to another delivery adapter
- Create an `SmsMessage`
- Track sent or delivered state

The database still contains only `OutboxEvent`; there is no SMS delivery-audit entity after it.

The API therefore returns outbox states such as `PENDING`, `PUBLISHED` or `FAILED`, while the TRD expects operational SMS states such as `QUEUED`, `SENT`, `DELIVERED`, `FAILED` and `SUPPRESSED`.

There is also no package script that launches the worker process. The available production command only starts the Nest API.

### Required fix

Add:

- `start:worker` and `start:worker:prod`
- A PostgreSQL outbox publisher/recovery loop
- An SMS provider interface
- A deterministic local/CI provider
- An `SmsMessage` or equivalent delivery record
- Correct queued/sent/delivered/failed transitions
- Graceful Prisma and worker shutdown

---

## 3. No aged-outbox recovery exists

The OpenSpec task list marks retry and aged-event recovery as completed.

But the implemented worker only handles jobs that are already present in Redis. It does not query PostgreSQL for:

- Old `PENDING` rows
- `FAILED` rows eligible for retry
- Rows never queued because Redis was unavailable
- An aged backlog requiring an alert

The TRD specifically defines an `outbox.recover` scheduled job and requires Redis queues to be reconstructable from PostgreSQL.

This means a Redis outage during earn processing can leave a valid outbox row permanently pending.

---

## 4. Legacy pending receipts can still be “approved” without financial effects

The public capture bypass is fixed, but `ApprovalsService` still contains a legacy fallback:

```ts
if (!approval) {
  return reviewLegacyReceipt(...)
}
```

That fallback merely changes receipt review fields. It does not create:

- A ledger entry

- A credit lot

- An outbox event

- An executed generic approval

Any pending receipt created before generic approvals were introduced could therefore be approved without awarding the customer credit.

### Safer options

Either:

- Backfill generic `Approval` rows for all legacy pending receipts, or
- Reject legacy approval attempts and require manual migration, or
- Execute the same financial workflow from the fallback after full eligibility validation.

Simply setting `reviewStatus = APPROVED` is unsafe.

---

# High-priority contract and correctness gaps

## 5. Transaction identity is still ambiguous

The new design document says the API should distinguish:

- `transactionId`
- `receiptId`
- `approvalId`

The implementation instead returns:

- `id`
- `receiptId`
- `ledgerEntryId`

`id` and `receiptId` are both assigned the receipt ID.

`GET /transactions/:id` also treats the URL parameter as a receipt ID and searches the `Receipt` table.

The TRD’s public contract calls the confirmed financial identifier `transactionId`.

### Recommended contract

For confirmed earns:

```json
{
  "transactionId": "<ledger-entry-or-transaction-aggregate-id>",
  "receiptId": "<receipt-id>",
  "approvalId": null
}
```

For pending earns:

```json
{
  "transactionId": null,
  "receiptId": "<receipt-id>",
  "approvalId": "<approval-id>"
}
```

Using both `id` and `receiptId` for the same value creates unnecessary ambiguity for generated clients.

---

## 6. Stable domain error codes remain missing

The earn service still throws generic Nest exceptions such as:

- `Device is not active`

- `Card not found`

- `Physical receipt already captured`

- `Idempotency key reused with different payload`

A `DomainHttpException` mechanism already exists, but the financial workflow does not use it.

The generated OpenAPI still describes errors using the same generic `VALIDATION_ERROR` example even for 401, 403 and 409 responses.

The TRD expects deterministic codes such as:

- `RECEIPT_ALREADY_USED`
- `IDEMPOTENCY_CONFLICT`
- `CARD_OR_CUSTOMER_INELIGIBLE`
- `POLICY_VIOLATION`
- `DEPENDENCY_UNAVAILABLE`

This remains a frontend-integration blocker.

---

## 7. Approval execution does not revalidate the current financial policy

Approval execution rechecks:

- Branch status
- Device status
- Card status
- Customer status
- Staff exclusion

But it does not rerun:

- The current purchase hard ceiling
- The current approval threshold
- The current earn policy
- Approval expiry
- Any changed tenant/branch policy

It directly calculates credit after entity checks.

The TRD requires approved use cases to execute with fresh policy validation.

At minimum, approval execution should call a shared policy evaluator before changing the approval from `PENDING`.

---

## 8. Approval expiry exists only as an enum value

`EXPIRED` exists in `ApprovalStatus`, but there is no service path or scheduled job that transitions stale approvals into it.

The current decision service only processes `APPROVED` and `REJECTED`.

This is acceptable as a tightly documented deferral, but the phase should not claim a complete approval state machine.

---

# Idempotency concerns

## 9. Legacy idempotency records use a different endpoint namespace

The authoritative service always stores records under:

```text
POST /api/v1/transactions/earn
```

The compatibility `/receipts` endpoint now calls that service. Existing historical records created under:

```text
POST /api/v1/receipts
```

will not be found during replay.

The receipt test still creates expired records under the old endpoint namespace, but the request succeeds because the new service ignores those rows rather than proving that they were cleaned up or replayed.

### Upgrade consequence

A legacy client retrying a previously completed receipt with the same old idempotency key may receive a duplicate-receipt conflict instead of the original response.

A migration or compatibility lookup should cover both endpoint names during the transition.

## 10. Concurrent requests using the same idempotency key are not proven

The service checks the key and creates the completed record near the end of the transaction. It does not reserve a `PENDING` record before financial processing.

Two truly simultaneous requests with the same key could race into receipt creation. Depending on which database conflict appears first, the losing request may be returned as a duplicate receipt instead of receiving the original response.

The tests cover:

- Sequential same-key replay
- Concurrent same-receipt requests with different keys

They do not cover simultaneous same-key requests.

---

# Financial edge cases

## 11. Exact 12-month expiry is not safe for leap-day dates

Expiry currently uses:

```ts
result.setUTCMonth(result.getUTCMonth() + 12);
```

JavaScript month rollover can move a February 29 earn into March of the following non-leap year. The phase plan required exact expiry testing, but the current immutable-ledger suite contains no leap-day or end-of-month test.

Expiry policy should explicitly define whether February 29 expires on:

- February 28 of the next year, or
- March 1

Then implement and test that rule deterministically.

## 12. Receipt purchase amount still lacks a database check

The new migration protects ledger and lot amounts, but it does not add:

```sql
CHECK ("purchaseAmountKobo" > 0)
```

The original receipt migration also did not add such a constraint.

HTTP DTO validation currently protects public requests, but the service-level amount assertion checks safe integer and maximum only, not positivity.

The TRD explicitly lists a positive purchase-amount database constraint.

---

# Verification assessment

## Improved

The repository now has meaningful tests for:

- Sequential idempotent replay

- Changed-payload conflict

- Duplicate receipt concurrency

- Approval concurrency

- Available balance

- Expiry field presence

- Runtime receipt `201/202`

- Receipt approval and rejection

- Generated OpenAPI `201/202`

## Still missing

High-risk tests remain absent for:

- Staff customer earning rejection
- Card becoming inactive before approval
- Customer becoming blocked before approval
- Device or branch becoming inactive before approval
- Policy or ceiling changing before approval
- Pending approval proving zero ledger, lot and outbox rows
- Rollback when lot creation fails
- Rollback when outbox creation fails
- Database constraint violations
- Ledger update/delete trigger behavior
- Leap-day expiry
- Simultaneous same-key idempotent requests
- Canonical `/transactions/earn` HTTP behavior
- Outbox publication after commit
- Outbox recovery
- Worker retry semantics
- SMS provider failure

The immutable-ledger integration test also invokes Redis queue publication through the service but provisions only PostgreSQL. The CI workflow itself does not define a Redis service for that test. This makes the service-level suite dependent on connection failure timing at the default localhost Redis address.

No PR-triggered workflow run is visible for the latest commit, so I cannot independently confirm the stated verification result. This connector view does not establish whether a push-triggered run occurred.

---

# Updated status

| Area                            | Previous review | Current review |
| ------------------------------- | --------------: | -------------: |
| Single authoritative earn path  |            5/10 |       **9/10** |
| Ledger and credit-lot integrity |            7/10 |     **8.5/10** |
| Approval workflow               |            7/10 |     **7.5/10** |
| Public HTTP contract            |            6/10 |       **7/10** |
| Stable error contract           |            3/10 |       **3/10** |
| Idempotency correctness         |            7/10 |       **7/10** |
| Outbox/SMS implementation       |            3/10 |     **3.5/10** |
| Test coverage                   |          6.5/10 |       **7/10** |
| Production/pilot readiness      |          5.4/10 |       **6/10** |

### Overall estimates

- **Sprint 2 source implementation:** approximately **75–80%**
- **Sprint 2 verified exit-gate completion:** approximately **55–60%**
- **Full TRD MVP:** approximately **55–60%**
- **Pilot readiness:** approximately **40–45%**

The core earn transaction is now credible. The largest remaining work is not the financial write itself—it is making the surrounding contract, messaging and recovery behavior truthful and operational.

---

# Recommended next patch

## Gate 1 — Correct the outbox architecture

- Remove Redis publication from the financial transaction
- Add committed-row polling/claiming
- Add recovery for pending and failed events
- Add a launchable worker process
- Add SMS provider abstraction and delivery records
- Test transaction rollback versus queue publication

## Gate 2 — Finalize the API contract

- Add explicit `transactionId`
- Remove duplicate `id`/`receiptId` ambiguity
- Implement stable domain errors
- Align `smsStatus` with the documented state model
- Add canonical earn HTTP tests

## Gate 3 — Close approval and migration risks

- Migrate or block legacy pending receipts
- Revalidate current policy during approval
- Implement or explicitly defer approval expiry
- Handle old `/receipts` idempotency records

## Gate 4 — Complete financial edge-case tests

- Same-key concurrency
- Staff exclusion
- Approval-state revalidation
- Forced transaction rollback
- Constraint and trigger tests
- Leap-day expiry
- Positive receipt-amount database constraint

**Sprint 3 redemption should not begin until Gates 1–3 are complete.** Redemption will depend heavily on reliable balance state, error codes, worker recovery and exact policy execution; carrying these gaps forward will make FIFO redemption substantially harder to validate.
