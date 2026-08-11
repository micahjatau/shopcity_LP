ShopCity repository review — latest head

Current head: b15fd982294dcdb327aa5ccaa206bf3d3ba11d26 — fix: isolate fraud behavior in jobs layer.

This is 3 commits beyond the 90% implementation-plan baseline.

Verdict

Area Previous Current

Sprint 3 functional 98/100 98/100 — PASS
Offline sync core 27/30 27/30
Offline conflict/concurrency 4/10 5/10
Fraud detection/review 10/20 15/20
Reporting/read models 14/20 14/20
Reports/exports 8/10 8/10
Contracts/docs 4/5 3/5
CI/migration/regression 1/5 2/5
Sprint 4 68/100 74/100

Decision: NO-GO for Sprint 5.

The repository has made meaningful progress, particularly in behavioral fraud and duplicate-race handling, but it has not reached the 90% gate. More importantly, three of the move-on P1 correctness gates remain open.

---

What improved

1. Database-level duplicate receipt races are now handled much better

Both earn and redemption now preserve context while the financial transaction runs. If PostgreSQL ultimately rejects a racing duplicate receipt, the catch path re-queries the winning receipt and records duplicate-attempt evidence before returning RECEIPT_ALREADY_USED.

There is now real concurrent redemption coverage verifying one transaction wins and duplicate audit/fraud evidence survives.

This closes a substantial part of the earlier duplicate-evidence problem.

---

2. All six behavioral fraud categories now have actual implementations

The repository now has logic for:

FR-CARD-001

FR-CASH-001

FR-ROUND-001

FR-REV-001

FR-REPL-001

FR-AUTH-001

and a real PostgreSQL/Testcontainers integration test demonstrates all six can be produced from source data and that below-threshold cases are suppressed.

Card replacement now emits fraud work in the same transaction as replacement. Failed attributable logins persist audit evidence and fraud work while still returning the generic Invalid credentials error. Reversal execution also emits fraud.evaluate alongside its SMS intent.

That's a genuine improvement.

---

3. Reporting materialization has some concurrency protection

The materializer now executes source reads and read-model replacement inside a transaction and obtains a PostgreSQL advisory transaction lock.

This is better than the previous unprotected materializer.

However, the lock is not scoped correctly for all same-tenant cases, discussed below.

---

P1 — approval-required transactions still bypass fraud evaluation

This was the first task in the 90% plan, and it is still open.

For high-value earn, once the purchase crosses the approval threshold the code:

1. creates the receipt;

2. creates the approval;

3. persists idempotency/audit;

4. returns PENDING_APPROVAL.

There is no fraud.evaluate event before that return. The fraud event exists only in the immediate-confirmation path later in the function.

Approval execution does not repair this. It creates:

ledger;

credit lot;

SMS outbox;

SMS record;

receipt/approval updates;

but still no fraud event.

The integration test reinforces that fact: after approving the high-value earn, it expects only one outbox row for the receipt—the SMS event.

The same problem exists with redemption. A redemption requiring approval returns before the fraud.evaluate creation reached by immediately confirmed redemptions.

Consequence

FR-HV-002 and particularly FR-HV-003 are not reliably connected to the actual transactions that cross their approval thresholds.

Required fix: enqueue fraud.evaluate inside the initial pending-approval transaction for both earn and redemption.

---

P1 — fraud processing is still not atomically replay-safe

The latest source still performs:

load event
↓
mark PUBLISHED
↓
evaluate fraud
↓
mark COMPLETED

The actual fraud findings are persisted in their own separate transaction, and an existing flag does:

occurrenceCount: { increment: 1 }

Therefore:

FraudFlag commit succeeds
↓
worker crashes
↓
COMPLETED write never happens
↓
same event retries
↓
occurrenceCount increments again

There is also still no early:

if (event.status === 'COMPLETED' || event.processedAt) return;

before the worker changes the event back to PUBLISHED.

The worker test proves a successful evaluation eventually becomes completed, but does not test completed-event redelivery or failure between the fraud commit and completion write.

Required fix

Lock the OutboxEvent row and do:

check processedAt +
fraud flag upserts +
COMPLETED/processedAt update

inside one PostgreSQL transaction.

Until that is done, infrastructure retries can fabricate fraud occurrence counts.

---

P1 — historical report materialization is still not historical

The OpenSpec now claims:

> [x] Reconstruct reporting snapshots from as-of authoritative source evidence.

The implementation does not do that.

loadSourceData() still loads current mutable fields:

CreditLot.remainingAmountKobo;

current Redemption.status;

current SmsMessage.status;

current Approval.status;

and merely excludes rows whose creation/request/effective timestamp is later than asOf. It does not load allocations/restorations or lifecycle timestamps necessary to reconstruct earlier state.

For example:

Aug 1 Earn creates ₦200 lot
Aug 10 Customer redeems ₦100
Today remainingAmountKobo = ₦100

Report asOf Aug 5

The materializer still sees today's ₦100 remainingAmountKobo, even though the correct Aug 5 liability was ₦200.

The planned report-snapshot implementation does not exist; repository search only finds its mention in the plan.

This means the current asOf implementation is a row cutoff, not a true historical snapshot.

---

P1/P2 — same-tenant materializer locking is incomplete

The advisory-lock work is directionally correct, but the lock key is:

`${tenantId}:${branchId ?? 'TENANT'}`

Therefore:

tenant rebuild → lock tenant:TENANT
branch rebuild → lock tenant:branch-1

They are different locks, so the two jobs may run concurrently.

But a tenant rebuild calls deleteTenantRows(), which deletes all reporting rows for that tenant, including branch reporting rows.

So:

