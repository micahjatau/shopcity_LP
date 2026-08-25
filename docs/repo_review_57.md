Worked for 9m 33s

ShopCity review against the previous audit + TRD

I re-checked the current frontend-development branch and the ShopCity Loyalty TRD.

Current head: 4d3689d4157fb1fbcf38ca0c43b1d1e2288d8e99 — fix: harden production API proxy. This is one commit beyond the last review state and adds a 10-second backend-proxy timeout, controlled 502 BACKEND_UNAVAILABLE handling, and Vercel backend routing through api/index.ts.

The main conclusion has shifted:

> The deployment-latency problem is no longer the primary concern. The remaining gaps are now mostly TRD compliance, Cashier workflow correctness, session security, and release-evidence integrity.

Updated assessment

Area Previous review Now

Core architecture 90 95
Backend/ledger correctness 94 95
Frontend workflow coverage 92 92
Cashier TRD alignment ~84 74
Supervisor/Admin TRD alignment 90 92
Offline architecture 82 90
Authentication/security 78 80
Runtime infrastructure/performance 55 94
Performance measurement quality 42 50
CI implementation 92 92
Release governance/evidence 48 60
Engineering maturity 86 89/100
TRD compliance — 84/100
Pilot/release readiness 71 78/100 — NO-GO

The reason release readiness does not jump as much as raw performance is that several TRD “Must” requirements remain unmet.

---

1. Your Frankfurt performance problem is effectively fixed

Your production sample is a very positive result:

Production path P50 P90

Frontend /login 132 ms 234 ms
Frontend proxy /auth/me 103 ms 257 ms
Backend /health/live 76 ms 92 ms
Direct backend /auth/me 65 ms 68 ms

Compared with the previous ~2.2–2.3 second Frankfurt API behavior, this is no longer showing an infrastructure-level latency problem.

And you've confirmed:

Vercel frontend Frankfurt
Vercel backend Frankfurt
Supabase/Postgres Frankfurt

That closes the regional-placement issue.

The current proxy hardening is also appropriate: it now has a finite backend timeout and converts transport failures into a defined 502 rather than leaking an uncontrolled proxy error.

Current deployment health is better too

At the current exact SHA, all three Vercel contexts currently report success:

shopcity-lp

shopcity-api

shopcity

Previously one of those duplicate contexts was red.

I would therefore remove “colocate Vercel/Supabase” from the optimization backlog completely.

There is still a governance question over whether shopcity is an intentional third project or a legacy duplicate, but it is no longer a performance incident.

---

2. The current latency sample does not yet certify TRD performance

This distinction matters.

The TRD's actual business-path targets are:

Card lookup <2 seconds

Earn confirmation <3 seconds

Redeem confirmation <3 seconds

Dashboard summary <5 seconds

Your current test covers:

/login
/auth/me
/health/live

Those are useful infrastructure probes, but not the customer checkout path.

Also, /auth/me returning 401 is expected for an unauthenticated probe. It tells us that authentication rejection is fast; it does not measure an authenticated session lookup with its database/session/device checks.

The next production sample should be

Card lookup through frontend proxy
Earn → confirmed
Earn → pending approval
Redeem → confirmed
Supervisor dashboard/report

I would care much more about those P50/P90s now than another generic /health sample.

If lookup comes back in, say, a few hundred milliseconds and Earn/Redeem remain comfortably below three seconds, performance stops being a launch blocker.

---

3. P1 — Cashier dashboard no longer satisfies TRD FE-001

This is the largest conflict between our newer sidebar architecture and the original TRD.

The TRD explicitly requires the Cashier dashboard to contain:

focused card scan/search;

customer summary;

Earn;

Redeem;

today's transaction list;

and says a cashier should be able to complete a normal earning transaction without navigating across multiple pages.

Our current /cashier is instead a clean launcher:

Earn
Redeem
Find customer
Recent activity placeholder

Architecturally, I still prefer the dedicated workflow routes. But against the current TRD, this is a Must-level mismatch.

I would not undo the sidebar design

Instead, reconcile the two:

/cashier

Ready for next customer

[ Scan or enter card __________________ ]

Customer context appears here

[ Earn ] [ Redeem ]

Recent transactions

Then:

scan card
→ customer summary
→ Earn
→ /cashier/earn?card=...

The dedicated route remains, but the Cashier home still becomes a genuinely fast checkout launch surface.

This would satisfy the spirit of both architectures.

---

4. P1 — Cashier post-scan verification is incomplete

TRD FE-003 says the Cashier must see:

customer name;

masked phone;

card status;

staff flag;

available balance.

The backend already returns:

fullName
maskedPhone
cardStatus
availableBalanceKobo

from card lookup.

But the frontend's lookup summary currently renders mainly:

Customer
Card status
Available balance
Expiring credit

