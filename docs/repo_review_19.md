Review of the latest changes

Latest head: 72212fa872866f37e8b8bcd8ede8b2ff6c9c1eb8
Commit: fix: close sprint 2 financial integrity gaps

Verdict

This is a substantial and correctly targeted improvement. It resolves most of the blockers from the previous Sprint 2 review:

Receipt purchase fields are protected from update.

Positive receipt amounts are enforced in PostgreSQL.

Credit lots are validated against their source earn ledger entry.

Serialization conflicts are no longer automatically reported as duplicate receipts.

The API-envelope decision is documented.

Legacy financial endpoints are marked deprecated.

New unit and integration tests cover the closure work.

However, I would still mark Sprint 2 as:

> Code-complete pending one financial-integrity follow-up and visible CI evidence.

The main remaining problem is that the credit lot’s expiry, existence and remaining balance are still insufficiently protected.

---

What the changes fixed well

1. Receipt evidence protection is correctly implemented

The migration now:

Rejects existing non-positive receipt amounts before installation.

Adds a purchaseAmountKobo > 0 database constraint.

Prevents updates to receipt identity, customer, card, branch, device, amount, occurrence time and capture attribution.

Leaves approval and review metadata mutable.

The integration test confirms that changing the receipt amount fails while review metadata can still be updated.

This closes the previous receipt-mutation blocker.

2. Credit lots are now connected to their source ledger

The new trigger checks that a credit lot matches its ledger entry on:

Tenant.

Customer.

Original amount.

Earn timestamp.

EARN type.

CREDIT direction.

It also prevents later changes to the tenant, customer, ledger reference, original amount and earned timestamp.

The tests cover mismatched insertion and source-field mutation.

3. Earn conflict handling is much better

The earn operation now retries known transaction conflicts up to three times with jitter, then returns:

503 EARN_TRANSACTION_CONFLICT

Actual receipt uniqueness violations return:

409 RECEIPT_ALREADY_USED

Unit tests cover successful retry and exhausted retries.

4. API governance is no longer ambiguous

ADR 008 now formally establishes:

{success, data, meta} for success.

{success, error, meta} for errors.

/transactions/earn as the canonical earn route.

/approvals/{id}/decision as the canonical approval route.

Receipt-specific financial endpoints as deprecated compatibility routes.

The deprecated routes are also marked in generated OpenAPI.

---

Remaining findings

P0 — Credit-lot expiry is still mutable and unvalidated

The new credit-lot trigger validates earnedAt, but it does not validate or protect expiresAt.

That means a direct database update can:

Extend credit beyond 12 months.

Shorten valid customer credit.

Change ShopCity’s outstanding liability.

Break the TRD’s exact expiry rule without creating a ledger event.

The immutable-field check includes tenant, customer, ledger reference, original amount and earned timestamp—but omits expiry.

The Prisma model exposes expiresAt as a normal mutable field.

Required correction

Add a follow-up migration that:

1. Validates on insert that expiresAt equals the approved twelve-month calculation from earnedAt.

2. Prevents subsequent modification of expiresAt.

3. Adds a regression test attempting to change the expiry date.

This should block Sprint 2 closure.

---

P0 — Credit lots can still be deleted

The database ensures at most one credit lot per earn ledger entry, but it does not ensure that the lot continues to exist.

A credit lot can be deleted while its immutable ledger entry remains. The relationship’s onDelete: Restrict prevents deleting the ledger while a lot references it; it does not prevent deleting the lot itself.

Deleting a lot would:

Remove the customer’s available balance.

Leave the earn ledger entry intact.

Break ledger-to-lot reconciliation.

Violate the Sprint 2 claim that each confirmed earn has exactly one credit lot.

Required correction

Add a BEFORE DELETE trigger on CreditLot.

Future corrections should occur through:

Redemption allocations.

Expiry debit entries.

Reversal entries.

Administrative compensating entries.

They should never delete an earned lot.

A similar receipt delete trigger would make the “immutable receipt evidence” rule explicit, particularly for pending or rejected approval receipts.

---

P1 — remainingAmountKobo is not actually “controlled”

The OpenSpec describes the remaining balance as “controlled mutable state.”

But the current database allows any update as long as the new amount is:

0 <= remainingAmountKobo <= originalAmountKobo

The integration test directly decreases the lot balance without creating:

A debit ledger entry.

A redemption allocation.

An expiry event.

A reversal.

An audit record.

That is mutable, but not controlled.

Best closure strategy

