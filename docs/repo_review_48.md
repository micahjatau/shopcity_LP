ShopCity repository review — latest head

Current head: f6f75de5b5c3ee122b3467cdeff80aefc422282f — ci: run codeql without code scanning upload.

Verdict

Area Previous Current Decision

Sprint 3 98% 98% PASS / frozen
Sprint 4 95% 95% PASS / frozen
Sprint 5 engineering 96% 98% PASS / engineering closed
Sprint 5 pilot readiness 73% 76% NO-GO

This review is much more conclusive: I would stop normal Sprint 5 engineering work now. The remaining blockers are deployment and certification, not loyalty-domain implementation.

There is, however, one new P1 deployment problem that must be solved before certification can continue.

---

What has been closed

1. SYSTEM actor concurrency race — CLOSED

The last remaining P2 code issue is now fixed correctly.

SystemActorService.getOrCreate() now:

1. looks for the canonical SYSTEM actor;

2. attempts creation if absent;

3. catches P2002 if another transaction created it first;

4. re-reads that actor;

5. validates that it is still SYSTEM and ACTIVE;

6. returns it.

This is the right pattern for concurrent first-use initialization.

Combined with the already-fixed:

expiry/redeem concurrency;

expiry reminder revalidation;

immutable expiry evidence;

financial retry semantics;

Sentry bootstrap;

historical reporting;

I no longer see a meaningful Sprint 5 financial correctness blocker.

Sprint 5 engineering: 98/100

I would mark engineering closed.

---

2. CodeQL now genuinely executes

The current head changes CodeQL to:

github/codeql-action/analyze@v3
with:
upload: false

On the current exact SHA I checked the actual Actions jobs:

Gitleaks — success

Trivy — success

CodeQL — success

ZAP — skipped

So this is materially better than the last review, when CodeQL itself was skipped.

Remaining security gap

ZAP still needs an actual staging URL and actual execution.

I would also retain CodeQL output/SARIF or another auditable result for the final certification bundle. upload: false lets the analysis execute without publishing to GitHub code scanning, but release certification should still preserve enough evidence to demonstrate what was scanned and what findings, if any, were accepted.

---

P1 — the current Vercel deployment is broken

This is the most important new finding.

I inspected the connected Vercel project corresponding to ShopCity. The latest deployment:

corresponds to current SHA f6f75de...;

is marked READY by Vercel;

is deployed as a production deployment.

But live probes of:

/health/live
/health/ready

both return:

HTTP 500
FUNCTION_INVOCATION_FAILED

So:

> The current deployed API does not boot successfully despite the deployment itself being marked READY.

This is a release blocker.

---

Likely cause: Prisma generation/build ordering on Vercel

The new configuration is:

{
"buildCommand": "npm run prisma:generate && npm run build",
"builds": [
{
"src": "api/index.ts",
"use": "@vercel/node"
}
]
}

However, the actual Vercel build logs show the function builder compiling api/index.ts, with TypeScript diagnostics consistent with an ungenerated Prisma client:

missing Prisma enums/types;

missing Prisma model properties;

missing $connect/$disconnect;

related generated-client errors.

I did not see the intended prisma:generate && build sequence running before the serverless-function compilation.

That strongly suggests the current legacy builds configuration is bypassing or changing the expected build lifecycle.

Priority: P1

Before doing ZAP, k6, Bruno, restore sign-off, or release freezing, /health/live must first return 200.

---

P1 — Vercel introduces an artifact-model conflict

This is even more important architecturally.

Your current Review 46 source of truth says staging certification must:

freeze one SHA;

build and push an exact GHCR OCI image;

record its digest;

deploy that exact digest;

execute staging/security/performance against it.

But the new Vercel deployment path does this:

Git commit
↓
@vercel/node
↓
Vercel serverless function

It does not deploy:

ghcr.io/shopcity/shopcity-lp@sha256:...

Therefore even after the Vercel function is fixed:

> A Vercel Functions deployment cannot currently be claimed as proof that the certified GHCR image digest was deployed.

You now need to make one architectural decision.

Option A — keep the existing TRD release model

This is my recommendation.

Use:

Git SHA
↓
Docker build
↓
GHCR immutable digest
↓
container staging environment
↓
ZAP / Bruno / k6 / readiness
↓
same image promoted to production

Vercel can remain useful elsewhere, but it should not be the certification environment for this backend.

This preserves all the work already put into Docker, worker/API parity, immutable images and the release evidence model.

Option B — formally switch the backend to Vercel Functions

