# Tasks: Restore master-lineage release certification

## Workflow and candidate lineage

- [x] Make staging smoke workflow run only from the protected `master` workflow-run lineage.
- [x] Require full checkout history and verify manually supplied candidates are ancestors of `origin/master`.
- [x] Apply the same master-lineage check to production smoke.
- [x] Bound staging and production health preflight requests with connect and total timeouts.
- [x] Preserve exact candidate/deployed frontend/backend SHA checks.
- [ ] Retire or recreate the remote `staging` branch from the final master candidate through the approved repository process.

## Security and evidence

- [x] Keep request headers, URL, and query data out of application request logs.
- [x] Keep Playwright authentication state outside the evidence directory and remove it during teardown.
- [x] Restrict uploaded smoke artifacts to evidence, manifest, current-run metadata, and JUnit output; do not upload traces or browser auth artifacts.
- [x] Emit non-secret release provenance evidence containing candidate, workflow, deployment, environment, timestamp, and verifier metadata.
- [x] Reject direct SQL device remediation in workflow validation.
- [ ] Rotate `SMOKE_SESSION_BOOTSTRAP_SECRET` after the logging fix and verify the old value is no longer active.
- [ ] Confirm GitHub/Vercel write-only secret stores and deployment environment configuration without recording values.

## Certification

- [ ] Merge the cleaned PR through protected master and freeze one final candidate SHA.
- [ ] Deploy that exact SHA to the intended Vercel environment and verify live/ready health.
- [ ] Run three consecutive smoke certifications against the same final SHA.
- [ ] Attach successful required-check, deployment, reconciliation, and evidence artifacts to the final release record.
- [ ] Record topology, backup/restore, and authenticated business-path benchmark evidence.
