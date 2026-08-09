Updated review: micahjatau/shopcity_LP

Executive verdict

The repository has made a meaningful step forward. The latest four commits revise the receipt-integrity gate, archive completed OpenSpec work and synchronize the OpenAPI contract. The latest commit is 66475be — docs: sync openapi contract.

The two previous blockers have largely been addressed:

Historical receipts now derive their POS identity from externalReceiptNumber.

Timestamp exceptions now require an explicit reason and generate a separate override audit event.

> Verdict: The repository is ready to begin ledger development on a fresh development database, but it is not yet safe for a shared or production migration without one final migration-verification patch.

---

Major improvements

1. Historical receipt migration is now conceptually correct

The migration now overwrites the old generated UUID with the previously stored physical receipt reference:

UPDATE "Receipt"
SET "posReceiptNumber" = "externalReceiptNumber"
WHERE "externalReceiptNumber" IS NOT NULL;

It aborts when a legacy row has no external reference and removes the obsolete column after backfilling.

This fixes the previous defect where random UUIDs would have been presented as physical POS receipt numbers.

2. Timestamp override is now explicit

Receipt capture now:

Trims and reads overrideReason.

Applies timestamp limits to every role.

Rejects cashiers outside the tolerance window.

Requires a reason from a privileged actor.

Emits a separate receipt.capture.override audit event.

This is substantially better than the previous implicit supervisor/admin bypass.

3. Monetary input is bounded

The DTO now enforces integer and safe-number boundaries, while the service applies the configured purchase approval ceiling.

The default approval threshold is 20,000,000 kobo, equivalent to ₦200,000.

4. Override and ceiling tests were added

The integration suite now verifies:

Cashier rejection for stale and future transactions.

Privileged stale-receipt override.

Presence of an override audit record.

Rejection of amounts above the configured ceiling.

---

Remaining findings

P0 for shared databases: blank legacy receipt references are still accepted

The migration rejects only:

"externalReceiptNumber" IS NULL

It does not reject:

''
' '

The old receipt DTO allowed an optional string without a minimum non-whitespace length, so such values are possible in historical data.

A whitespace-only legacy reference would become:

posReceiptNumber = ' '
normalizedPosReceiptNumber = ''

That is not a trustworthy physical receipt identity.

Required change

The migration guard should detect:

WHERE "externalReceiptNumber" IS NULL
OR BTRIM("externalReceiptNumber") = ''

The backfill should also use:

SET "posReceiptNumber" = BTRIM("externalReceiptNumber")

This is a small change, but it matters before running the migration against retained data.

---

P0 for deployment assurance: migration verification is still recorded as not run

The migration tracker still records both the original integrity gate and its follow-up as Not run.

The visible receipt integration suite starts from a completely fresh database and applies all migrations before creating receipt data.

That proves fresh installation, not upgrade safety.

Required upgrade test

A dedicated test should:

1. Apply migrations up to the old receipt-capture schema.

2. Insert a receipt with:

Generated receiptNumber

Real externalReceiptNumber

3. Apply the receipt-integrity migration.

4. Verify that the external value becomes posReceiptNumber.

5. Verify that the generated UUID and legacy column are removed.

6. Test null, blank, whitespace and normalized duplicate references.

Until this passes, the migration is suitable for a fresh database but not proven for a populated one.

---

P1: the override audit loses the initiating cashier

For an overridden receipt, the same privileged actor:

Captures the receipt.

Approves the exception.

Becomes capturedBy.

Becomes approvedByUserId.

This works when the supervisor personally enters the whole receipt. It does not accurately model the more likely workflow:

Cashier enters transaction
→ system requires approval
→ supervisor approves

In that workflow, the system should preserve:

requestedByUserId
capturedByUserId
approvedByUserId
overrideReason
approvalTimestamp

Otherwise, staff accountability is weakened because the supervisor appears to have originated the transaction.

---

P1: override audit fields are semantically duplicated

The override metadata currently records:

approvedOccurredAt: occurredAt,
originalOccurredAt: occurredAt,

Both fields contain the same submitted POS timestamp.

A clearer audit structure would be:

submittedOccurredAt
serverCapturedAt
violationType: STALE | FUTURE
allowedPastSkewMs
allowedFutureSkewMs
approvedByUserId
overrideReason
approvalTimestamp

There is no corrected occurrence time unless the supervisor actually changes it, so approvedOccurredAt does not currently add information.

---

P1: archived specification promises cross-branch overrides that do not exist

The archived specification says a supervisor may approve a stale or cross-branch capture.

