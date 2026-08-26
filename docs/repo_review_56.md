Worked for 7m

frontend-development repo review

I reviewed the current branch directly through GitHub.

Current head: 63934881711bbdf2f6c3356b1531b2635e1d5b2c — docs: refresh release evidence for latest candidate. The actual runtime candidate immediately beneath it is c388a96295d88b3c16201c24b82a2535170e082c.

The branch is now 183 commits ahead and 0 behind master.

Verdict

Dimension Score

Design system / shell 92/100
Workflow coverage 92/100
Backend utilization 90/100
Session/context architecture 91/100
Cashier UX 84/100
Offline architecture 82/100
Performance implementation 68/100
Performance evidence 42/100
Release-evidence integrity 48/100
Deployment/topology readiness 55/100
Frontend engineering overall 86/100
Pilot/release readiness 71/100 — NO-GO

The frontend itself has improved. The current bottleneck is now performance/release certification quality, plus one new branch-context correctness issue that I consider important.

---

P0/P1 — branch context can be wrong for Cashier transactions

This is the most important product correctness issue I found.

Your session bootstrap now correctly knows the authenticated user's:

branchId
deviceId
userId
role

But /config/public is not actually session/branch-specific.

The backend service ignores the authenticated user's branch and instead reads:

DEFAULT_PUBLIC_TENANT_ID
DEFAULT_PUBLIC_BRANCH_ID

from environment configuration.

Then CashierWorkflowRoute uses that public-config branch:

branchId={policyConfig?.branch?.id ?? null}

when constructing Earn/offline context.

And EarnTransactionForm prioritizes that value:

const offlineBranchId =
branchId ?? lookupContext?.branchId ?? null;

So for a cashier assigned to Branch B:

Authenticated session
branchId = Branch B

/config/public
branch = DEFAULT Branch A

Offline Earn
branchId = Branch A

That is wrong.

It can also make the UI display the wrong branch context.

Fix

The authoritative order should be:

session.branchId
↓
lookup/card branch where applicable
↓
public-config branch only as bootstrap fallback

Better still, make configuration explicitly scoped:

GET /config/branch/:branchId

or have /auth/me/a bootstrap endpoint identify the effective branch, then fetch cached configuration for that branch.

Do not use DEFAULT_PUBLIC_BRANCH_ID as the operational branch once an authenticated session exists.

---

P1 — exact-head CI evidence is currently false

This is a release-certification defect.

frontend-stabilization-release-evidence.json says the candidate is:

c388a96295d88b3c16201c24b82a2535170e082c

and claims:

github-actions-32604098929 → passed → c388a962...

I checked GitHub run 32604098929 directly.

GitHub says:

head_sha =
587748d2f0c99321e352c6ad3c05d7083be6c80f

not c388a962.

So the evidence currently says:

Run 32604098929
certifies c388a962

while GitHub says:

Run 32604098929
actually tested 587748d2

That means the exact-head certification claim is invalid.

The candidate does have a successful canonical Vercel deployment, but that is not equivalent to the full Actions suite.

---

P1 — the frontend release verifier doesn't verify release evidence

The new verifier looks stronger than it actually is.

It checks that:

candidateSha is syntactically valid
check.candidateSha equals candidateSha
check.status exists
deployment fields exist
topology fields contain something

But it does not verify:

status === "passed";

workflow run ID;

actual GitHub run SHA;

workflow conclusion;

deployment SHA;

performance artifact SHA;

whether "UNKNOWN" topology values are acceptable;

performance thresholds.

For example this would pass:

{
"name": "frontend-tests",
"status": "failed",
"candidateSha": "correct-sha"
}

because the verifier only requires status to be non-empty.

The tests confirm this is mainly a shape verifier.

Fix

Each technical gate should carry immutable provenance:

{
"name": "frontend-checks",
"runId": 123456,
"headSha": "...",
"conclusion": "success"
}

and the release verifier must require:

headSha === candidateSha
conclusion === success

Likewise performance evidence should contain its own commitSha, and that SHA must match.

---

P1 — the performance harness does not measure what it claims to measure

This needs correction before more performance optimization.

The measurement script says it measures warm navigation, RSC payload, API calls, LCP, INP and hydration.

But there are three structural problems.

1. “Warm navigation” is another full page load

Both cold and warm run:

page.goto(`${baseUrl}${route}`)

That is not a Next.js client-side navigation.

So this does not measure:

Link click
→ RSC flight
→ client route transition

It measures:

full browser document load
→ full browser document load again

Those are different performance paths.

---

2. RSC requests are classified as API requests

classifyResource() checks:

if (type === 'fetch' || type === 'xmlhttprequest')
return 'api';

...

if (url.includes('rsc=1') || ...)
return 'rsc';