and doesn't surface the masked phone or staff eligibility.

Worse, the lookup API doesn't currently expose isStaff or an equivalent eligibility field.

Fix the contract

I would return something like:

customer: {
customerId,
fullName,
maskedPhone,
isStaff,
earningEligible,
eligibilityReason,
availableBalanceKobo
}

Then regenerate OpenAPI/Orval and show:

Ada Obi
0803 *** 4412
Active card
Not staff
₦12,400 available

That is much better cashier verification.

---

5. P1 — Cashier customer view can still expose the full phone number

This is related but separate.

TRD security guidance says Cashier views should mask phone numbers when the full value is unnecessary.

The read-only Cashier CustomerWorkspace, however, constructs its selected preview from:

phoneE164 ?? phone

rather than a masked projection.

So we have an odd situation:

card lookup API
→ correctly masks phone

customer detail API
→ Cashier UI displays full phone

I would close this before pilot.

Ideally the backend should expose a role-safe Cashier customer DTO rather than rely purely on presentation-layer masking.

---

6. P1 — Earn violates FE-004: receipt is presented as optional

This is a direct TRD mismatch.

The TRD says Earn must require:

> receipt number + final paid amount

and submission must be blocked until both are present and valid.

The current Earn form literally displays:

Receipt: Optional

and its submit validation only checks:

if (purchaseAmount === null) ...

The button is disabled only when purchase amount is missing. It does not require receiptNumber.

The backend will reject an invalid/empty receipt, so ledger integrity is protected.

But the frontend violates FE-004 and creates avoidable checkout errors.

Fix

Submission readiness should require:

active card context +
non-empty receipt +
valid purchase amount > 0

and the label should stop saying Optional.

---

7. P1 — the Cashier error model doesn't satisfy FE-006

The TRD requires actionable Cashier messages for:

duplicate receipt;

inactive card;

staff account;

insufficient balance;

approval required;

offline/network state.

The current Earn error path often collapses backend outcomes into:

Earn failed with 409.

or:

Earn could not be submitted.

That's technically truthful, but it is not operationally useful.

The API already has domain codes. Map them explicitly:

RECEIPT_ALREADY_USED
→ This receipt has already been used this week.

STAFF_INELIGIBLE
→ Staff purchases cannot earn ShopCity credit.

CARD_NOT_FOUND / CARD_INACTIVE
→ This card cannot currently earn credit.

APPROVAL_REQUIRED
→ Supervisor approval is required.

INSUFFICIENT_BALANCE
→ Available credit is lower than this redemption.

The Cashier should never need to interpret HTTP status numbers.

---

8. P1/P2 — frontend advisory Earn calculation uses the wrong rounding rule

The TRD specifies:

credit = ceil(final_paid_amount × 0.02)

on the backend.

The current frontend preview uses:

Math.round(
purchaseAmount * defaultEarnRateBps / 10000
)

The backend remains authoritative, so this won't corrupt balances.

But the Cashier can be shown an advisory amount that differs by a kobo from the eventual server result.

Use the exact same round-up rule for display:

Math.ceil(...)

while continuing to state that only the backend confirms the credit.

---

9. P1 — inactivity expiration required by TRD is not implemented

This is the most important backend security gap I found against the TRD.

The TRD says:

sessions must expire after inactivity;

cashier inactivity timeout should be 15–30 minutes;

Supervisor/Admin approximately 15 minutes is recommended.

The backend currently issues:

expiresAt = now + 12 hours

The SessionGuard does track lastUsedAt, but only to update it every few minutes. It does not reject a session because it has been inactive too long.

So a cashier can potentially leave a POS browser idle for hours and retain an otherwise valid session.

Proper implementation

Server-side validation should enforce something like:

Cashier
lastUsedAt < now - configured 30 min
→ session rejected/revoked

Supervisor/Admin
lastUsedAt < now - configured 15 min
→ session rejected/revoked

Keep the 12-hour absolute lifetime as an additional ceiling if desired.

Do not implement this only as a frontend timer.

---

10. P1 — main/master is not protected

The TRD's CI requirement is explicit:

> production code should use a protected main branch and review/merge process.

GitHub currently reports master as:

protected: false
required_status_checks: off

The CI workflow itself is actually strong:

formatting;

lint;

type checking;

build;

Prisma validation;

tests;

OpenAPI;

frontend a11y;

browser tests;

visual regression;

Docker;

integration;

E2E;

GitNexus.

But without branch protection, those gates aren't structurally required before master changes.

Required GitHub setting

Require PRs and at minimum:

Static Checks
Frontend Checks
Integration Tests
End-to-End Tests
Docker Build Verification

before merge.

This is configuration, not code.

---

11. Universal idempotency is only partially TRD-compliant

The financial core is excellent here.

Earn:

requires a client idempotency key;

hashes the request;

