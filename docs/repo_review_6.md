Updated review: micahjatau/shopcity_LP

Executive verdict

The repository is now cleaner and easier to validate, but the latest work does not close the remaining receipt-integrity risks.

Since the previous review, the new commits primarily address formatting, lint failures, integration-test teardown and documentation synchronization. The latest commit is 34cae12 — docs: sync agent and readme guidance; the preceding commits focus on stabilizing the CI harness rather than implementing new product functionality.

> Current decision: the pre-ledger gate is still not completely closed.

The immutable ledger can be designed, but I would not merge or deploy ledger work on top of the current migration and override behaviour.

---

What improved

1. Integration-test infrastructure is better

The authentication and receipt suites now:

Use typed Nest application references.

Use disposable PostgreSQL and Redis containers.

Close the app, Prisma client, Redis container and PostgreSQL container explicitly.

Avoid the earlier host-Redis dependency.

Use typed response bodies instead of broad unsafe access.

The receipt suite also has deterministic setup and teardown around its Redis and database resources.

This is meaningful progress. It should reduce flaky local and CI validation.

2. Generated OpenAPI documentation is synchronized

The generated OpenAPI artifact now contains the receipt-capture endpoint, required idempotency header, request DTO and structured success response.

Previously, the implemented endpoint and committed API artifact had drifted apart.

3. Receipt duplicate tests remain strong

The current integration suite covers:

Same request and same idempotency key.

Same receipt with a different idempotency key.

Same receipt submitted by another cashier.

Same receipt used with another card.

Same receipt number in a different weekly sequence.

Wrong-branch, missing and inactive devices.

Future and stale cashier timestamps.

---

P0: the receipt migration remains incorrect

This remains the strongest blocker.

Previous receipt behaviour

The old receipt service generated a random UUID for receiptNumber and stored the actual printed POS reference separately as externalReceiptNumber.

The earlier migration explicitly added externalReceiptNumber as its own column.

Current migration behaviour

The receipt-integrity migration simply renames the old generated UUID column:

ALTER TABLE "Receipt"
RENAME COLUMN "receiptNumber" TO "posReceiptNumber";

It then generates the normalized POS receipt identity from that renamed value.

Therefore, any existing receipt row will have:

posReceiptNumber = previously generated random UUID

rather than:

posReceiptNumber = previous externalReceiptNumber

The real historical POS reference remains stranded in externalReceiptNumber.

Why fresh-database tests do not reveal it

The current tests run prisma migrate deploy against a newly created PostgreSQL container and insert receipts only after every migration has completed. They do not populate an old-schema receipt before applying the integrity migration.

The migration tracker still records the receipt-integrity migration’s backup/restore check as not run.

Required resolution

There are two acceptable approaches.

Development database contains no valuable receipts

Replace or squash the migration before any shared deployment. Build the final receipt table directly with the correct columns.

Existing receipt rows must be retained

Use an expand-and-contract migration:

1. Add a new nullable posReceiptNumber.

2. Backfill it from externalReceiptNumber.

3. Quarantine rows whose external number is missing.

4. Detect normalized duplicate receipt identities.

5. Populate normalizedPosReceiptNumber.

6. Add the uniqueness constraint.

7. Drop the generated receiptNumber.

8. Drop externalReceiptNumber.

9. Make the new field non-null.

Until this is corrected, the migration chain is safe only for a fresh database.

---

P0: supervisor and administrator timestamp bypass remains implicit

The timestamp function still returns immediately for every role except cashier:

if (role !== UserRole.CASHIER) {
return;
}

This means supervisors and administrators can submit:

Arbitrarily old transactions.

Future transactions.

Transactions assigned to another receipt week.

There is no:

Override flag.

Override reason.

Approval record.

Linked supervisor action.

Dedicated override audit event.

The resulting audit action remains only receipt.capture.

Documentation now overstates the implementation

The README says:

> “stale timestamps require an audited supervisor path.”

That path does not currently exist.

This is now both an implementation defect and documentation drift.

Recommended immediate policy

Until the approvals module exists, apply timestamp limits to all human roles.

Later, introduce an explicit override operation with:

overrideReason
originalOccurredAt
approvedOccurredAt
approvedByUserId
approvalTimestamp

and a distinct audit action such as:

receipt.capture.override

---

P1: the device relation still permits loss of audit history

The receipt model keeps deviceId nullable and uses onDelete: SetNull.

The SQL migration applies ON DELETE SET NULL to a composite relationship involving both tenantId and deviceId.

Financial receipt history should not lose device attribution because an administrator deletes a terminal.

Use:

deviceId: required
onDelete: Restrict

Devices should be retired through status changes such as INACTIVE or RETIRED, not deleted once referenced by transactions.

---

P1: the actual device is not authenticated

The API requires a valid active deviceId, but it accepts that ID from the request body. The service only confirms that the device belongs to the tenant and branch.

A cashier can still submit another active terminal’s device ID within the same branch.

The stronger model is:

Login/enrollment
→ session bound to device
→ receipt derives deviceId from session

Possible implementations include:

Signed device credential.

Device enrollment token.

Trusted device cookie.

Session-level deviceId.

Separate POS terminal authentication.

