ShopCity repo re-review

I reviewed the current frontend-development head against the last reviewed SHA 3dd45f74….

Current head: 9243225bb2aeda4c5244b27612f024bfba0f878c — test: update cashier overview visual baseline.

Only 3 commits were added since the previous review. They are tightly focused on the Cashier overview/reporting issues we identified.

Updated verdict

Area Previous Current
Core architecture 96 96
Cashier TRD compliance 95 97
Backend/ledger integrity 96 95
Security/RBAC 95 96
Offline/POS 93 93
CI/testing 98 99
Release governance 82 84
Production certification incomplete still incomplete
Engineering maturity 95 96/100
Pilot readiness 91 93/100
Formal release readiness 89 90/100 — conditional NO-GO

The previous Cashier scope problems are fixed. I found one new correctness issue in the “Recent today” amount calculation that should be fixed before I would call the Cashier flow closed.

⸻

What has been fixed since the last review

1. /cashier-today is now correctly cashier-scoped

This closes the biggest issue from the previous audit.

The endpoint is now Cashier-only:

@Roles(UserRole.CASHIER)

And the database query now explicitly scopes transactions to:

tenantId
branchId
capturedByTenantId
capturedBy: context.user.id
business-day time window

So Cashier A no longer sees Cashier B’s recent transactions.

Previous P1: CLOSED.

⸻

2. Supervisor/Admin ambiguity is gone

Previously /cashier-today advertised Supervisor/Admin access even though the implementation required an assigned branch.

It is now simply:

Cashier endpoint → Cashier role

while Supervisor/Admin retain the richer reporting surfaces.

Much cleaner.

⸻

3. The stale duplicate “Recent activity” card is gone

The old Cashier page had both:

Recent today

and a placeholder:

Recent activity
Activity will appear here...

The latter has now been removed. /cashier has one authoritative recent-activity presentation rather than two competing sections.

Closed.

⸻

4. Scanner focus + Enter behavior is now tested

The previous unit test clicked Look up, so it didn’t really prove keyboard-wedge scanner behavior.

The current test verifies:

render
→ scanner input has focus
→ enter CARD-001
→ submit form
→ customer appears
→ Earn context is preserved

That is much closer to a real barcode scanner, since typical scanners emulate keyboard input followed by Enter.

The activity UI is also explicitly tested.

⸻

5. Timezone and actor scoping now have backend tests

The reporting service test now verifies that at a fixed UTC instant, the query calculates the correct Lagos business-day boundaries and includes the authenticated cashier ID:

tenant-1
branch-1
cashier-1
23:00Z → 23:00Z business-day window

There are also tests for:

- Earn mapping;
- Redeem mapping;
- missing branch;
- cross-tenant branch mismatch.

This is good evidence rather than merely a task-box claim.

⸻

P1 — pending Earn can display the purchase amount as earned credit

This is the most important issue I found in the current code.

For an Earn transaction, listCashierToday() calculates:

amountKobo:
ledger?.amountKobo
?? receipt.purchaseAmountKobo

That fallback is semantically wrong.

Imagine:

Purchase ₦10,000
Earn rate 2%
Expected credit ₦200
Status PENDING APPROVAL

If that Earn hasn’t produced a confirmed ledger entry yet, there may be no ledger.amountKobo.

The current fallback can therefore return:

EARN ₦10,000 PENDING

instead of something representing the pending ₦200 credit.

The Cashier UI renders amountKobo directly as money:

<Money amountKobo={transaction.amountKobo} />

So this can become a user-visible financial misrepresentation.

Correct model

I would not overload one field.

Prefer something like:

{
operation: 'EARN',
purchaseAmountKobo: 1000000,
loyaltyAmountKobo: 20000 | null,
status: 'PENDING'
}

Then the UI can render:

EARN +₦200 PENDING

if the server has an authoritative projected amount, or:

EARN Pending calculation

if it does not.

At absolute minimum, never fall back from loyalty credit to purchase amount.

Severity

P1 financial-display correctness.

The ledger itself is not corrupted, but Cashiers could see an incorrect monetary figure.

⸻

P2 — “Recent today” should visually distinguish Earn from Redeem

The component currently passes both operation amounts directly into:

<Money amountKobo={transaction.amountKobo} />

So both may visually appear as positive money values:

EARN ₦420
REDEEM ₦1,000

For quick operational scanning I would prefer:

EARN +₦420
REDEEM −₦1,000

or explicit semantic labels.

