Sprint 3 deep completion review

Repository: micahjatau/shopcity_LP
Reviewed head: afd81963e05dd5f16b00189f7b7eed2cbad8f122 — Fix CI static checks.

Final score: 92/100

Decision: PASS — Sprint 3 is complete enough to move to Sprint 4

Using the threshold we established earlier, I would stop treating Sprint 3 as an active development sprint. The core financial functionality required by the TRD is now implemented and the important financial invariants are present.

I would not call it a literal 100% yet, because there are a handful of closure/contract issues. They are materially different from the blockers we were finding in previous reviews: they do not undermine the core redemption, FIFO, approval, reversal, or adjustment engine.

The Sprint 3 plan itself defines the goal as online redemption, deterministic FIFO, concurrency safety, approvals, compensating reversals, manual adjustments, transaction history, notifications/audit/idempotency and financial tests.

Scorecard

Area Weight Score Verdict

Redemption + FIFO allocation 20 20 Complete
Supervisor approval workflow 15 15 Complete
Reversals 20 18 Functionally complete
Manual adjustments 15 14 Complete with small contract issue
Financial invariants + concurrency 15 14 Strong
API/read models/contracts 10 8 Mostly complete
Final verification/closure hygiene 5 3 Needs cleanup
Total 100 92 MOVE ON

---

1. Redemption and FIFO — 20/20

This part is complete.

The shared allocation engine uses serializable transactions, selects only positive unexpired lots, orders them deterministically by expiry/earn time/ID, locks them with FOR UPDATE, and conditionally decrements the remaining amount. This is exactly the architecture Sprint 3 needed to prevent double spending and preserve explainable FIFO accounting.

More importantly, this is no longer theoretical coverage. The integration suite includes actual concurrent redemption attempts against insufficient combined balance and verifies that only one succeeds and that the lot never goes negative.

The same integration suite also proves:

same-key redemption replay;

different-key duplicate receipt protection;

real high-value pending approval;

post-approval allocation;

transaction and customer-ledger allocation visibility.

That satisfies the principal Sprint 3 exit gate.

---

2. Supervisor approvals — 15/15

I consider this complete.

A real high-value redemption is created as PENDING_APPROVAL, appears in the approval queue, and is subsequently executed by a supervisor. The integration test verifies the resulting redemption, allocation, SMS and remaining balance.

There is also a genuine race test in which two supervisors attempt to approve the same redemption and only one financial execution succeeds. The code revalidates the current state and active balance before execution rather than trusting the originally captured state.

This fulfills the TRD's approval E2E requirement, one of the two explicit Sprint 3 exit conditions.

---

3. Reversals — 18/20

This is the area that improved most since the previous review.

The former broken earn-reversal branch is fixed. A safe unused earn now creates a compensating debit, carries reversesEntryId, allocates against the balance, emits SMS/outbox and audit evidence, and persists its idempotent response.

Redemption reversal is also implemented properly: it creates a credit reversal entry, restores the original allocations to their original lots, records immutable AllocationRestoration rows, marks the redemption reversed and preserves accounting history.

The dedicated reversal tests now cover missing keys, reason validation, idempotent replay, changed-payload conflict and a successful earn reversal.

There is also an HTTP-level concurrency test in which two simultaneous requests with the same reversal idempotency key return the same successful response.

Why I deducted two points

There are two semantic rough edges.

Earn reversal is represented internally as ADJUSTMENT/DEBIT, not REVERSAL/DEBIT. The linkage through reversesEntryId makes the accounting safe, but the transaction read model consequently identifies this transaction primarily as an adjustment rather than a reversal.

Also, a transaction that already has a reversal currently falls into REVERSAL_REVIEW_REQUIRED; Issue #3 anticipated a more specific TRANSACTION_ALREADY_REVERSED/conflict result.

Neither permits a second financial effect—the database also protects the reversal relationship—but the public semantics could be cleaner.

---

4. Manual adjustments — 14/15

Both sides now exist.

Credit adjustment creates:

immutable ADJUSTMENT/CREDIT ledger entry;

Adjustment aggregate with actor/reason;

new expiring credit lot;

reconstructed balance;

SMS/outbox intent;

audit;

idempotent response.

Debit adjustment creates ADJUSTMENT/DEBIT and passes the debit through the same FIFO allocation engine as redemptions.