The frontend should not be authoritative for its own device identity.

---

P1: receipt validation remains outside the financial transaction

The service validates device, branch, card and customer status before starting the Prisma transaction.

The transaction begins only after the duplicate pre-check.

Between validation and insertion:

A card could be blocked.

A customer could be suspended.

A branch could be disabled.

A device could be retired.

When the earning ledger is introduced, eligibility checks must occur inside the same transaction as:

receipt
ledger entry
credit lot
audit event
notification outbox

Otherwise a transaction can earn credit using stale eligibility state.

---

P1: concurrency is database-protected but not explicitly tested

The database unique constraint should prevent simultaneous physical-receipt reuse, and the service catches a unique receipt conflict.

However, the receipt tests submit duplicates sequentially.

Add a test that starts two requests at the same time with:

Same physical receipt.

Different idempotency keys.

Different cashiers or cards.

Expected result:

1 × 201
1 × 409
1 receipt row

This becomes especially important once receipt capture also creates ledger entries.

---

P1: money input needs a safe upper boundary

purchaseAmountKobo currently requires only an integer greater than zero.

The response converts a database BigInt back to a JavaScript Number.

For normal supermarket baskets this will not overflow, but a financial API should explicitly enforce:

Number.isSafeInteger.

A configurable maximum basket.

Supervisor approval above the high-value threshold.

A domain error for values outside operational expectations.

A reasonable MVP capture ceiling could be set above ShopCity’s legitimate high basket while still blocking absurd or unsafe values.

---

P1: idempotency infrastructure is still unfinished

The idempotency schema has:

PENDING

COMPLETED

expiresAt

but no tenant relationship or actor foreign key.

Receipt capture:

Creates the record directly as COMPLETED.

Does not consider whether expiresAt has passed.

Has no visible cleanup worker.

Uses a raw endpoint string as operation scope.

Before this infrastructure is reused for redemption and adjustments:

1. Add tenantId.

2. Add a tenant-aware actor relationship.

3. Define a real pending/completed lifecycle or remove PENDING.

4. Ignore expired records.

5. Add cleanup processing.

6. Use a stable operation identifier rather than only a route string.

---

P1: OpenAPI error contracts remain misleading

All documented error responses use the same generic schema:

statusCode: 400
code: VALIDATION_ERROR
message: Validation failed

even when the actual response is 401, 403, 404, 409 or 503.

This weakens:

Generated frontend clients.

Error-specific UI handling.

Contract tests.

API review quality.

Parameterize the error envelope by status and domain code.

Examples:

409 RECEIPT_ALREADY_CAPTURED
409 IDEMPOTENCY_KEY_REUSED
400 DEVICE_BRANCH_MISMATCH
400 RECEIPT_TIMESTAMP_TOO_OLD
503 THROTTLE_INFRASTRUCTURE_UNAVAILABLE

---

P2: CI process documentation is ahead of observable evidence

The active CI-fix task list marks typecheck, lint and integration testing as complete.

However:

The change remains under the active openspec/changes directory rather than being archived.

No PR-triggered workflow run is visible for the latest commit through the connected GitHub data.

The integration harness still uses runtime jest.requireActual, despite its specification describing static module imports.

This does not prove the tests are failing, but the repository should avoid claiming the CI gate is complete until a recorded green workflow exists.

---

Product completeness remains unchanged

The active application still includes only foundation modules:

Authentication

Users

Branches/devices

Customers

Cards

Receipts

Audit

Configuration

The loyalty module remains empty.

The dependency list still has Redis but no BullMQ or equivalent queue system for:

SMS jobs

Expiry processing

Retry queues

Reconciliation jobs

Dead-letter handling

The backend still cannot:

Award the 2% store credit.

Reconstruct customer balances.

Create 12-month expiry lots.

Redeem credit.

Reverse earned credit.

Handle refunds.

Record supervisor approvals.

Send SMS.

Produce liability reports.

The README appropriately calls the repository a backend foundation, which is accurate.

---

Updated maturity assessment

Area Current score

Architecture and organization 8.2/10
Authentication and session security 8.0/10
Receipt API integrity 7.2/10
Test harness quality 8.0/10
OpenAPI completeness 6.5/10
Database migration safety 4.5/10
Core loyalty implementation 2.5/10
Production readiness 4.2/10

---

Recommended next change

Create one final pre-ledger change:

close-receipt-ledger-readiness-gate

It should:

1. Correct or replace the receipt migration.

2. Remove the implicit privileged timestamp bypass.

3. Implement or defer an explicit audited override.

4. Make receipt-device history non-null and delete-restricted.

5. Add simultaneous duplicate-receipt testing.

6. Add old-schema-to-new-schema migration testing.

7. Add Redis runtime disconnect-and-recovery testing.

8. Add safe monetary limits.

9. Correct OpenAPI error schemas.

10. Record a successful migration and CI run.

Final decision

The CI and documentation work improves maintainability, but it does not resolve the two critical findings from the previous review.

Do not mark the pre-ledger phase complete yet. Once the migration and timestamp override are corrected and verified, the repository will be ready to proceed to the immutable earning ledger, credit lots and reconstructable balance model.