Then you must deliberately change Review 46/TRD so the deployable artifact becomes a Vercel deployment/build rather than the GHCR digest.

You would also need to resolve what hosts the long-running worker processes, since those were deliberately packaged alongside the API using the same Docker image.

I would not make this architectural change during final certification.

---

P1 — Docker gate has a fail-open verifier defect

There is a concrete inconsistency in the release evidence right now.

readiness.json currently says:

"dockerVerification": {
"status": "passed"
}

Yet the Docker evidence itself explicitly says:

> final pushed GHCR digest provenance is still pending

and:

> Result: pending release certification.

Those two facts cannot both be true.

Why the verifier misses it

The readiness verifier specially validates:

security;

performance;

staging;

restore;

training;

final approval.

But Docker evidence only gets the generic:

file exists
SHA matches
digest matches

checks. There is no equivalent validateDockerEvidence() checking that the evidence itself says the build/push actually passed.

So a file saying:

Result: pending

can back:

"status": "passed"

provided its SHA/digest strings match.

Required fix

Add a Docker-specific validator requiring at least:

Result: passed;

real CI/build-run URL;

exact candidate SHA;

exact OCI digest;

confirmation that the image was pushed, not merely locally built;

ideally registry/digest provenance.

Until then:

dockerVerification.status

should be missing or failed, not passed.

---

The evidence bundle is otherwise substantially healthier

One good improvement is that the repo has stopped pretending external gates are complete.

readiness.json now correctly reports:

engineeringComplete: true;

stagingCertified: false;

productionApproved: false;

pilotStarted: false;

security failed;

performance missing;

restore missing;

staging missing;

training missing;

sign-off missing.

This is a significant improvement over the earlier evidence bundle that claimed certification against placeholder data.

The Review 46 checklist also correctly says that the remaining work is:

final candidate freeze;

real pushed digest;

same-SHA CI;

all four security gates;

real staging;

ZAP;

k6;

actual Supabase restore;

reconciliation;

real training/sign-off.

The only problem is that none of those Review 46 tasks is checked yet, which is currently accurate.

---

Current gate status

Gate Status Assessment

Financial correctness PASS No remaining P1
Expiry/reminders PASS Race issues closed
Sentry/observability PASS Implemented
CI PASS Current SHA green
Gitleaks PASS Current SHA
Trivy PASS Current SHA
CodeQL PASS Now executes
ZAP MISSING Needs working real staging
Docker build PASS engineering CI builds it
Pushed OCI provenance MISSING Final digest not established
Current Vercel deployment FAIL Health endpoints 500
Real staging certification MISSING Vercel production ≠ certified staging
k6 certification MISSING Real environment still needed
Restore drill MISSING Real provider restore still needed
Training MISSING Real people/sign-off
Final approval MISSING Correctly NO-GO

---

Revised Sprint 5 score

Using the original 100-point rubric:

Area Score

Credit expiry + reminders 25/25
Observability/reconciliation 15/15
Security 12/15
Performance 6/10
Backup/restore 6/15
Container/deployment/rollback 8/10
Runbooks/training 4/5
Final certification 0/5
Pilot readiness 76/100

Engineering-only assessment

98/100 — PASS

The 22-point difference is almost entirely external/operational certification, not unfinished business logic.

---

What I would do next

Do these in this order and nothing broader:

1. Choose the deployment model. I recommend retaining GHCR/container certification rather than changing architecture to Vercel Functions this late.

2. If Vercel is retained even as a test deployment, fix the Prisma/build lifecycle and prove /health/live and /health/ready return 200.

3. Fix the readiness verifier's Docker fail-open.

4. Freeze a new RC at or after f6f75de..., because the SYSTEM actor and CodeQL fixes happened after the previous candidate.

5. Build and push that exact image; capture the real registry digest.

6. Run CI + Gitleaks + Trivy + CodeQL on the same SHA.

7. Deploy the exact digest to real staging.

8. Run migrations → readiness → Bruno/contracts → ZAP → k6 against it.

9. Perform the actual isolated Supabase restore and run financial/reconciliation invariants.

10. Capture real training and approval evidence.

11. Check the readiness checklist and execute the verifier.

12. Close Review 46 and Sprint 5.

Final decision

Sprint 5 engineering is effectively complete. Do not keep polishing the application.

The project is not pilot-ready yet, because the deployed backend currently fails at runtime and the release artifact/evidence chain has not been certified.

The next meaningful review should happen after the deployment strategy and broken health endpoint are resolved. From that point onward, I would review only the Review 46 final gates rather than the codebase generally.