returns prior response for identical replay;

rejects changed body with reused key;

stores actor + endpoint + key;

runs financial work transactionally.

Offline sync also preserves the original idempotency key and validates actor/device/branch before replaying the same Earn path.

That is very strong.

But the TRD literally says:

> Every state-changing request must include a client-generated idempotency key.

Card creation/replacement/status endpoints do not implement backend idempotency semantics even though some frontend calls attach a key.

So you need a policy decision:

Option A — obey TRD literally

Build common idempotency handling for consequential POST/PATCH/DELETE operations.

Option B — narrow the TRD

Change IDEMP-001 to:

> all financial, approval, reversal, adjustment, card-lifecycle, and other retry-sensitive mutations.

I actually prefer B, provided it is explicitly documented.

Not every mundane PATCH needs financial-grade replay snapshots.

---

12. Branch configuration remains architecturally inconsistent

The previous review flagged this.

Authenticated session context correctly contains:

user branch
device
role

But /config/public still selects:

DEFAULT_PUBLIC_TENANT_ID
DEFAULT_PUBLIC_BRANCH_ID

from environment configuration and performs DB lookups for those values.

This is less serious under the TRD's one-branch MVP, because multi-branch deployment is explicitly out of scope for MVP even though branch fields must support later expansion.

So I would downgrade this from an immediate release P0 to a P1/P2 architectural correction provided production truly has one ShopCity branch.

Still, authenticated operational context should eventually become:

session.branchId
→ authoritative branch config

rather than default-public-branch config.

---

13. Public config caching is only half implemented

This is now well aligned with the TRD on the client side.

TRD says branch settings can be cached browser + server for roughly 5–30 minutes.

The shared frontend provider now implements:

5-minute fresh cache;

30-minute stale window;

single-flight refresh;

stale/unavailable state.

Good.

But the backend /config/public still has no HTTP/server cache and still queries tenant + branch from PostgreSQL each uncached request.

Once branch scoping is correct, server/CDN caching remains an easy improvement.

It is no longer urgent given your current ~100ms production behavior.

---

14. Offline architecture now matches the TRD very well

This area has moved from one of the weakest parts of ShopCity to one of the stronger ones.

The TRD requires:

Earn only;

pending until server confirmation;

no offline Redemption;

IndexedDB;

original idempotency;

cashier/branch/card/receipt/week/amount/time;

retries;

conflict handling.

The current backend sync path verifies:

Cashier role
session device
request device == session device
actor branch
record branch
device status
device branch
receipt week
card state
customer state
staff exclusion
idempotency
duplicate receipt

before replaying through the canonical Earn service.

And the frontend now refuses offline persistence when a valid device context isn't available.

Remaining offline blocker

The device provisioning UX remains unfinished.

Cashiers still manually enter:

Device ID
Device attestation secret

during login. The secret is no longer persisted, which fixed the previous security defect, but this is not yet a mature POS-provisioning workflow.

---

15. POS authentication is secure but operationally awkward

There is a lot to like:

Supabase authenticates passwords;

ShopCity maintains its own session records;

device attestation uses HMAC;

attestation has timestamp/nonce;

replay is detected;

device must be active and branch-compatible;

sessions can be revoked after device changes.

However, the cashier has to know a machine credential.

That's not how I'd want a production checkout station to operate.

Eventually:

Admin provisions POS once
↓
device establishes machine identity
↓
cashier only enters personal login
↓
session automatically binds to POS

That satisfies both:

individual cashier identity; and

device attribution.

---

16. Frontend CSP is still missing

TRD SEC-005 says a strict frontend Content Security Policy should be applied.

Backend Fastify uses Helmet globally.

But the Next.js config currently contains no CSP/header policy.

This is Should, not Must, so I would place it after the Cashier correctness/security items.

---

17. The ledger/backend core remains the strongest part

Against the TRD, this is where ShopCity scores very well.

The database is PostgreSQL and includes:

tenant/branch;

device;

users;

sessions;

customers;

cards;

receipts;

append-only ledger;

credit lots;

approvals;

idempotency;

offline sync state.

Receipt uniqueness is enforced on tenant + branch + receipt week + normalized receipt number.

The Earn service validates:

active device;

branch;

active card;

active customer;

staff exclusion;

idempotency;

duplicate receipt;

amount rules;

and executes through a database transaction.

That lines up very closely with the TRD's requirement that the central backend—not the UI—be the source of truth.

Background infrastructure is also mature: credit-expiry workers, approval-expiry, fraud evaluation, outbox processing and associated tests exist.

---

18. Release-evidence integrity is still the biggest governance weakness

This has not changed enough since the previous review.

The stabilization evidence associates GitHub Actions run 32604098929 with candidate:

c388a962...

But GitHub says that run's actual head was:

587748d2...

So the evidence is not exact-head evidence.

