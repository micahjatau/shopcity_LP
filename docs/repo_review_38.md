Repository review — TRD Sprint 3

Reviewed head: 3acabda56e403d0283ea37333a469543baf676a7 — chore: touch ci workflow.

Current Sprint 3 score: 82/100

Decision: Do not move to Sprint 4 yet

The repository has made substantial progress: reversals and manual adjustments now exist, but it has not crossed the agreed 90% threshold. This needs one focused closure pass—not another architectural review.

---

Scorecard

TRD/Issue #3 area Weight Score

Existing redemption, FIFO and approvals 30 29
Reversal execution 25 16
Manual credit/debit adjustments 20 17
Financial safety and concurrency evidence 10 7
API contracts and read models 10 6
Documentation and final CI evidence 5 2
Total 100 82

Issue #3 requires working earn and redemption reversals, manual credit/debit adjustments, truthful read models, concurrency tests, regenerated contracts and a green final SHA.

---

Blocking findings

1. Earn reversal is currently broken

This is the main blocker.

The EARN branch:

1. Validates that the original lot is unused.

2. Decrements the credit lot.

3. Builds the allocation response.

But it does not create the compensating reversal ledger entry, notification, audit event, idempotency response or return value. After leaving the branch, execution reaches:

throw reviewRequired('Transaction type cannot be reversed automatically');

The transaction therefore rolls back and a perfectly safe unused earn cannot be reversed.

The reversal unit tests do not detect this because they only cover:

missing idempotency key

empty reason

unknown transaction

There is no successful earn-reversal test.

Required correction

Complete the EARN branch exactly as the credit-adjustment reversal branch is completed:

create a REVERSAL/DEBIT ledger entry

set reversesEntryId

persist SMS/outbox

write audit evidence

persist idempotency response

return 201

Add a real integration test that proves the original earn remains unchanged and the lot becomes zero.

---

2. Adjustment expiry is client-controlled

The documented policy says the manual-credit expiry is configured server-side through:

ADJUSTMENT_CREDIT_EXPIRY_MONTHS=12

However, the DTO accepts expiryMonths from the caller, from 1 to 120 months.

The service then prefers that submitted value over the server configuration:

const expiryMonths =
dto.expiryMonths ??
configService.get('ADJUSTMENT_CREDIT_EXPIRY_MONTHS') ??
12;

That makes a financial policy client-selectable. An administrator could submit a 10-year expiry even though the configured ShopCity policy is 12 months.

Required correction

Remove expiryMonths from the public DTO. Always derive expiry from the validated server configuration.

Also add the adjustment amount ceiling required by Issue #3. Currently, the only upper limit is JavaScript’s Number.MAX_SAFE_INTEGER; no business ceiling is applied.

---

3. The transaction read model is still misleading

Receiptless adjustments and reversals can now be returned, which is an improvement. But the implementation fabricates receipt-related fields:

receiptId = ledgerEntry.id
cardSerialNumber = ledgerEntry.id
posReceiptNumber = ledgerEntry.correlationId
purchaseAmountKobo = ledgerEntry.amountKobo
captureStatus = 'CAPTURED'
reviewStatus = 'APPROVED'

An adjustment has no physical receipt, card serial number or POS receipt number. Returning generated substitutes makes the response structurally convenient but factually incorrect.

The same read model loads adjustment, but does not actually expose:

adjustment ID

adjustment kind

adjustment reason

actor

reversesEntryId

original transaction ID

reversed-by transaction

reversal reason

These were specifically required by Issue #3.

Required correction

Make receipt-specific fields nullable for receiptless transaction types and add an explicit transaction-type detail object, for example:

adjustment: {
id,
kind,
reason,
createdBy,
}

reversal: {
originalTransactionId,
reason,
restorations,
}

Do not place ledger IDs or correlation hashes into receipt/card fields.

---

4. Rejected redemptions are incorrectly audited as expired

The redemption rejection branch writes three audit events:

redemption.rejected

redemption.expired

redemption.approval.reject

The middle event is false: a rejected redemption has not expired.

This corrupts the audit history and could later inflate expiry reports or confuse investigations.

Required correction

Remove redemption.expired from the rejection branch. Keep it only in the actual approval-expiry branch.

---

5. OpenAPI and generated client are stale

The committed OpenAPI file has the same blob SHA at the previous head and current head:

Previous: 6da4c8d72008e2b9662ceed90b2c4a8b478b43c6

Current: 6da4c8d72008e2b9662ceed90b2c4a8b478b43c6

The generated frontend client is also unchanged:

Previous: 85d04922f931c59c5d374ccf994eb070fe84f88c

Current: 85d04922f931c59c5d374ccf994eb070fe84f88c

Yet the repository has added an adjustment controller and changed reversal from unavailable to successful 201. The committed API contract therefore cannot represent the current runtime.

The CI workflow regenerates both files and then requires a clean Git diff. Consequently, once the static workflow runs correctly, this head should fail the generated-artifact checks.

Required correction

Run and commit:

npm run openapi:export
npm run client:generate
npm run openapi:lint
npm run openapi:diff
npm run client:typecheck

The adjustment OpenAPI response should document the complete response—not only { id }. The current controller schema exposes only an ID despite returning balances, allocations, credit-lot details and SMS status.

---

Testing assessment

What is good

Credit and debit adjustment unit paths exist.

Debit adjustments reuse the locked FIFO allocation service.

Redemption and adjustment reversals use immutable compensation.

Allocation-restoration and single-reversal database constraints are tested.

Financial SQL triggers are checked after migration deployment.

The integration test configuration includes all *.int-spec.ts files.

What remains

The tests required to declare 100% are still missing:

successful earn reversal

successful redemption reversal through the service/API

second simultaneous reversal

idempotent reversal replay

changed-payload idempotency conflict

adjustment HTTP success

insufficient-balance debit adjustment

concurrent redemption versus debit adjustment

rollback when audit/outbox/idempotency persistence fails

truthful read-model assertions for adjustments and reversals

The current HTTP reversal test only attempts to reverse a nonexistent transaction and expects 404; it does not exercise a successful reversal.

---

What is already accepted

These areas should not be reopened:

FIFO lot allocation

serializable online redemption

non-negative balance protection

redemption policy

pending approval behaviour

supervisor approval/rejection

approval execution

immutable allocation and restoration foundations

manual credit adjustment structure

manual debit adjustment structure

redemption reversal structure

The core architecture is good. This is now a correctness-and-closure task.

---

Exact route to 100%

Complete these five packages of work:

1. Repair earn reversal and add successful service, HTTP and integration tests.

2. Make adjustment policy server-authoritative by removing caller-controlled expiry and adding the configured amount ceiling.

3. Correct the read model and audit events, including the false rejection-expiry event.

4. Regenerate and commit OpenAPI/client artifacts with complete schemas.

5. Add the missing concurrency/idempotency tests and obtain one green immutable SHA.

After those changes, the expected score is approximately 96–100%, and Sprint 3 can be closed without another broad review.