The service rejects a wrong-branch device before reaching the override logic.

For ShopCity’s one-branch MVP, rejecting all cross-branch capture is safer. The appropriate fix is therefore probably to remove cross-branch override language from the specification rather than implement it now.

---

P1: high-value purchases are rejected, not approved

The configuration calls the limit an approval threshold, but the service rejects every amount above it regardless of role or override reason.

Current behaviour is effectively:

≤ ₦200,000 → allowed

> ₦200,000 → rejected for everyone

That is acceptable as a temporary pre-approval-module safeguard, but it should be described as a hard capture ceiling, not an approval threshold.

Once approvals are implemented:

Cashier above threshold → approval required
Supervisor approves → accepted and audited
No approval → rejected

---

P1: device attribution remains deletable/nullable

Receipt still defines:

deviceId: optional
onDelete: SetNull

The migration uses ON DELETE SET NULL on the composite tenant/device foreign key.

Because checkout device attribution is part of the fraud and reconciliation trail:

Devices referenced by receipts should not be hard-deleted.

ON DELETE RESTRICT is more appropriate.

Devices should be retired using status.

deviceId should eventually become non-null once legacy rows are reconciled.

---

P1: concurrency protection exists but is not proven

The database uniqueness constraint should protect simultaneous duplicate receipt capture, and the service handles a unique receipt error.

However, the visible tests submit duplicate receipt requests sequentially:

first request completes
second request starts

Add a genuine concurrent test:

await Promise.allSettled([
postReceipt(receipt, cashierA, 'key-a'),
postReceipt(receipt, cashierB, 'key-b'),
]);

Expected result:

one 201
one 409
one receipt row
one future earn operation

This test becomes mandatory once receipt capture creates financial ledger entries.

---

P1: Redis recovery is specified but not tested

The archived task list claims fail-closed and transient-disconnect recovery coverage.

The actual Redis integration test only verifies initial connection failure returning 503.

It does not test:

Redis available
→ Redis stops
→ request fails closed
→ Redis restarts
→ application recovers without restart

The runtime client has bounded reconnect behaviour, but the required recovery scenario remains unproven.

---

P2: OpenAPI error schemas remain generic

Every documented error response still uses examples equivalent to:

statusCode: 400
code: VALIDATION_ERROR
message: Validation failed

even for 401, 403, 404, 409 and 503 responses.

Before frontend implementation, introduce stable error codes such as:

RECEIPT_ALREADY_CAPTURED
IDEMPOTENCY_KEY_REUSED
DEVICE_NOT_ACTIVE
DEVICE_BRANCH_MISMATCH
RECEIPT_TIMESTAMP_TOO_OLD
TIMESTAMP_OVERRIDE_REQUIRED
PURCHASE_APPROVAL_REQUIRED
THROTTLE_INFRASTRUCTURE_UNAVAILABLE

---

Product status

The active application still ends at the receipt-capture foundation. The loyalty module is empty and is not wired into the active application.

There is also no queue dependency yet for SMS, expiration or reconciliation jobs.

The system still cannot:

Award the 2% store credit.

Create immutable ledger entries.

Create 12-month expiry lots.

Calculate a reconstructable balance.

Redeem credit.

Reverse earnings after refunds.

Send SMS.

Produce reward-liability reports.

---

Updated maturity assessment

Area Score

Architecture and organization 8.3/10
Authentication and security foundation 8.0/10
Receipt integrity 8.2/10
Test infrastructure 8.0/10
Migration safety 6.5/10
API contract maturity 6.8/10
Core loyalty functionality 2.5/10
Production readiness 4.8/10

---

Go/no-go decision

Fresh development database

Go for ledger development.

The receipt model is now sufficiently aligned to begin implementing the immutable earning path.

Populated shared or production database

No-go until:

1. Blank legacy references are rejected.

2. An old-schema upgrade test passes.

3. The migration tracker records successful verification.

4. Concurrent receipt capture is tested.

Recommended next implementation phase

The next feature change should be:

implement-immutable-earning-ledger

In this order:

1. Immutable LedgerEntry.

2. Unique receipt-to-earn relationship.

3. Deterministic 2% calculation using integer arithmetic.

4. Twelve-month CreditLot.

5. Reconstructable balance query.

6. Atomic receipt + earn + lot + audit transaction.

7. Concurrency tests.

8. Reversal entries without modifying original history.

The repository has finally moved beyond the broad receipt-architecture blocker. The remaining receipt work is a narrow deployment-safety patch rather than another redesign.