Branch rebuild inserts branch rows
↕ concurrently
Tenant rebuild deletes all tenant rows

can still produce order-dependent output.

The 90% plan specifically called for one tenant-level lock covering both tenant and branch materializations. There is still no materializer concurrency integration test; search finds only the planned test, not an implementation.

Fix: use one lock key derived from tenantId only.

---

Reporting semantics still have two concrete bugs

Customer performance still counts unconfirmed activity

Current code does:

const customerRedemptions = redemptions.filter(
redemption => redemption.customerId === customer.id
);

visitCount =
customerEarnEntries.length +
customerRedemptions.length;

lastActivityAt = latestDate([
...earnDates,
...customerRedemptions.map(r => r.requestedAt),
]);

So a:

pending redemption;

rejected redemption;

expired approval;

can increase visitCount and reset dormancy.

That directly contradicts the checked OpenSpec claim that customer performance now counts confirmed financial activity only.

Customer activity should be driven by confirmed ledger entries, not redemption requests.

Duplicate-attempt reports are still historically unstable

Cashier reporting still reads the mutable FraudFlag.occurrenceCount and even excludes resolved duplicate flags.

Therefore:

later duplicate attempts can leak into an earlier asOf;

resolving a fraud flag can make earlier duplicate-attempt counts disappear.

The report should count append-only RECEIPT_DUPLICATE_ATTEMPT_RECORDED audit observations at or before the watermark.

---

Behavioral fraud has a production/testing split

This latest commit creates:

Production worker path

src/jobs/fraud-behavior.runtime.ts

But the large integration test exercises:

Feature-module path

src/modules/fraud/fraud-behavior.service.ts.

The worker imports and runs FraudBehaviorRuntime, not the integration-tested FraudBehaviorService.

The two implementations currently contain a lot of duplicated logic. Compare the module service with the jobs runtime: both independently implement queries, threshold handling, medians, rule construction and dedupe semantics.

That's undesirable because the strongest fraud integration test is not directly testing the code production actually executes.

There are already semantic problems

FR-CARD-001 dedupes only by card ID:

FR-CARD-001:<cardId>

while describing a daily rule.

So Monday's high-use case and Tuesday's high-use case collapse into one logical flag instead of card + local-day window.

Meanwhile cashier/rounded rules use the triggering receipt's timestamp as their window key, even though their queries operate over an entire branch-local day. Multiple triggering receipts in one day can therefore produce separate logical flags for the same daily anomaly.

This isn't enough to discard the behavioral implementation, but it prevents awarding full fraud credit.

---

Report refresh has become non-durable again

The refresh endpoint now gets its asynchronous 202 semantics by doing:

void this.scheduleRefresh(...).catch(() => undefined);

That means the HTTP request returns quickly, but the work is just a detached in-process promise.

If the API process exits, restarts or is redeployed, the refresh request can disappear.

That should eventually be a durable queue/outbox job. It's not a 90%-gate P1, but it is not robust enough to call the reporting refresh complete.

---

Offline acceptance has not advanced enough to support the checked tracker

The new OpenSpec says the offline conflict matrix and duplicate boundary coverage are complete.

However, searches for acceptance-only outcomes such as SYNC_ACTOR_MISMATCH and SYNC_RECORD_EXPIRED still surface implementation/docs rather than corresponding integration tests.

And the dedicated duplicate-receipt-race test from the 90% plan still does not exist as a file; only the plan mentions it.

Some duplicate race evidence was successfully added to existing Sprint 3 integration files, which is why I raised conflict/concurrency from 4 → 5, but this does not justify 9/10 yet.

---

Tracker state is currently unreliable

This deserves explicit correction.

The repository's new Sprint 4-to-90 tracker has every item checked, including:

atomic fraud replay safety;

approval fraud work;

historical snapshot reconstruction;

confirmed-only customer activity;

same-tenant concurrency;

full offline conflict coverage;

complete final validation.

Several of those claims directly contradict current source.

The migration tracker also states the full integration suite passed after terminalization/report work. That's useful repository-declared evidence, but it is not enough to certify the current b15fd98 SHA, because the current SHA has further production changes and the GitHub connector exposes neither status checks nor PR workflow runs for it.

So CI is unverified, not failed.

---

Revised score: 74/100

Why it rose from 68

The +6 points are real:

duplicate receipt unique-race evidence added;

six behavioral fraud rules implemented;

card/reversal/auth fraud dispatch added;

real PostgreSQL behavioral fraud integration tests added;

reporting rebuild now runs inside a locked transaction.

Why it is nowhere near 90 yet

The remaining gaps are concentrated and consequential:

1. Emit fraud intent for pending high-value earn/redemption.

2. Make fraud flag + outbox completion one atomic transaction.

3. Implement real historical snapshot reconstruction.

4. Make the report advisory lock tenant-wide.

5. Derive customer activity from confirmed ledger state.

6. Derive duplicate-attempt reports from append-only audit evidence.

7. Remove the duplicated production/test fraud implementations or integration-test the production runtime directly.

8. Normalize behavioral-rule window/dedupe keys to actual branch-local windows.

9. Finish the missing offline acceptance matrix.

10. Uncheck unsupported OpenSpec items, then re-check them only as their evidence passes.

11. Run all release gates on one final immutable SHA and obtain green CI evidence.

Bottom line

Sprint 3 remains closed.

Sprint 4 is now stronger, but the current head is approximately 74%, not 90%+. Do not start Sprint 5.

The good news from an engineering perspective is that we're no longer facing broad architectural uncertainty. The remaining path is fairly narrow: three core correctness repairs + acceptance/evidence closure. The next review should specifically verify those items rather than performing another full repository-wide reset.
