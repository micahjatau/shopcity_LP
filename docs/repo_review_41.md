ShopCity repo re-review — latest head

Repository: micahjatau/shopcity_LP
Reviewed head: 9749ded4e3c256cccc6e095005028708480279c9 — docs: add repo review 40.

The repository has moved substantially since the last review: 20 commits beyond a263ae1, including the reversal fix plus a large portion of Sprint 4—offline sync, fraud review, reporting read models, CSV exports, and report materialization.

Verdict

Area	Current score	Verdict

Sprint 3 functional implementation	98/100	PASS
Sprint 3 formal closure/evidence	~94/100	CI/current tracker evidence still not fully closed
Sprint 4 implementation	53/100	Not ready to close
Offline sync core	21/30	Strong foundation, one serious replay bug
Offline concurrency/evidence	3/10	Significant test gaps
Fraud detection/review	8/20	Review surface exists; detection incomplete
Reporting/read models	10/20	Architecture exists; correctness issues
Reports/exports	6/10	Partial
Contracts/docs	4/5	Strong
Final validation gate	1/5	Not independently verified
Approx. whole-TRD implementation	~76/100	Good progress, not production-ready


The important change from my previous review is this:

> The Sprint 3 financial blocker is fixed. I found no remaining Sprint 3 defect that warrants reopening the financial architecture.



The problems I found this time are overwhelmingly Sprint 4 problems.


---

Sprint 3: the exact-lot reversal defect is fixed

The fix is the right one, not a workaround.

LotAllocationService now has a dedicated allocateDebitFromExactLot() path. It locks the specific credit lot using tenant, customer and lot ID, verifies adequate remaining balance and expiry, and persists the debit against that lot only.

Both affected reversal branches now use it:

EARN → compensating debit against the original earn lot;

CREDIT ADJUSTMENT → compensating debit against the original adjustment lot.


More importantly, this is now backed by a real PostgreSQL/Testcontainers integration suite. It creates an older unrelated lot and a target lot, reverses the target, and verifies that the older lot remains untouched while the target lot falls to zero. The same adversarial case exists for credit adjustments.

That closes the P1 from the previous review.

Sprint 3 decision

Functionally, Sprint 3 is done.

I would give it 98/100 rather than continue inventing reasons to reopen it.

The remaining two points are acceptance bookkeeping: Issue #3 is still open with the original unchecked checklist, despite the implementation having overtaken it.  I also cannot independently certify a green CI run for the current 9749ded SHA because the connector returns neither a combined status nor a PR workflow run.

That means CI evidence is unverified, not failed.


---

New Sprint 4 findings

1. P1 — changed offline replay corrupts the canonical replay record

This is the most important new bug.

OfflineSyncService correctly persists a canonical attempt keyed by:

tenant + device + localId

and stores the original request hash and response.

If the same localId is subsequently sent with a different payload, the code detects the hash mismatch and generates SYNC_RECORD_CONFLICT.

The problem is that it then calls persistResult() on the existing successful attempt.

persistResult() overwrites:

status

errorCode

transactionId

approvalId

responseJson

syncedAt


on that canonical row.

So this sequence breaks replay semantics:

A: localId=123, amount=₦10,000
→ CONFIRMED, transaction T1

B: localId=123, amount=₦20,000
→ SYNC_RECORD_CONFLICT
→ canonical record is overwritten with the conflict

A again
→ request hash matches the original hash
→ service returns stored responseJson
→ but stored responseJson is now B's conflict

The financial transaction itself isn't duplicated, but the idempotency/audit record becomes false and its transaction linkage can be nulled.

The current test suite checks successful replay and changed-payload conflict independently, but not:

success → changed conflict → original replay again.

Required correction

On mismatched requestHash, return SYNC_RECORD_CONFLICT without modifying the canonical attempt.

If conflict attempts need persistence, store them separately as audit/conflict evidence.

Add one regression test asserting that after a changed-payload attack, the original payload still replays its exact original successful response and retains its transaction ID.

This is a Sprint 4 blocker.


---

2. P1 — duplicate-receipt fraud detection can never work as implemented

The fraud implementation checks committed Receipt rows and creates FR-DUP-001 only when:

