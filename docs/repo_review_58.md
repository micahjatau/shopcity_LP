ShopCity repo re-review

I re-audited frontend-development against the previous review and the TRD. The current head is:

1775633ebc96dfe95b6ab7ddb2efeefa8a335445 — fix: update release format paths.

This is a significantly better build than the last review. Most of the product-level TRD blockers have actually been fixed rather than merely documented.

Updated scorecard

Area Previous Current Direction
Core architecture 95 96 ↑
Backend/ledger integrity 95 96 ↑
Cashier workflow correctness 74 89 ↑↑
Supervisor/Admin workflows 92 94 ↑
RBAC/security 80 92 ↑↑
Offline architecture 90 93 ↑
Device/POS lifecycle 70 91 ↑↑
Frontend security 82 94 ↑↑
CI/testing 92 96 ↑
Release evidence/governance 60 74 ↑, still weakest
Engineering maturity 89 94/100 ↑
TRD compliance 84 92/100 ↑
Pilot/release readiness 78 85/100 ↑

Current verdict

Code/product readiness: GO for staging and controlled pilot validation.

Formal release certification: still NO-GO.

The distinction matters: I no longer see a major architectural defect preventing ShopCity from functioning as the intended loyalty platform. What remains is mainly one Cashier workflow compliance issue plus production/release evidence that has not yet been completed.

⸻

What is genuinely fixed

1. Cashier verification is now substantially TRD-compliant

The previous implementation failed FE-003 because card lookup did not expose enough information for a cashier to verify the person and eligibility.

That is now fixed.

The Cashier transaction route displays customer identity, masked phone, card status, staff/earning eligibility, available balance and related context.

The backend card lookup has also been hardened so the Cashier receives a deliberately limited projection including:

fullName
maskedPhone
cardStatus
isStaff
earningEligible
eligibilityReason
availableBalanceKobo

rather than relying on the frontend to hide sensitive fields.

That is the right architecture. The TRD requires name, masked phone, card status, staff status and available balance after lookup. ShopCity_Loyalty_Technical_Requirements_Document.docx

Status: PASS.

⸻

2. Earn FE-004 is fixed

The previous review found a direct TRD violation: receipt number was labelled optional and wasn’t part of frontend submission readiness.

Current Earn now:

- requires card;
- requires receipt;
- requires a positive purchase amount;
- disables submission until the required context exists;
- labels the receipt as required.

It also now uses Math.ceil() for the advisory calculation, matching the backend/TRD rounding semantics.

The TRD requires both receipt number and final paid amount before submission. ShopCity_Loyalty_Technical_Requirements_Document.docx

Status: PASS.

⸻

3. Cashier error handling is much better

The earlier:

Earn failed with 409

style of failure is no longer the dominant behavior.

The current workflow maps domain conditions including duplicate receipt, inactive card, staff exclusion, approval requirement, insufficient balance, device/session problems and idempotency conflicts into operational messages.

That aligns much better with FE-006, which explicitly requires actionable cashier errors rather than raw technical failures. ShopCity_Loyalty_Technical_Requirements_Document.docx

Status: PASS.

⸻

4. Cashier PII minimization is fixed at the API boundary

This is an important improvement.

Customer read/search responses are now projected according to role rather than sending a full customer record to the browser and trusting Cashier UI code not to display it.

That is preferable to merely changing:

phoneE164

into:

mask(phoneE164)

inside React.

It materially improves SEC-006/data-minimization compliance. ShopCity_Loyalty_Technical_Requirements_Document.docx

Status: PASS.

⸻

5. Server-side idle-session enforcement is now implemented

One of the largest security gaps in the previous review was AUTH-003.

Previously ShopCity had approximately a 12-hour absolute session but tracked lastUsedAt without actually enforcing an inactivity timeout.

The current implementation now has role-aware idle limits enforced by the backend, while preserving absolute expiry. The repo’s current compliance plan also records this as completed, including frontend handling and regression coverage.

That is exactly where the security boundary belongs: backend first, frontend UX second.

The TRD explicitly requires sessions to expire after inactivity. ShopCity_Loyalty_Technical_Requirements_Document.docx