This is not a data-integrity problem because operation accompanies the amount, but it lowers cashier readability.

⸻

P2 — Cashier activity fetch is still handwritten despite a generated client

The OpenAPI client was regenerated after adding /reports/cashier-today, but CashierOverviewLookup still calls:

fetch(
'/api/v1/reports/cashier-today',
createApiRequest(...)
)

and manually validates the returned object.

For the card lookup on the same component you correctly use the generated client.

I’d use the generated reporting method too:

generated-client
→ typed DTO
→ CashierOverviewLookup

Benefits:

- less duplicate response typing;
- less runtime shape plumbing;
- compile-time OpenAPI drift detection;
- consistent error handling.

Not release-blocking, but this is precisely what having the generated contract layer is for.

⸻

CI/security state is excellent

The current exact head has successful CI:

- SHA: 9243225b…
- workflow: ci
- status: completed
- conclusion: success
- PR-triggered against master.

The exact same SHA also has successful security-gates.

And commit status currently shows:

CodeRabbit SUCCESS
Vercel – shopcity-api SUCCESS
Vercel – shopcity-lp SUCCESS

So the candidate’s software verification picture is now very strong.

⸻

P1 governance — PR #8 description is stale again

PR #8 currently points its Verification section at older runs:

CI 32909571213
Security 32909713507

while the PR head has moved to:

9243225bb2aeda...

The correct current exact-head CI run is now:

32949229296

and security is now:

32949229259

This doesn’t mean the code is unverified—the new runs are green.

It means the human-facing release record is stale.

Before freezing the candidate, update the PR or make the evidence bundle authoritative so manually maintained run IDs aren’t repeatedly becoming false.

⸻

Master protection still needs explicit closure

master is protected, but GitHub continues to report:

required_status_checks:
contexts: - ci

The workflow named ci is indeed running successfully, so the situation is less concerning than it initially looked.

Still, the Review 58 tracker correctly leaves verification that this is a real merge-time gate unchecked.

I’d confirm by inspecting PR #8’s merge requirements or attempting the normal protected merge flow—not by assuming from the branch JSON alone.

⸻

OpenSpec is behaving more truthfully now

The current tracker marks the newly resolved Review 59 items explicitly:

2.8 cashier-today actor scope + stale placeholder + mobile layout
2.9 focus/Enter + activity + redeem + tenant + timezone tests

as complete.

But it still leaves the larger evidence areas unchecked:

- authenticated benchmarking;
- candidate freeze;
- exact-head evidence bundle;
- Frankfurt documentation;
- pilot devices;
- migration tracking;
- restore drill;
- final verification;
- final merge gate.

That’s the correct posture.

⸻

Release blockers that remain

At this point the software list is very short.

Code blocker

1. Fix the Earn activity amount fallback.

This is the only new code issue I’d consider significant before pilot.

Evidence/operations blockers

2. Authenticated benchmark

Still completely open in the tracker.

We still need real:

lookup P50/P90
Earn confirmed P50/P90
Earn pending P50/P90
Redeem confirmed P50/P90
Supervisor report P50/P90

against the deployed candidate.

3. Pilot POS provisioning proof

Not just unit tests—actual intended pilot equipment.

4. Backup/restore drill

Still open.

5. Frankfurt evidence

We know the topology operationally, but it still needs to enter the immutable release bundle.

6. Required-check verification

Confirm the protected master merge gate.

7. Freeze the candidate

Don’t keep changing the SHA after collecting evidence.

8. Final GitNexus/diff review.

⸻

Score progression

The repo has now moved from the early sidebar stage into a genuinely mature release candidate:

Review ~54
frontend architecture ≈ 86
Review 57
engineering maturity ≈ 94
Previous review
≈ 95
Current
≈ 96

The remaining work is no longer broad engineering.

Current score

Engineering maturity: 96/100

TRD compliance: 97/100

CI/security maturity: 99/100

Controlled pilot readiness: 93/100

Formal release readiness: 90/100 — conditional NO-GO

The shortest path now is:

1. fix the pending-Earn activity amount;
2. regenerate/update contract tests if necessary;
3. freeze candidate SHA;
4. run exact-head CI/security/Vercel;
5. run authenticated business-flow benchmarks;
6. validate real pilot POS device lifecycle;
7. perform restore drill;
8. finalize exact-head evidence;
9. verify protected merge requirement;
10. merge PR #8 and begin controlled pilot.

I would not start another feature or architecture sprint before doing this.