RSC navigation uses fetch.

Therefore the earlier condition captures it as api before the RSC condition can execute.

Your requested metric:

> measure RSC navigation separately

is therefore not currently reliable.

The order should be:

auth
config
RSC
API fetch
JS
other

---

3. Current route measurements are mostly measuring /login

The local baseline requests /cashier, but because authenticated storage state was unavailable, the browser winds up at:

http://127.0.0.1:3200/login

The evidence literally records:

route: /cashier
url: /login

and /auth/me returns 500 during that baseline.

That is not a Cashier-route performance measurement.

The documentation correctly acknowledges that authenticated evidence is unavailable.

But OpenSpec nevertheless marks most payload-optimization tasks complete.

That is premature.

Required benchmark

Create authenticated Playwright storage state and perform:

/cashier
↓ click Earn
/cashier/earn
↓ click Redeem
/cashier/redeem

without page.goto() between them.

Measure the resources generated by those navigations only.

---

Performance numbers are currently inconsistent

The local production-build baseline says:

Cashier 155,590 encoded JS
Cashier lookup 157,330
Cashier earn 157,329
Cashier redeem 157,330

and after the first boundary optimization /cashier became 150,614 bytes, only a 3.2% reduction.

But the candidate release evidence says every route has:

warmJsBytes = 1,525,553

Those clearly aren't the same metric.

Until warmJsBytes has one documented definition—encoded transfer vs decoded size vs aggregate resource size—we cannot use it as a release budget.

---

What improved substantially

Session state centralization — effectively closed

This is a real improvement.

AppShell now owns a SessionBootstrapProvider, and nested consumers obtain the existing context rather than creating independent /auth/me calls.

The provider stores:

user;

role;

branch;

device;

public config;

config freshness state.

This is the architecture we wanted.

I would consider session-refetch-on-navigation closed unless authenticated performance evidence disproves it.

---

Public config caching — partially closed, not fully closed

There is now good browser-memory caching:

fresh: 5 minutes
stale window: 30 minutes
single-flight refresh

That's worthwhile.

But your original optimization was:

> Cache /api/v1/config/public with Cache-Control or unstable_cache.

That still has not happened.

The Nest controller has no Cache-Control response handling.

And every uncached config call still executes two database queries:

tenant.findUnique()
branch.findUnique()

Given the endpoint currently represents one environment-selected default tenant/branch, it is an excellent server/CDN cache candidate.

One caveat: fix the branch-scoping problem first.

---

Cashier overview reduction — successful

The Cashier homepage has been dramatically simplified.

It is now a server component containing:

concise heading;

shared session context island;

Earn;

Redeem;

Find customer;

recent activity placeholder.

That's much better than the old 500+ line client megascreen.

The diff shows roughly:

117 additions
542 deletions

for cashier/page.tsx.

That is a genuine win.

---

But Earn/Redeem are still one large client boundary

The main optimization is only halfway done.

CashierWorkflowRoute remains:

'use client'

and still owns:

card lookup;

customer loading;

ledger loading;

policy presentation;

Earn;

Redeem;

customer detail;

transaction-context rendering.

So OpenSpec claims like:

> “static page composition plus a small interactive form island”

and:

> “move static headers, summaries, policy explanations, and route composition out of client boundaries”

are stronger than the implementation actually is.

The file is still roughly 600 lines of client code.

CustomerWorkspace is even larger—over 1,100 lines and still entirely client-side.

Next payload target

Break Cashier transaction routes into:

Server page
├── static page heading
├── branch/policy summary
│
├── CardLookupClient
├── EarnFormClient / RedeemFormClient
└── CustomerContextClient

And lazy-load the ledger only when expanded or needed.

---

P1/P2 — the Cashier request waterfall is still unnecessarily broad

After card lookup, the transaction route separately requests:

customer detail +
customer ledger

So one cashier selection can become:

card lookup
↓
customer detail
↓
ledger

before the financial transaction itself.

For Earn/Redeem, the ledger is secondary context, not required to calculate the transaction.

I'd change this to:

card lookup
↓
transaction form usable immediately

customer detail/ledger
↓
lazy secondary context

or create a specifically designed cashier-context endpoint if the backend can provide the necessary customer/card/balance information in one query.

---

Device security is better, but provisioning remains incomplete

The previous raw-secret-in-localStorage defect is fixed.

The Login form no longer stores the device attestation secret anywhere persistent, and explicitly clears it after the login attempt.

That's good.

But:

cashiers still manually paste the machine secret;

the field isn't rendered as a password input;

login works without device credentials;

controlled one-time provisioning is not implemented.

The current OpenSpec correctly leaves those tasks open.

So I would call:

secret persistence: CLOSED
POS provisioning: NOT CLOSED

