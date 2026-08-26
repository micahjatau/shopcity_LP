Fresh GitHub connector review

I reviewed the delta from the previous audited head:

1775633ebc96dfe95b6ab7ddb2efeefa8a335445

to the current frontend-development head:

3dd45f74d342d928f23c787a76ede31a37767149 — fix: opt into pretty logging explicitly.

Only 4 commits were added since the last audit, so this is a clean closure review rather than another broad architectural reassessment.

Updated verdict

Area Previous Current
Core architecture 96 96
Cashier TRD workflow 89 95
Backend/ledger integrity 96 96
Security/RBAC 92 95
Offline/POS 93 93
CI quality 96 98
Exact-SHA security evidence incomplete 95
Release governance 74 82
Production certification incomplete still incomplete
Engineering maturity 94 95/100
TRD compliance 92 95/100
Release readiness 85 89/100

Current decision

Engineering: GO.

Protected-master PR validation: GO.

Controlled pilot preparation: GO.

Formal production release certification: still NO-GO, mainly because authenticated business-flow benchmarks, actual pilot-device proof, restore evidence, and final evidence closure remain incomplete.

⸻

1. FE-001 is now genuinely fixed

This was the largest product gap in the previous review.

The Cashier home now contains an actual focused scanner/manual-entry control, rather than a button that simply sends the cashier to another route.

CashierOverviewLookup:

- autofocuses the card input;
- supports normal keyboard-wedge scanner behavior because it is a standard form input;
- accepts manual card entry;
- blocks empty submissions;
- handles offline state;
- invokes the authoritative card lookup API;
- displays verified customer context;
- carries the card to Earn/Redeem via query string;
- loads today’s activity.

And it is mounted directly on /cashier.

The flow is now:

/cashier
Scan / type CARD-001
↓
authoritative lookup
↓
Ada Shopper
0803 *** 1234
ACTIVE · Eligible
₦55.00
[Earn credit]
[Redeem credit]
[Open details]

That resolves the central disagreement I had with the previous implementation.

FE-001

PASS.

⸻

2. Today’s transactions are now backend-backed

The earlier placeholder has been replaced functionally by a real endpoint:

GET /api/v1/reports/cashier-today

The route is session-protected and resolves its branch from authenticated context.

The service also correctly calculates the current business-day window using the branch timezone rather than naïve UTC midnight.

It limits output to 10 rows, which is appropriate for the cashier overview.

That is a very good improvement.

⸻

P1 — “Cashier today” currently means branch today, not this cashier today

This is the biggest issue I found in the new delta.

The endpoint obtains:

const branchId = context.user.branchId;

but the receipt query only filters:

where: {
tenantId,
branchId,
occurredAt: ...
}

It does not filter by:

capturedBy: context.user.id

Yet the schema explicitly records the cashier who captured each receipt:

Receipt
├── capturedByTenantId
├── capturedBy
└── capturedByUser

So Cashier A currently sees the most recent transactions performed by:

Cashier A
Cashier B
Cashier C
...

at that branch.

That may be intentional operationally, but it doesn’t match the endpoint/component naming particularly well and gives each cashier visibility into branch-wide transaction activity.

Better rule

For Cashier:

where: {
tenantId,
branchId,
capturedBy: context.user.id,
occurredAt: ...
}

For Supervisor/Admin, if they need branch activity:

/reports/cashier-activity

already exists.

I would therefore make /cashier-today genuinely actor-scoped.

If branch-wide activity is intentionally desired, rename the UI to:

Recent branch activity

and explicitly document that visibility policy.

Severity

P1 authorization/scope semantics, though not a ledger-integrity defect.

⸻

P2 — the API advertises Supervisor/Admin access it can’t reliably support

The controller currently allows:

@Roles(
UserRole.CASHIER,
UserRole.SUPERVISOR,
UserRole.ADMIN
)

for /cashier-today.

But the service immediately requires:

context.user.branchId

