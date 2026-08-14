ShopCity repo review — latest head

Current head: 1df4136481bfbdb6af615ad3480c532a4384f37f — docs: record zap certification evidence.

Verdict

Area Score Status

Sprint 3 98/100 PASS / frozen
Sprint 4 95/100 PASS / frozen
Sprint 5 engineering 98/100 PASS / closed
Sprint 5 pilot readiness 78/100 NO-GO

The codebase is no longer the problem. Normal Sprint 5 engineering should remain closed. The remaining work is release architecture, environment readiness, and certification evidence.

There has been real progress since f6f75de…: the Vercel boot failure is fixed, full security scanning now executes, and ZAP has a real zero-failure run. But I found three important certification blockers, including one concrete evidence mismatch.

---

What improved

1. Previous Vercel boot failure — CLOSED

The API now actually starts.

I rechecked the live deployment:

/health/live → 200

the previous FUNCTION_INVOCATION_FAILED condition is gone.

The Prisma-generation changes have therefore fixed the earlier deployment startup failure.

2. Full security workflow now genuinely runs

I independently checked workflow run 31694340876 for candidate:

2511acc2dc70e27c7e1892ecfbcf414ab78c2707

It completed:

Gitleaks — success

CodeQL — success

Trivy — success

ZAP Baseline — success

The repository records the same four successful jobs and the ZAP result of FAIL-NEW: 0.

So the old problem of CodeQL/ZAP being skipped is substantially closed.

3. ZAP warnings are not a release blocker

The scan you supplied has:

FAIL-NEW: 0

FAIL-INPROG: 0

4 warning categories

63 passes

I still accept this as a security scan pass with documented accepted warnings, rather than requiring zero warnings.

4. Current-head CI is clean

On 1df4136…, the normal CI suite is green across:

static checks

unit/coverage

integration

E2E

architecture

OpenAPI/Spectral/oasdiff

generated client checks

OpenSpec

GitNexus

Docker build verification

No new engineering regression surfaced in the delta.

5. Financial retry handling improved

The newer retry handling now covers raw PostgreSQL serialization conflicts surfaced through Prisma P2010/SQLSTATE 40001, with tests.

That is worthwhile hardening for the financial paths and reinforces the 98/100 engineering closure.

---

Blocker 1 — /health/ready is still failing

This is now the immediate environment blocker.

I checked the deployed application again:

/health/live → 200

/health/ready → 503 DEPENDENCY_UNAVAILABLE

And the repository itself now acknowledges that readiness remains dependency-gated.

The health controller makes the distinction explicit:

liveness checks only the API process;

readiness requires both PostgreSQL and Redis;

failure of either results in 503.

So the current state is:

Application process ✅
NestJS bootstrap ✅
HTTP routing ✅
Postgres + Redis ready ❌ at least one dependency

Severity: P1 pilot blocker

Until /health/ready is 200, I would not:

certify staging;

run the final k6 certification;

treat Bruno results as release evidence;

approve the pilot.

The next technical task should therefore be diagnosing whether Redis or PostgreSQL is failing in the Vercel environment.

---

Blocker 2 — the recorded Vercel deployment does not belong to the claimed candidate

This is the most important evidence-integrity finding.

Your security evidence currently says:

Candidate SHA:
2511acc2dc70e27c7e1892ecfbcf414ab78c2707

Image digest / deployment:
dpl_2e3TRMYKQ8DMWaFzC7mhrtRcf8f5

Staging evidence makes the same assertion.

I checked that exact Vercel deployment ID directly.

dpl_2e3TRMYKQ8DMWaFzC7mhrtRcf8f5 actually belongs to:

c3fbf8fb044d6920287cd4cb5df14e4756ae418e

—not 2511acc2….

Vercel shows the actual deployment for 2511acc2… as:

dpl_CnUhzLdu5q7cPUGvaLzNDwXqTxwy

Therefore:

> The security scan itself succeeded, but the certification document currently associates it with the wrong immutable deployment ID.

Severity: P1 certification blocker

This needs correcting before the security evidence can be called immutable same-candidate certification.

There is an additional subtlety: ZAP was pointed at:

https://shopcity-lp.vercel.app

That is a mutable production alias. As new deployments occur, that hostname moves to later commits.

For final certification, use the immutable candidate deployment URL/ID, not only the alias.

---

Blocker 3 — GHCR/container vs Vercel certification model remains unresolved

This is now the architectural issue preventing Review 46 from converging.

The Review 46 source of truth still explicitly requires:

one frozen SHA;