Until Sprint 3 introduces redemption allocations, temporarily block changes to remainingAmountKobo.

Sprint 3 can then replace that temporary freeze with a controlled transaction that atomically creates:

1. Debit ledger entry.

2. Redemption allocation.

3. Lot balance reduction.

4. Audit entry.

5. Outbox event.

This avoids entering Sprint 3 with an already-unreconciled balance model.

---

P1 — The serialization-conflict classifier is too broad

The code classifies all of these as retriable transaction conflicts:

['P2028', 'P2031', 'P2034']

It also retries any generic error whose message contains the word transaction.

Prisma documents:

P2028 as a general transaction API error.

P2031 as a MongoDB replica-set requirement.

P2034 as the write-conflict/deadlock error that should be retried.

The repository uses PostgreSQL, so P2031 does not belong here. Retrying arbitrary P2028 and message-matched errors could conceal deterministic programming or timeout failures.

Required correction

Retry only clearly retriable errors:

error.code === 'P2034'

Additional retry cases should be added only when supported by a demonstrated PostgreSQL failure and a regression test.

---

P1 — OpenAPI still does not expose endpoint-specific stable errors

The documentation now lists:

RECEIPT_ALREADY_USED

EARN_TRANSACTION_CONFLICT

But the earn controller still applies only a generic error decorator.

The shared OpenAPI error schema uses the same generic example for every error response:

{
"statusCode": 400,
"code": "VALIDATION_ERROR",
"message": "Validation failed"
}

Therefore, generated frontend clients cannot discover from OpenAPI that:

Duplicate receipts return RECEIPT_ALREADY_USED.

Exhausted concurrency retries return EARN_TRANSACTION_CONFLICT.

Idempotency conflicts return IDEMPOTENCY_CONFLICT.

Required correction

Add endpoint-specific error examples or schemas for the earn endpoint, especially:

HTTP Stable codes

400 SESSION_DEVICE_REQUIRED, DEVICE_NOT_ACTIVE, validation errors
404 CARD_NOT_FOUND
409 RECEIPT_ALREADY_USED, IDEMPOTENCY_CONFLICT
422 Policy and approval errors
503 EARN_TRANSACTION_CONFLICT, DEPENDENCY_UNAVAILABLE

The ADR resolves the envelope shape, but the endpoint error contract is not yet frontend-complete.

---

P2 — Deprecation has no retirement mechanism

The legacy routes are marked deprecated in OpenAPI, but there is no:

Removal date.

Deprecation response header.

Sunset response header.

Usage telemetry.

Migration deadline.

Keeping them temporarily is reasonable, but “temporarily” needs an exit rule.

A practical target would be to remove them before completing Sprint 3, provided no frontend client depends on them.

---

Process and release evidence

The repository records extensive local verification:

Unit tests.

E2E tests.

Fourteen integration suites and 67 tests.

Migration deployment.

OpenAPI lint and diff.

Typecheck.

Architecture check.

API and worker builds.

However:

The migration tracker still says the final CI evidence is pending until commit and push, even though commit 72212fa now exists remotely.

No pull-request workflow run was returned for the latest commit.

Issue #1 remains open and its original checklist remains unchecked.

OpenSpec task 6.4 says the issue checklist was reconciled, but the issue body was not actually updated.

The local evidence is encouraging, but the formal release record is inconsistent.

---

Revised Sprint 2 decision

Area Status

Atomic earn workflow Complete
Receipt update immutability Complete
Positive receipt constraint Complete
Ledger append-only protection Complete
Lot-to-ledger source validation Mostly complete
Credit-lot expiry integrity Incomplete
Credit-lot deletion protection Incomplete
Controlled remaining balance Incomplete
Serialization retry Mostly complete
API governance decision Complete
Endpoint-specific OpenAPI errors Incomplete
Visible CI evidence Unverified
Issue/checklist closure Incomplete

Release verdict

Sprint 2 should not be reopened for another broad refactor. It needs one small, focused follow-up:

sprint-2-credit-lot-lifecycle-closure

Scope:

1. Make expiresAt derived and immutable.

2. Prevent credit-lot deletion.

3. Temporarily freeze remainingAmountKobo until Sprint 3.

4. Narrow retries to confirmed retriable PostgreSQL/Prisma conflicts.

5. Add endpoint-specific OpenAPI error examples.

6. Record the remote CI evidence.

7. Update and close Issue #1.

After that change is green, Sprint 2 can be closed confidently and Sprint 3 implementation can begin.