and throws when it is absent.

That means an Admin without a branch assignment can be authorized by the route and then rejected by the service.

That’s internally inconsistent.

I would simplify this endpoint to:

@Roles(UserRole.CASHIER)

because Supervisor/Admin already have richer reporting endpoints.

That makes the security contract clearer.

⸻

P2 — the old “Recent activity” placeholder is still on the page

CashierOverviewLookup now renders a working:

Recent today

section.

But /cashier/page.tsx still also renders:

Recent activity
Activity will appear here when the scoped endpoint is available.

The scoped endpoint is now available.

So the current page can effectively contain:

Recent today
18:41 #1831 EARN ₦420
...
...
Recent activity
Activity will appear here when the scoped endpoint is available.

That is stale UX and should simply be removed.

The sync-queue link can move into the existing context strip/sidebar rather than keeping the dead placeholder card.

⸻

3. Scanner behavior is functionally sound, but the tests aren’t finished

The new component is keyboard-wedge compatible in practice because:

- the input receives focus on mount;
- scanners typically emulate fast keyboard input followed by Enter;
- it lives inside a normal <form onSubmit>.

However, the tests only prove:

type card
→ click Look up
→ correct customer
→ correct Earn link

They don’t yet explicitly prove:

scanner characters
→ Enter
→ lookup

or:

initial focus is scanner input
offline behavior
lookup 401/403
lookup 404
lookup 500
today endpoint loading
today endpoint empty
today endpoint failure
mobile rendering

The current Review 58 task tracker correctly leaves the full state/test work unchecked.

Add one important regression

render /cashier
expect scanner input focused
type CARD-001
press Enter
expect authoritative lookup called once
expect verified customer shown

That closes the actual physical-scanner acceptance condition.

⸻

4. Exact-head CI is now genuinely strong

This is one of the most important changes in status since the previous audit.

The exact current SHA has CI running on:

3dd45f74d342d928f23c787a76ede31a37767149

and the PR workflow includes successful:

- Frontend Checks;
- Integration Tests;
- End-to-End Tests;
- Docker Build Verification;
- and the other CI jobs associated with the same check suite.

This is much better than the earlier release evidence where a run ID was associated with the wrong commit.

Current status

Exact-head CI: PASS.

⸻

5. Exact-SHA security gates are now also green

This was still open during the previous review.

At the current exact SHA, GitHub now shows a successful:

security-gates

workflow triggered from PR #8 against protected master.

The workflow ran with:

head_sha =
3dd45f74d342d928f23c787a76ede31a37767149

and completed successfully.

PR #8 explicitly records the release-certification scope and notes that security validation has passed while authenticated business-flow certification and operational proof remain open.

That is exactly the distinction the release process should make.

Exact-SHA security

PASS.

⸻

6. Both canonical Vercel projects are green

At current head:

Vercel – shopcity-api SUCCESS
Vercel – shopcity-lp SUCCESS

So both backend and frontend preview deployments are healthy.

This is now much cleaner than the earlier period where a duplicate failing deployment status contaminated every candidate.

⸻

P1 governance — master protection still appears misconfigured

master is now protected, which is a major improvement.

However, GitHub reports its required status context as:

ci

But the current GitHub Actions check runs are named things like:

Frontend Checks
Integration Tests
End-to-End Tests
Docker Build Verification

I don’t see a current check run literally named:

ci

in the returned check-run evidence.

That leaves a governance ambiguity:

Is "ci" a real merge-time required check?
or
is it a stale context from an earlier workflow configuration?

This was already on the closure list, and it remains open.

I would fix this before merging

Require concrete current checks such as:

Static Checks
Frontend Checks
Integration Tests
End-to-End Tests
Docker Build Verification
security-gates jobs as appropriate

rather than a potentially stale generic ci.

This is now one of the principal remaining release-governance tasks.

⸻

7. Release-certification docs are now more truthful

