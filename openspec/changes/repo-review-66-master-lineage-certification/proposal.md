# Proposal: Restore master-lineage release certification

## Why

`docs/repo_review_66.md` shows that the current staging smoke campaign is certifying a severely divergent branch rather than the hardened master lineage. `staging` is 123 commits behind and 18 commits ahead of `master`, and recent runs (`34036853253`, `34037050770`, `34037831490`, and `34038230680`) all exercised staging-only code. Their 401 failures therefore do not provide valid pilot-certification evidence for the current product candidate.

Continuing to patch the long-lived staging branch recreates fixes already present on master, weakens workflow trust, and risks certifying behavior that will not ship. Release certification must converge on one exact, master-based candidate SHA.

## What changes

### Candidate lineage and deployment

- Stop treating the divergent `staging` branch as a release-certification source.
- Do not merge `staging` into `master`.
- Finish and merge PR #20 through the supported protected-master flow after rebasing or otherwise reconciling it with the final master head.
- Create one immutable final candidate SHA from the resulting master lineage and require the deployed backend and frontend to report that exact SHA.
- Deploy that candidate to the configured Vercel preview/staging environment with the complete runtime configuration before smoke execution.
- Retire the long-lived staging branch from certification, or recreate it from the final master candidate with no independent staging-only implementation commits.

### Certification workflow integrity

- Run the smoke workflow definition from the same master-based lineage as the candidate.
- Preserve the hardened smoke-session bootstrap and Vercel protection-bypass behavior for API and browser requests.
- Remove direct SQL device-state repair from certification; use inspection and an authorized, scoped operational repair path, or fail closed.
- Require trusted repository, branch, successful upstream workflow, exact candidate SHA, and protected-branch provenance for privileged workflow execution.
- Add bounded `--connect-timeout 10` and `--max-time 30` flags to both health preflight curl commands.
- Keep failed runs caused by divergent staging-only code classified as infrastructure/non-certification evidence rather than product certification results.

### Security and evidence

- Merge request logging redaction for headers, URL, and query data before certification resumes.
- Rotate `SMOKE_SESSION_BOOTSTRAP_SECRET` after the logging exposure is closed and update only the write-only secret stores required by the workflow and deployment.
- Ensure uploaded evidence contains no cookies, storage state, session tokens, authorization headers, passwords, or bootstrap secrets.
- Record candidate SHA, workflow SHA, deployment SHA, environment, timestamp, required-check results, and verifier version in immutable release evidence.
- Run three consecutive certifications against the same final SHA, with health, release-SHA, worker-readiness, scenario, reconciliation, and evidence gates passing.

## Capabilities

### New capabilities

- `master-lineage-release-certification`: Certify only an exact deployed candidate produced from protected master lineage.
- `release-candidate-provenance`: Produce immutable evidence linking source, workflow, checks, deployment, environment, and verifier.
- `trusted-smoke-workflow-execution`: Prevent privileged smoke execution from untrusted or divergent workflow contexts.

### Modified capabilities

- `staging-smoke-certification`: Stop using long-lived staging-only code and require bounded, bypass-aware, exact-SHA execution.
- `smoke-security-evidence`: Close request-log leakage, rotate exposed bootstrap credentials, and exclude authentication material from artifacts.
- `deployment-health-preflight`: Bound health-check network operations while retaining live/ready checks.

## Impact

- GitHub workflows under `.github/workflows/`, especially staging/production smoke and CI workflow trust conditions.
- Smoke client/configuration under `apps/web/tests/smoke/` and Playwright configuration.
- Request logging in `src/app.module.ts` and release-SHA/report provenance endpoints.
- Vercel project branch/environment configuration and deployment alias management.
- GitHub protected-branch/PR checks and write-only staging secrets.
- Release evidence schemas, scripts, runbooks, and `docs/repo_review_66.md` follow-up records.
- No financial calculation, ledger, approval, fraud, or reconciliation-domain behavior is changed.

## Acceptance criteria

- The certified candidate is a commit reachable from the final protected `master` lineage; no certification run uses the divergent staging-only head.
- The deployed frontend and backend each report the exact final candidate SHA.
- Both health preflights fail boundedly and return HTTP 200 before smoke setup proceeds.
- Role bootstrap reaches the protected deployment with the required bypass header and smoke-session secret, without exposing either in logs or artifacts.
- Privileged workflow execution rejects untrusted repository/branch/upstream provenance and candidate-SHA mismatches.
- Certification performs no direct SQL device mutation and uses only the dedicated, scoped smoke fixture path.
- Three consecutive runs pass all smoke, worker, reconciliation, and evidence gates against the same SHA.
- The rotated bootstrap secret is active only in the intended write-only stores and no prior secret is retained for certification.

## Non-goals

- No merge of the divergent `staging` branch into `master`.
- No financial-engine, ledger, balance-authority, approval, fraud, or reconciliation rewrite.
- No GraphQL, microservices, or new deployment platform.
- No automatic deletion of the Vercel project or broad staging-data cleanup.
- No claim that the existing `ab2180e2` smoke runs constitute pilot certification.