The earlier policy problem has also been fixed. The client no longer chooses its own expiry duration; expiry comes from ADJUSTMENT_CREDIT_EXPIRY_MONTHS, and there is now a configured adjustment amount ceiling.

Tests verify both credit and debit flows and explicitly test the ceiling.

Remaining small defect

effectiveAt is declared optional in the DTO, but it has @IsDateString() without @IsOptional(). The global ValidationPipe does not enable skipMissingProperties.

So the API contract suggests the timestamp is optional while runtime validation effectively treats it as required.

Issue #3 actually says an effective timestamp should be required, so the best correction is simple: make it explicitly required in the DTO/OpenAPI rather than optional.

---

5. Financial integrity and concurrency — 14/15

This area is now strong enough for Sprint 3 closure.

At database level, the ledger commit validator enforces evidence appropriate to each financial type. Redemption debits must equal their allocations; debit adjustments require adjustment evidence and matching allocation totals; credit reversals must reference an original debit and restoration totals must equal the compensating amount.

The financial-invariant suite also verifies migration deployment and guards such as:

legal ledger type/direction pairs;

approval target XOR;

one reversal per original;

restoration evidence;

financial trigger/function presence.

The committed CI log shows financial-state-invariants.int-spec.ts passing after all 27 migrations were deployed.

The redemption suite additionally tests concurrent overlapping redemptions and concurrent approval execution.

The HTTP suite tests concurrent same-key adjustment and reversal replay.

One evidence gap

Issue #3 specifically requested a test where a manual debit adjustment races a redemption against the same balance.

I did not find that exact cross-operation test.

The implementation should still be safe because both commands converge on the same LotAllocationService locking and conditional decrement mechanism, but the precise adversarial test should eventually be added.

That is an evidence gap rather than an architectural gap.

---

6. Contracts and read models — 8/10

The stale generated-artifact problem from the previous review is fixed.

The current OpenAPI artifact has changed to a new blob, as has the generated Orval TypeScript client.

The transaction read model also stopped fabricating fake receipt/card values for receiptless transactions. Adjustment/reversal transactions now return nullable receipt-specific fields and explicit adjustment/reversal structures. The HTTP integration test verifies this behavior.

The remaining weakness is the debit-side reversal representation mentioned above. Because an earn reversal is stored as ADJUSTMENT/DEBIT, it does not naturally appear under the read model's reversal structure. Also, the read model does not consistently expose the reversal reason/actor expected by Issue #3.

I would correct that contract, but I would not hold Sprint 4 hostage to it.

---

7. CI and closure status — 3/5

This is why I cannot responsibly say 100%.

Your latest committed CI evidence shows:

> 19 of 20 integration suites passed; 99 of 100 tests passed.

One integration test was still failing in that recorded run.

At the same time, important Sprint 3 suites such as the financial-state invariant tests passed, and the migration chain successfully applied.

The latest commit is explicitly called Fix CI static checks, but the GitHub connector is not returning a current workflow run/status for that SHA, so I cannot independently certify that all jobs are currently green.

There is also documentation drift: the archived original Sprint 3 task file still shows sections 6–10 unchecked even though much of that work demonstrably exists in code, while the newer closure change marks its remediation tasks complete.

Issue #3 itself is likewise still open and completely unchecked.

That is now bookkeeping debt, not evidence that Sprint 3 is still 69% complete.

---

Final assessment

Sprint 3 functional completion: 92%

The hard engineering problem Sprint 3 was intended to solve has been solved:

Earn → credit lots → FIFO redemption → high-value approval → immutable allocation evidence → safe compensating reversal → manual adjustment now forms a coherent financial system.

The most important exit gate—no negative/overdrawn balance under concurrent redemption—has direct integration coverage. Approval execution has real E2E and race coverage. Reversals and adjustments are no longer placeholders. Database constraints independently enforce many of the financial assumptions.

What I would do now

1. Move development to Sprint 4.

2. Keep Issue #3 as a very small closure ticket containing only:

normalize reversal read semantics/reason;

make adjustment effectiveAt contract explicitly required;

add the redemption-vs-debit-adjustment race test;

obtain one fully green final CI run and then close Issue #3.

3. Update or supersede the stale archived Sprint 3 checklist so it stops suggesting that reversals and adjustments remain unimplemented.

I would not conduct another broad Sprint 3 architecture review after those corrections. Once those four items are done, this should be treated as 100% closed, not reopened with new Sprint 5 hardening criteria.
