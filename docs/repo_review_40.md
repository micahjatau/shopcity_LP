Repository re-review — current head

Repository: micahjatau/shopcity_LP
Current head: a263ae18c8ce87a58796421f873e6547e9e6c42a — “Close Sprint 3 review follow-ups”. It is one commit ahead of the head from my previous review.

Verdict

Assessment Previous Current

Redemption + FIFO + approvals 30/30 30/30
Reversals 23/25 17/25
Manual adjustments 20/20 20/20
Financial concurrency/invariants 9/10 10/10
Contracts/read models 9/10 9/10
Closure/CI evidence 3/5 3/5
Sprint 3 94/100 89/100
Formal Sprint 3 closure GO NO-GO

The score dropped despite the latest commit improving the code because I found a previously missed P1 financial-integrity defect in reversal accounting.

This is exactly why another review was worthwhile.

---

P1 — earn reversal can consume the wrong credit lot

This is the blocker.

The current earn-reversal path correctly checks that the original earn has a credit lot, that it hasn't expired, and that its balance is completely untouched. So far, good.

But once those checks pass, the reversal does not actually consume that specific original lot.

It creates the compensating debit and then invokes the generic FIFO allocator:

allocateDebit(
tenantId,
customerId,
amountKobo,
adjustmentId,
...
)

There is no constraint telling the allocator:

> debit original.creditLot.id and only that lot.

That code is visible in the earn reversal path.

The generic allocator then fetches all positive, unexpired credit lots belonging to the customer, sorts them by expiry date → earned date → ID, and consumes them FIFO. Its API supports excluding lots, but has no mechanism requiring one exact source lot.

Concrete failure case

Suppose the customer has:

Lot Source Remaining Expiry

A Earlier purchase ₦50 September
B Purchase being reversed ₦40 December

Lot B is completely unused, so the current reversal validation allows it to be reversed.

But the reversal then asks the generic allocator for a ₦40 debit.

FIFO sees Lot A first.

The resulting state can therefore become:

Lot A: ₦50 → ₦10

Lot B: ₦40 → ₦40

reversal ledger says it reverses the transaction that created Lot B

The customer's total balance falls by the correct ₦40, so a superficial balance test passes.

But the accounting provenance is wrong.

That creates four downstream problems:

the original earn being “reversed” still has its credit outstanding;

another unrelated earn was actually consumed;

liability ageing/expiry becomes wrong;

allocation evidence contradicts reversesEntryId.

This violates Issue #3's explicit requirement that earn reversal “consume only the remaining balance attributable to the original earn lot.”

It also conflicts with the TRD's requirement that reversal logic account for redeemed/expired credit and return review-required rather than compromise lot integrity.

The same defect exists for credit-adjustment reversal

A credit adjustment creates its own credit lot. When that credit adjustment is later reversed, the service again verifies the source lot but then sends the debit through the generic FIFO allocator instead of targeting that source lot specifically.

So this isn't just one branch. It is a shared reversal-source attribution flaw affecting:

EARN → debit reversal

ADJUSTMENT/CREDIT → debit reversal

---

Why the existing test doesn't catch it

There is a successful earn-reversal unit test, but it mocks allocateDebit() and simply makes the mock return the same lot-1 used by the original earn.

That proves orchestration.

It does not prove source-lot correctness with the real PostgreSQL FIFO allocator and multiple active lots.

I found no current integration test that creates, for example:

1. an older unrelated credit lot;

2. a later earn lot;

3. reverses the later earn;

4. proves that only the later earn's lot is reduced.

That is the exact adversarial scenario needed.

---

What the latest commit did fix

The latest changes are otherwise good and directly address the issues from the previous review.

Adjustment timestamp contract is fixed. effectiveAt is now explicitly required by the DTO/OpenAPI instead of appearing optional while runtime effectively required it. The service also explicitly validates and parses it.

Repeated reversal semantics are fixed. An already-reversed transaction now produces a dedicated 409 TRANSACTION_ALREADY_REVERSED, rather than falling into generic review-required behavior. The controller contract documents the same error.

Reversal read models are better. They now expose originalTransactionId, reversal reason, actor (createdBy) and restoration evidence. Tests specifically cover the special case where an earn reversal is internally represented as an adjustment debit while still exposing reversal semantics.