Status: PASS.

⸻

6. POS device provisioning has matured considerably

This is no longer merely:

Cashier:
enter device UUID
enter raw attestation secret

The Admin device workflow now supports an actual lifecycle:

- device enrollment;
- branch association;
- activation/deactivation;
- attestation-secret generation;
- one-time secret handling;
- rotation;
- session invalidation/revocation behavior.

The current OpenSpec closure checklist also records administrator-controlled POS enrollment, activation, branch binding and revocation as implemented.

Status: PASS architecturally.

Actual pilot devices still need to be provisioned and tested before release.

⸻

7. Retry-sensitive idempotency is much stronger

The financial core was already good. The scope has now expanded to the card/device lifecycle and other important mutation paths.

Card creation/replacement/status now have explicit idempotency handling rather than merely receiving an unused request header.

The repo also now has an explicit policy documenting what gets idempotent treatment rather than blindly applying full replay storage to every trivial mutation.

That is a better interpretation of the TRD than indiscriminately wrapping every PATCH endpoint.

Status: PASS.

⸻

8. Authenticated branch configuration is fixed

The earlier design could authenticate a user into branch A but then derive operational policy from a DEFAULT_PUBLIC_BRANCH_ID.

That was architecturally dangerous.

Authenticated bootstrap now resolves protected operational configuration against the session’s validated branch context and verifies that the result corresponds to the authenticated branch.

Status: PASS.

⸻

9. Frontend CSP is now real

The Next application now defines production security headers including CSP, frame restrictions, MIME sniffing protection, referrer policy and permissions restrictions.

That closes SEC-005 from the previous review.

Status: PASS.

⸻

Remaining P1 issue: FE-001 is still only partially satisfied

This is the main product-level issue I would still change.

The TRD says the Cashier dashboard must provide:

- focused card scan/search input;
- customer summary;
- Earn;
- Redeem;
- today’s transactions;

and that normal earning should be completable without unnecessary navigation across multiple pages. ShopCity_Loyalty_Technical_Requirements_Document.docx

The current /cashier screen now looks conceptually better:

READY FOR SCAN
Scan or find a customer
[ Open card lookup ]
Current customer
Quick actions
Earn
Redeem
Sync

But “READY FOR SCAN” is stronger than what the implementation currently does.

The dashboard itself still directs the cashier to /cashier/lookup; the actual dedicated lookup route then mounts the transaction workflow.

ScannerContextScope does not itself capture keyboard-wedge scanner input. It essentially provides context/focus behavior for an existing scanner-target element.

And I found no scanner-target input directly on the Cashier overview.

So I would change this

Keep the dedicated routes, but add one focused scanner field directly to /cashier:

READY FOR SCAN
┌──────────────────────────────────────────────┐
│ Scan card or enter card number... │
└──────────────────────────────────────────────┘
Ada Obi
0803 *** 4412
ACTIVE · CUSTOMER · ₦12,400
[ Earn credit ] [ Redeem credit ]

On scan:

/cashier
↓
lookup API
↓
customer context appears
↓
Earn / Redeem links carry the card

You retain the new sidebar architecture without violating the original Cashier speed requirement.

Today’s transactions

The current overview also still doesn’t quite provide the TRD’s “today’s transaction list.”

The current activity section is deliberately narrower and session/local-context oriented.

I would give /cashier a small backend-backed list:

Recent today
18:41 #1831 Earn ₦420
18:36 #1830 Redeem -₦1,000
18:19 #1829 Earn ₦660
View all →

Limit it to 5–10 rows so the overview doesn’t become another giant workflow page.

FE-001: PARTIAL.

Interestingly, the repo’s own hardening checklist marks scanner/search-first Cashier entry as completed.

I disagree with that interpretation of the TRD: a button taking you to a scan page is not the same acceptance criterion as a focused scanner input on the Cashier dashboard.

⸻

Release evidence is now the principal blocker

This is where the repo itself agrees with this review.

The active closure plan still leaves these unchecked:

- exact-head branch/topology/Vercel evidence;
- authenticated Lookup/Earn/Redeem/report benchmarks;
- stale release/topology reconciliation;
- migration/backup evidence;
- pilot device provisioning;
- final production benchmark;
- final GitNexus/diff/evidence review.

That is why I won’t call the release GO yet.

⸻

CI is in very good shape

This is a major improvement.

The exact current SHA has a completed successful CI run:

- branch: frontend-development
- SHA: 1775633…
- run: 32882041759
- status: completed
- conclusion: success

The current CI also explicitly verifies:

git rev-parse HEAD == CANDIDATE_SHA

before running its quality gates. It then performs format/lint/type/build, Prisma, architecture checks, backend tests, critical coverage, OpenAPI checks, generated-client checks, OpenSpec validation, release-artifact verification and frontend testing.

That’s much closer to the evidence model I wanted in the previous audits.

⸻

But exact-head security certification is still missing

Your separate security workflow is strong:

- Gitleaks;
- CodeQL;
- Trivy image scanning;
- ZAP staging baseline.

But it runs automatically on:

push:
branches: - master
pull_request:
workflow_dispatch:

not an ordinary push to frontend-development.

So the successful current branch CI is not the same thing as saying:

“This exact SHA passed our full security gate.”

Before cutting the release candidate, either:

1. open the PR into master, so the security workflow runs, or
2. explicitly dispatch the security workflow against the intended candidate/staging target.

I would require exact-SHA security evidence before release certification.

⸻

Branch governance needs one more look

master is now protected, which fixes a previous TRD Must finding.

However, there are two things I’d verify.

First, protection currently names the required status context simply:

ci

while the CI workflow itself has named jobs such as:

Static Checks
Frontend Checks
...

Make sure GitHub actually recognizes the required ci context at merge time rather than having a stale legacy required-check name.

Second, frontend-development is now 209 commits ahead of master and 0 behind.

That is a very large integration batch.

It isn’t technically wrong, but I would not add another broad feature sprint before integration. The next meaningful milestone should be:

freeze candidate
→ finish FE-001
→ exact-SHA benchmark
→ security gates
→ restore proof
→ full CI
→ review diff
→ PR into master
→ pilot

⸻

Production performance

The Frankfurt infrastructure issue remains effectively solved based on the previous production measurements.

But the missing evidence is exactly what the TRD actually cares about:

Operation TRD target
Card lookup <2 s
Earn confirmation <3 s
Redemption confirmation <3 s
Dashboard summary <5 s

ShopCity_Loyalty_Technical_Requirements_Document.docx

The current repo itself now explicitly leaves authenticated production benchmarks open.

So don’t spend more time benchmarking /health/live.

The next sample should be actual POS behavior:

50–100 requests/workflows
lookup
earn confirmed
earn pending approval
redeem confirmed
supervisor report
P50 / P90 / P95
exact deployed SHA
frontend proxy path
direct API path where useful

That will finally close the performance section properly.

⸻

Final assessment

Engineering maturity — 94/100

The architecture is now strong. The financial boundaries, role projections, offline reconciliation, device attribution, mutation safety and frontend/backend contract handling are much more mature than they were even a few reviews ago.

TRD compliance — 92/100

Most previous Must-level gaps have closed.

The main remaining product disagreement is FE-001: I don’t consider a /cashier page that says “READY FOR SCAN” and links to another page equivalent to the TRD’s focused on-dashboard scanner flow.

Release readiness — 85/100

This is now principally evidence-limited, not architecture-limited.

My priority order from here

1. Finish FE-001 — real scanner input + lightweight today’s transactions on /cashier.
2. Freeze a release-candidate SHA.
3. Run authenticated production/staging Lookup → Earn → Redeem benchmarks.
4. Run exact-SHA security gates.
5. Complete actual backup/restore evidence.
6. Verify master required-check configuration.
7. Resolve/document the remaining Vercel project-name/deployment ambiguity.
8. Run final GitNexus impact/diff review.
9. PR the candidate into protected master.
10. Start a controlled ShopCity pilot with daily reconciliation.

I would stop broad feature development now. The product is far enough along that additional features are more likely to increase release uncertainty than improve the MVP. The next phase should be candidate stabilization and operational proof.