And the verifier only proves that a declared candidateSha equals the SHA written beside each declared check; it doesn't independently prove that the GitHub workflow or deployment actually ran that SHA.

The new current head is now 4d3689d4, making those old c388a962 evidence artifacts stale again.

This is not a product-function problem. It is a release-certification problem.

---

TRD compliance matrix

TRD area Status Main observation

Architecture/source of truth PASS Central PostgreSQL/backend/ledger architecture strong
Customer registration PASS Supervisor/Admin creation now wired
Card assignment PASS Backend + UI
Card replacement PASS Replacement preserves customer wallet
Earn backend rules PASS Backend authoritative
Receipt/week uniqueness PASS DB constraint
Staff Earn exclusion PASS backend Cashier UI doesn't expose staff eligibility properly
Redemption PASS core Server authoritative
Approval queue PASS Supervisor/Admin
Reversal PASS core Append-only compensation
Admin reporting PASS Dedicated reporting infrastructure
Offline Earn PASS architecture POS provisioning remains
Offline Redemption block PASS Correct conservative policy
Cashier scan dashboard PARTIAL / Must gap Dedicated route replaced dashboard scan field
Cashier identity verification PARTIAL / Must gap masked phone/staff flag missing
Earn required receipt FAIL / Must gap UI currently calls receipt optional
Actionable Cashier errors PARTIAL / Must gap generic status messages
Session inactivity FAIL / Must gap 12h absolute expiry, no idle cutoff
Login throttling PASS 5/15 min
CSRF PASS Global guard
Secure cookies PASS Cookie session architecture
CSP PARTIAL / Should gap backend Helmet, frontend CSP absent
Universal idempotency PARTIAL excellent financial flows; not every mutation
Config caching PARTIAL client cache yes, server cache no
CI gates PASS code strong workflow
Protected master FAIL / Must gap branch protection disabled
Performance topology PASS Frankfurt end-to-end
Checkout latency evidence NOT YET CERTIFIED current sample doesn't test checkout routes
Release provenance FAIL stale/mixed-SHA evidence

---

What changed from the previous review

There is a real upward shift.

Closed or substantially improved

Frankfurt latency incident.

Frontend/backend/database colocation.

Production API proxy failure handling.

Vercel deployment checks are all green at current head.

Shared session context.

repeated route-level /auth/me fetching.

Customer deep-link race.

Customer registration/editing.

Customer/Card mode separation.

raw device-secret persistence.

Offline actor/device/branch reconciliation.

Cashier overview bloat.

navigation architecture.

Still open

The remaining issues are now more specific:

1. Cashier TRD compliance.

2. inactivity timeout.

3. POS provisioning.

4. branch-aware config authority.

5. universal idempotency interpretation.

6. CSP.

7. protected master.

8. trustworthy exact-head release evidence.

9. real authenticated checkout performance measurements.

---

Recommended closure order

I would not do another broad architecture sprint.

Do this:

Release-blocking correctness

1. Require receipt number before Earn.

2. Change advisory Earn calculation to ceiling.

3. Render masked phone + staff/eligibility after scan.

4. Map domain errors to Cashier-friendly messages.

5. Add a scanner-first quick lookup to /cashier so FE-001 is reconciled with dedicated workflow pages.

6. Enforce server-side inactivity timeout.

7. Finish POS device provisioning/gating.

Governance

8. Protect master.

9. Rebuild release evidence around actual immutable GitHub run/deployment SHAs.

10. Make the release verifier require actual successful conclusions.

11. Refresh all topology docs to Frankfurt.

12. Decide what the third shopcity Vercel project is and document/remove it.

Performance

13. Run the real production checkout benchmark:

lookup;

Earn;

Redeem;

report
Fix the performance harness to measure actual Next client navigation/RSC rather than repeated page.goto().
Only then decide whether further bundle splitting is worth the effort.
Add HTTP/server config caching after branch scoping is correct.
Current gate
Engineering architecture: 89/100 — strong
This has become a serious, well-structured financial-adjacent application rather than a thin loyalty CRUD frontend.
TRD compliance: 84/100 — substantial, but several Must gaps remain
The important part is that most remaining Must failures are not deep architectural rewrites. They are bounded checkout/security/governance fixes.
Performance infrastructure: 94/100
Based on your new Frankfurt production sample, I would no longer treat Vercel/Supabase network topology as a meaningful concern.
Pilot/release readiness: 78/100 — NO-GO for formal certification
The blockers are now primarily:
FE-001 + FE-003 + FE-004 + FE-006, AUTH-003, protected-master requirement, POS provisioning, and exact-head release evidence.
If we close those and your actual card-lookup/Earn/Redeem production measurements meet the TRD targets, I would expect this to move from 78% to the high-80s/low-90s release-readiness range without another architecture redesign.