The missing cross-operation race test now exists. A ₦170 debit adjustment races a ₦45 redemption against a ₦200 balance; the test requires exactly one operation to succeed and proves the balance cannot be overdrawn.

That closes the concurrency evidence gap I identified previously.

---

P2 — generic money fields remain semantically muddy

getTransaction() currently derives:

creditKobo from any CREDIT ledger entry

redeemedAmountKobo from any DEBIT ledger entry

irrespective of transaction type.

Therefore:

a debit adjustment can have redeemedAmountKobo;

an earn reversal represented as ADJUSTMENT/DEBIT can have redeemedAmountKobo;

a redemption reversal credit can appear under creditKobo.

The explicit type, direction, adjustment, reversal, and ledger structures make the truth recoverable, so I don't regard this as financial corruption.

But it is poor contract semantics.

For Sprint 4 reporting and frontend work, either:

restrict creditKobo to actual earned credit and redeemedAmountKobo to actual redemption; or

deprecate both generic top-level fields and use ledger.amountKobo + type + direction.

I prefer the second model. It is harder to misunderstand.

---

Closure tracking is still messy

The archived Sprint 3 tracker is substantially improved, but still contains unchecked items including 8.4, 8.5, 9.4 and final validation/evidence gates 10.6–10.8.

At least one of those is demonstrably stale: 8.4 is already implemented. Public configuration exposes minimum redemption, basket cap, approval threshold and other frontend-safe policy values.

Issue #3 is also still open with its original checklist completely unchecked despite most of its implementation now existing.

So the repository has now reached the point where code state is ahead of project-management state.

That needs cleanup, but it is not the reason for my NO-GO.

---

Current CI evidence

I checked the current a263ae1 SHA.

The connector returns neither combined statuses nor a PR-triggered workflow run for this commit. Because that workflow endpoint only exposes certain run types, I cannot conclude CI failed—but I also cannot certify this SHA as fully green.

So the final “one immutable green SHA” criterion remains unverified, rather than failed.

---

Exact correction required

Do not redesign reversals again. The required fix is narrow.

1. Add exact-lot debit allocation

Extend the financial primitive with something equivalent to:

allocateDebitFromExactLot({
tenantId,
customerId,
creditLotId,
debitLedgerEntryId,
amountKobo,
adjustmentId,
now
})

Inside the transaction it should:

1. SELECT ... FOR UPDATE the specific source lot.

2. Verify tenant/customer ownership.

3. Verify it remains unexpired.

4. Verify the required amount is still available.

5. Create allocation evidence referencing that lot only.

6. Decrement that lot only.

Do not hack this by querying every other lot and passing them into excludedCreditLotIds. That is clever in the bad way.

2. Use it for both credit-source reversals

Replace generic FIFO allocation in:

unused EARN reversal;

CREDIT ADJUSTMENT reversal.

Ordinary redemption and ordinary debit adjustment should continue using FIFO.

3. Add two real integration tests

Earn reversal source-lot isolation

Create:

older lot A = ₦50;

newer earn lot B = ₦40;

reverse earn B.

Assert:

A remaining = ₦50
B remaining = ₦0
reversal allocation.creditLotId = B.id
reversesEntryId = earn-B.id

Credit-adjustment reversal source-lot isolation

Same structure, except B originates from a manual credit adjustment.

These need the real PostgreSQL allocator, not a mocked allocateDebit().

---

Revised score

The reason this gets a significant deduction is simple: lot provenance is part of the ledger, not cosmetic metadata.

A store-credit ledger must answer not merely:

> “Is the total balance right?”

but also:

> “Which credit still exists, when does it expire, and which transaction created or consumed it?”

Right now, this reversal edge case can answer the second question incorrectly.

Updated Sprint 3 score

89/100 — not formally closed.

I would not merge this into the growing pile of “minor cleanup.” This is the one remaining issue I would treat as a genuine Sprint 3 blocker.

Once exact-lot reversal allocation and the two multi-lot tests are added, assuming the full validation suite is green, I expect Sprint 3 to land around 97–100% and I would then close Issue #3 rather than review the entire architecture yet again.

Decision: fix this P1 before declaring Sprint 3 complete. Sprint 4 planning can continue in parallel, but the financial core should not be stamped 100% yet.