an exact image built and pushed to GHCR;

the resulting digest;

that exact digest deployed to staging;

all evidence tied to the same SHA and digest.

The deployment runbook says essentially the same thing:

1. build candidate container image;

2. record image digest;

3. deploy worker services;

4. deploy API;

5. validate health/readiness against that release.

But the new evidence has changed:

Image digest:
Vercel serverless deployment dpl_...

Those are not equivalent artifacts.

A Vercel deployment ID is not an OCI digest matching:

ghcr.io/...@sha256:...

More importantly, the readiness document still identifies an older GHCR artifact and release SHA:

SHA 58e760b6…

GHCR digest 385fe391…

while the new security evidence identifies 2511acc2… and a Vercel deployment.

Result

You currently have three competing release identities:

readiness.json
58e760b6 + GHCR digest
│
│ inconsistent
▼
security/staging docs
2511acc2 + Vercel deployment ID
│
│ deployment ID actually belongs to
▼
c3fbf8fb

That cannot pass final certification.

---

Vercel also deploys only the API

This matters because ShopCity is not merely an HTTP API.

vercel.json builds only:

api/index.ts → @vercel/node

But src/worker.ts starts the actual background infrastructure for:

outbox publication;

SMS;

approval expiry;

credit expiry;

expiry reminders;

report materialization;

related scheduled processing.

And your deployment runbook explicitly requires worker services to be deployed before or alongside the API.

So a functioning Vercel API alone is not a complete ShopCity deployment.

This strengthens my earlier recommendation:

> Do not replace the container release architecture with Vercel Functions during certification.

Vercel is fine as an API test/staging surface, but the actual release candidate needs a supported worker runtime as well.

---

Review 46 tracker is now stale

Every Review 46 checkbox remains unchecked.

That is no longer completely representative.

You now have meaningful progress on:

same-SHA security workflow execution;

Gitleaks;

CodeQL;

Trivy;

ZAP;

real HTTPS deployment;

placeholder rejection work.

But I would not mark 2.2/2.3/2.5 complete yet, because the deployment identity mismatch prevents them from satisfying the “same frozen artifact” requirement.

Once corrected, those tasks can close quickly.

---

Evidence still genuinely missing

These remain real, not paperwork:

Performance

Real staging/certification k6 is still outstanding.

The previously retained performance artifact is a local/synthetic run, not the final environment measurement.

Disaster recovery

A real provider-managed Supabase backup restore into an isolated target is still outstanding.

This is important because the Sprint 5 exit criterion explicitly requires a restore test.

Staging validation

The repository itself lists:

migrations — pending

/health/ready — not healthy

Bruno — pending

contract tests — pending.

Training/sign-off

Real cashier/supervisor/admin training and actual owner/admin approval remain outstanding.

Production checklist

It should remain unsigned until those gates are complete.

That part of the current NO-GO posture is correct.

---

Revised scoring

Sprint 5 category Score

Credit expiry + reminders 25/25
Observability/reconciliation 15/15
Security 14/15
Performance 6/10
Backup/restore 6/15
Container/deployment/rollback 8/10
Runbooks/training 4/5
Final certification 0/5
Pilot readiness 78/100

That is up from 76, primarily because:

application boot is fixed;

CodeQL runs;

ZAP genuinely runs;

the full security workflow is now operational.

It does not move farther because /health/ready is still failing and the candidate/deployment evidence chain is inconsistent.

---

Final decision

Engineering

98/100 — PASS. CLOSED.

I do not recommend more feature development, financial architecture work, expiry work, or another general source-code cleanup cycle.

Pilot

78/100 — NO-GO.

The remaining path is now very narrow.

Do these next, in order

1. Fix /health/ready — determine whether PostgreSQL or Redis configuration/connectivity is failing.

2. Choose the final artifact model. I recommend preserving the GHCR/container model already required by Review 46 and the deployment runbook.

3. Deploy the worker as well as the API.

4. Freeze one final SHA at/after current head.

5. Build + push that exact GHCR image and record its real digest.

6. Deploy the exact frozen artifact.

7. Rerun the full security workflow against the immutable deployment and document the four accepted ZAP warnings.

8. Run migrations, readiness, Bruno/contracts and k6 against that same environment.

9. Perform the real Supabase restore + reconciliation.

10. Complete real training/sign-off.

11. Reconcile readiness.json, evidence docs and Review 46.

12. Run the final readiness verifier.

The next review should not be another repo-wide review. It should be a Review 46 certification audit asking one question: does one immutable SHA/artifact now have every required piece of observed evidence?