duplicateCount > 1

But the database correctly enforces:

UNIQUE (
  tenantId,
  branchId,
  receiptWeekStart,
  normalizedPosReceiptNumber
)

Therefore two duplicate receipts cannot exist to be counted.

The same impossible check has also been copied into the outbox fraud evaluator.

The financial protection works—the duplicate is blocked—but the fraud evidence does not.

The Sprint 4 design specifically requires:

FR-DUP-001: duplicate receipt attempt → blocked + HIGH fraud flag.

Correct architecture

Fraud needs evidence of the attempt, not two successfully committed receipts.

When RECEIPT_ALREADY_USED occurs, write non-financial append-only evidence carrying cashier, device, branch, normalized receipt identity, time and original receipt ID. That evidence can directly create or enqueue the FR-DUP-001 flag.

Do not weaken the database uniqueness rule. That rule is correct.


---

3. Fraud implementation is far below the TRD scope

FraudRulesService currently has high-value rules:

FR-HV-001

FR-HV-002

high-value redemption as FR-HV-003


The Sprint 4 plan requires the remaining behavioral controls as well:

FR-CARD-001, FR-CASH-001, FR-ROUND-001, FR-REV-001, FR-REPL-001, and FR-AUTH-001.

Those are not implemented yet.

The fraud review API, however, is already fairly good. Cashiers are denied, supervisors are branch-scoped, admins can use tenant scope, and fraud decisions are audited.

So I would characterize fraud as:

review infrastructure = strong; detection engine = early.


---

4. The asynchronous fraud design is not actually fraud.evaluate

The Sprint 4 design called for a generalized outbox containing distinct handlers for:

sms.send
fraud.evaluate

and specifically warned against coupling fraud to SMS.

Current worker recovery still explicitly selects only:

WHERE "eventType" = 'sms.send'

and handleJob() dead-letters any non-sms.send event.

Fraud is instead executed opportunistically inside processing of an SMS event.

That creates an undesirable dependency:

> No viable SMS intent → no dependable fraud evaluation.



There is no actual fraud.evaluate implementation in runtime code; repository search only finds that event in design/TRD material.

This should be fixed before the behavioral fraud rules are added, otherwise those rules will be built on the wrong dispatch primitive.


---

Reporting has a strong foundation, but the numbers are not trustworthy yet

The reporting architecture is substantial now. You have:

materialized tables;

scheduled materialization;

executive summaries;

liability ageing;

cashier summaries;

customer snapshots;

redemption summaries;

SMS summaries;

CSV export;

RBAC;

export auditing.


The frozen metric definitions are also a good move.

But there are correctness defects.

5. P1 — pending/unconfirmed receipts can inflate reports

The reporting definitions state that loyalty purchase value comes from confirmed earn purchases.

However, the materializer doesn't load receipt captureStatus or reviewStatus at all.

filterReceiptsForScope() filters only geographical scope.

Then buildDailyFinancialSummaries() immediately counts every receipt toward:

purchase value;

transaction count;

active customer count.


That means a high-value earn sitting in PENDING_APPROVAL—which correctly has zero ledger/lot financial effect—can nevertheless appear as economic activity in executive reporting.

This directly contradicts the financial/reporting boundary.

The offline tests themselves prove pending approval deliberately has a receipt but no ledger or lot.

So this isn't theoretical.

Fix

Reporting should either derive confirmed purchases from confirmed EARN ledger entries joined to receipts, or explicitly filter receipts to the accepted financial state.

The ledger should remain authoritative.


---

6. Customer balance and liability ageing don't consistently exclude expired lots

currentBalanceKobo in customer snapshots currently sums the customer's credit lots without filtering expiresAt > asOf.

But the frozen definition says current active credit balance.

Likewise, liability ageing begins with all lots having positive remainingAmountKobo. Expired positive lots are not removed, and resolveAgeBucket() clamps negative time-to-expiry to zero—meaning expired credits can enter the 0–30 bucket.

That's a material liability-reporting issue.

Use the same active-lot eligibility rule as the financial balance service rather than implementing a looser reporting interpretation.


---

7. duplicateAttempts in cashier reporting has the same impossible-data problem