---

Customer workflow is much better

Two previous gaps are now closed:

Deep-link race

?id= now wins over default search selection.

Registration/editing

CustomerWorkspace now calls both:

POST /customers
PATCH /customers/:id

and supports create/edit states.

It also has explicit Customer/Card mode support.

This is real progress.

---

P2 — reversal still violates the persistent-idempotency pattern

Earn and Redeem now persist logical operation keys across refresh.

But Transaction reversal still does:

idempotencyKey: crypto.randomUUID()

inside every call.

If:

reversal commits
→ response disappears
→ supervisor retries

the retry gets a new logical key.

The backend probably protects against a second reversal, but our frontend convention should remain consistent:

> one consequential logical operation → one idempotency key until terminal outcome.

I would persist the reversal draft key exactly as we do for Earn/Redeem.

---

The date/time bug is still present

Earn still initializes:

new Date().toISOString()

then renders:

value={occurredAt.slice(0, 16)}

inside a datetime-local input.

That displays UTC as if it were local wall time.

For Lagos, that is generally one hour wrong.

This is not a release-catastrophic bug because the backend receives an ISO timestamp, but the cashier is shown the wrong local time.

It should use a proper UTC↔branch-timezone converter.

---

P1 release process — performance/evidence checks are not actually in CI

The CI workflow now correctly verifies:

git rev-parse HEAD === CANDIDATE_SHA

inside each major job. That's good.

But despite OpenSpec task 10.2 claiming that performance and release-evidence checks are part of exact-head CI, the workflow does not execute:

perf:web:baseline
test:frontend-stabilization-evidence
verify frontend stabilization evidence

The current CI runs frontend lint, typecheck, accessibility, critical flows, visual tests and build—but not the new performance/evidence gate.

So OpenSpec 10.2 should not be checked yet.

---

Deployment/topology remains unresolved

The frontend candidate is now known:

Vercel runtime: iad1
build: sfo1

but:

backend region: UNKNOWN
Supabase/Postgres region: UNKNOWN

That means the high-value colocation optimization you identified still hasn't been evaluated.

The canonical shopcity-lp Vercel status is green, while the duplicate shopcity project remains red.

Current production is also still on an older SHA; the candidate is only a preview.

---

Governance status

The active stabilization tracker itself correctly leaves several critical items open:

controlled POS provisioning;

device-ready Offline Earn gating/tests;

duplicate Vercel disposition;

backend/database topology;

complete verification;

UI anti-slop review;

final stabilization report.

That's good.

However, several performance tasks are marked done despite the evidence limitations described above.

Meanwhile cashier-ui-review still has every task unchecked, although the Cashier homepage has clearly already changed substantially.

So OpenSpec is still not perfectly synchronized with source reality.

---

Revised scoring

Product/frontend architecture

90/100

The session provider, sidebar, dedicated routes, customer workflow and Cashier overview are now structurally solid.

Workflow implementation

91/100

Most backend capabilities now have real UI.

Correctness

82/100

Main deduction: default-public-branch leakage into authenticated cashier context.

Performance engineering

68/100

Some good refactoring, but the largest client islands remain.

Performance measurement

40/100

The current harness doesn't measure authenticated client-side route transitions correctly.

Release evidence

45/100

There is a real exact-head provenance mismatch and the verifier is too permissive.

Overall frontend engineering

86/100 — GO development

No redesign required.

Pilot/release

71/100 — NO-GO

Not because the frontend is poor. The remaining blockers are now concentrated and identifiable.

Next closure sequence

I would do these in exactly this order:

1. Fix operational branch authority

session branch must beat default public config;

make config branch-scoped.

2. Fix the performance harness

authenticated storage state;

real <Link> navigation;

classify RSC before generic fetch;

fail when requested route redirects;

capture actual FCP/LCP/INP/hydration.

3. Fix exact-head release evidence

CI run ID + actual run SHA;

require successful conclusions;

performance artifact SHA;

deployment SHA;

fail on unexplained UNKNOWN.

4. Run the performance/evidence verifier in CI.

5. Server/CDN-cache the public configuration after branch scoping is fixed.

6. Split CashierWorkflowRoute into small client islands.

7. Lazy-load customer ledger/supporting context after the form becomes usable.

8. Break CustomerWorkspace into Customer, Profile, Card and Ledger subcomponents.

9. Finish the POS provisioning workflow and hide the attestation secret input.

10. Persist idempotency for reversal and other consequential retryable mutations.

11. Fix branch-local datetime display.

12. Resolve backend/Supabase region placement and remove the duplicate Vercel project.

After items 1–5, the performance/release picture becomes trustworthy. After 6–8, I would expect the actual frontend score to cross the 90% threshold rather than merely looking complete on paper.