The new repo-review-58-release-certification tracker is considerably better than some earlier OpenSpec closures.

It does not pretend release certification is done.

It correctly leaves incomplete:

- authenticated business benchmarks;
- exact-head evidence bundle;
- Frankfurt/topology documentation;
- duplicate Vercel disposition;
- pilot-device provisioning;
- migration tracking;
- backup/restore proof;
- final GitNexus review;
- final release gate.

And the PR itself states:

Authenticated business-flow certification, pilot-device proof, backup/restore drill evidence, and final human approval remain required.

That’s good release discipline.

⸻

8. Production performance remains evidence-limited, not infrastructure-limited

Nothing in these four commits changes the previous conclusion:

Frontend Vercel Frankfurt
Backend Vercel Frankfurt
Supabase/Postgres Frankfurt

and your production infrastructure probes are now fast.

The remaining benchmark work should not revisit deployment geography.

It should measure the actual TRD workflows:

Card lookup
Earn confirmed
Earn pending approval
Redeem confirmed
Supervisor dashboard/report

The Review 58 tracker appropriately leaves this entire section incomplete.

That’s now the biggest missing performance evidence, not performance engineering.

⸻

9. The branch is getting very large

frontend-development is now:

213 commits ahead, 0 behind master.

This is the part I’d treat with increasing caution.

The branch is technically coherent, and PR #8 is mergeable. But we’re no longer dealing with a small isolated frontend feature branch.

There is a very large accumulated integration surface.

I would avoid adding another broad implementation cycle before integration.

⸻

TRD delta from the last review

Previous issue Current status
Focused scanner on /cashier CLOSED
Verified scan context CLOSED
Earn/Redeem context handoff CLOSED
Today’s transaction feed IMPLEMENTED
FE-001 overall PASS with scope cleanup needed
Exact-SHA CI CLOSED
Exact-SHA security gate CLOSED
Master protected CLOSED structurally
Required-check configuration STILL VERIFY/FIX
Authenticated production benchmark OPEN
POS pilot proof OPEN
Backup/restore proof OPEN
Final release bundle OPEN

⸻

Updated scoring

Architecture — 96/100

No further redesign needed.

Cashier TRD compliance — 95/100

The actual scanner-first flow now exists.

Backend correctness — 96/100

Ledger and financial rules remain strong.

Security — 95/100

Idle expiry, CSP, device lifecycle, role-safe projections, exact-SHA security scans and protected master are substantial strengths.

CI/testing — 98/100

Very mature now.

Release governance — 82/100

The primary remaining weakness.

Production evidence — 78/100

Infrastructure looks good; business-path certification is missing.

Overall engineering

95/100

This is now clearly beyond prototype-level engineering.

Pilot readiness

91/100 — conditional GO

I would be comfortable moving into a controlled pilot validation phase after the small Cashier scope cleanup.

Formal production certification

89/100 — not quite GO

The remaining gap is no longer “build more software.”

It’s:

1. Scope /cashier-today to the current cashier, or explicitly rename/document it as branch activity.
2. Remove the stale duplicate Recent Activity placeholder.
3. Add scanner-Enter/focus and activity-state tests.
4. Correct/verify the master required status-check configuration.
5. Freeze the final candidate SHA.
6. Run authenticated Lookup/Earn/Redeem/report production benchmarks.
7. Provision and validate actual pilot POS devices.
8. Execute the backup/restore drill.
9. Assemble exact-head release evidence.
10. Merge PR #8 only after those release conditions are satisfied.

At this point I would stop architectural work entirely. The highest-value work is operational validation, certification, and pilot observation.

---

## Previously identified remaining code-quality gaps

- **Frontend — medium:** Recent-activity rows may overflow on narrow/mobile screens.
- **Frontend — low:** Successful `cashier-today` fetch/rendering lacks test coverage.
- **Backend — low:** Missing explicit tests for redeem mapping, no branch scope, cross-tenant mismatch, and timezone boundaries.