Cashier summaries attempt to identify duplicates by grouping committed receipt rows and checking whether the same receipt identity exists more than once.

Again, the database makes that impossible.

So duplicateAttempts will systematically under-report the behavior it's intended to measure.

The reporting model should consume rejected duplicate attempt evidence, not committed receipt duplication.

This and FR-DUP-001 should be fixed together with one shared source of evidence.


---

Reports API is only partially exposed

The materializer already produces several tables, including cashier, redemption and SMS summaries.

But the public report controller currently exposes only:

Available	Missing

Executive summary	Cashier activity
Liability ageing	Redemption summary
Customer performance	SMS operations
Materialization state	Audit report


ReportsService likewise exposes only executive, liability, customer and materialization state queries.

The Sprint 4 DoD explicitly calls for executive, liability, cashier, customer, redemption, SMS and audit reporting.

So reporting should not be scored as near-complete yet.


---

Report refresh endpoint is not durable

POST /reports/:report/refresh returns 202 Accepted.

But ReportExportService.refreshReport() starts:

void this.scheduleRefresh(...).catch(...)

inside the API process and immediately returns.

A restart or deployment can lose that requested refresh, and errors are swallowed.

You already have a dedicated periodic report-materialization worker.

The explicit refresh API should therefore either:

enqueue a durable materialization job/outbox event; or

perform it synchronously and return a synchronous success response.


A detached promise plus 202 overstates durability.


---

Test coverage hasn't caught up with implementation

The Sprint 4 plan deliberately defined a fairly aggressive offline acceptance suite including online-vs-offline duplicate races, offline-vs-online retries, simultaneous receipt submission, inactive/replaced cards, staff exclusion, wrong cashier/device/branch, week mismatch and idempotency conflicts.

The current PostgreSQL offline integration test covers four major scenarios:

successful sync + identical replay;

changed local payload;

mixed batch;

high-value pending approval.


The HTTP integration test currently covers essentially the successful sync/replay path.

I also found no test for two simultaneous report materializers targeting the same tenant, even though that scenario is explicitly listed in the Sprint 4 test hierarchy.

So a lot of the Sprint 4 implementation is presently code-complete before acceptance-complete.


---

Project tracking is now seriously behind the code

The active Sprint 4 OpenSpec tracker still has every task unchecked, even though much of sections 2–5 now exists.

And docs/repo_review_40.md is now itself historical: it records the previous a263ae1 state and says the exact-lot reversal defect remains, while current code has already corrected it.

So don't use repo_review_40.md as the current state of truth anymore.


---

What I would fix next

1. Fix offline replay immutability first. A changed-hash submission must never mutate the canonical successful attempt. Add the three-step replay regression test.


2. Introduce duplicate-attempt evidence. Use it for both FR-DUP-001 and cashier duplicateAttempts.


3. Separate fraud from SMS. Add a genuine durable fraud.evaluate outbox handler before implementing the six missing behavioral fraud rules.


4. Correct reporting inputs. Derive confirmed purchase activity from authoritative confirmed financial state; exclude expired lots from active balances/liability; correct visit counting.


5. Expose cashier, redemption, SMS and audit reports, then extend CSV exports to them.


6. Make manual report refresh durable and add same-tenant materializer concurrency protection/testing.


7. Finish the complete offline conflict/concurrency suite, then run the Sprint 2/3 financial regression suites and one immutable final CI candidate.




---

Updated completion assessment

The repository has made a large and meaningful jump forward since the previous review.

Sprint 3

98/100 functional — close it as an engineering sprint.

I would not perform another generic Sprint 3 architecture review unless a regression is found.

Sprint 4

53/100.

There is enough implementation that this is clearly no longer an early Sprint 4 skeleton, but the core acceptance properties aren't there yet. In particular, offline replay correctness, fraud evidence, and report correctness are too central to award a high score simply because the modules and tables now exist.

Overall

I place the current backend at roughly 76% of the full TRD implementation, with the critical financial core substantially mature but Sprint 4 still in active development.

Current decision: Sprint 3 = GO/closed functionally. Sprint 4 = continue implementation; not ready for closure or production acceptance.
