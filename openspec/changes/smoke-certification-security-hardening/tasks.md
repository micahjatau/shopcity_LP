# Tasks

## P0 — Auth artifacts and sessions

- [x] Move role storage-state files from `test-results/smoke/**` to `$RUNNER_TEMP/shopcity-smoke-auth/<run-id>/`.
- [x] Ensure smoke evidence contains no auth path or storage-state reference.
- [x] Exclude `auth/**`, cookies, traces with auth state, and session files from artifact upload.
- [x] Revoke all smoke-created sessions during teardown.
- [x] Delete temporary auth files on success and failure.
- [x] Extend evidence verifier rejection rules for cookies, storageState, session/token, csrf, authorization, bearer, and password fields.
- [x] Add unit tests proving auth state cannot be serialized or uploaded.
- [x] Add optional session lifetime to backend issuance; retain 12-hour ordinary login lifetime.
- [x] Configure smoke bootstrap sessions for 15 minutes (or an explicitly documented 10–30 minute value) at issuance; refresh-session lifetime enforcement remains open below.
- [x] Add session-lifetime and teardown-revocation tests.

## P0 — Bootstrap endpoint protection

- [x] Add an explicit IP throttle for `POST /auth/smoke-session` using a dedicated bucket, limit, and window.
- [x] Confirm `RequestThrottleGuard` applies the route-specific policy.
- [x] Add tests for below-limit success, over-limit rejection, and fail-closed configuration.
- [x] Confirm throttle responses do not disclose the bootstrap secret or session material.

## P0 — Workflow trust boundary

- [x] Require `workflow_run.repository.full_name == github.repository` before checkout or secret exposure.
- [x] Restrict accepted workflow-run branch/event/conclusion to the trusted release contract.
- [x] Set least-privilege workflow permissions (`contents: read`).
- [x] Set `persist-credentials: false` on checkout.
- [x] Make manual dispatch checkout `inputs.candidate_sha` directly.
- [x] Verify exact checked-out SHA before database, worker, or smoke operations.
- [x] Add workflow validation/tests for fork/untrusted repository and mismatched dispatch SHA cases.

## P0 — Scoped staging repair

- [x] Scope any attestation repair query to `SMOKE_TENANT_ID` and `SMOKE_DEVICE_ID`.
- [x] Prefer supported authorized device rotation over direct generic SQL remediation.
- [x] Emit only safe count/ID diagnostics; never emit secrets or ciphertext.
- [x] Add a guard that fails if any non-smoke device would be modified.
- [ ] Record the one-time staging reconciliation in the migration tracker/runbook.

## P0 — Dependency security

- [x] Update `fast-uri` override and lockfile to `4.1.3`.
- [x] Rebuild the actual candidate image from a clean install.
- [x] Run Trivy with HIGH/CRITICAL severity gates.
- [x] Do not add vulnerability ignores or VEX exceptions for these SSRF/host-confusion findings.

## P1 — Outbox recovery and migration safety

- [x] Include `SENT` in terminal SMS recovery (`SENT`, `DELIVERED`, `SUPPRESSED`).
- [x] Add a crash-window regression test for `SENT` plus incomplete outbox completion.
- [x] Make migration repair cover every invalid processed row, including dead-lettered rows, or explicitly encode a reviewed exception.
- [x] Seed every invalid `processedAt`/status combination, including dead-lettered rows, before migration tests; verify repair, then separately verify the resulting constraint rejects newly inserted invalid rows. Inspect `contype = 'c'` and `pg_get_constraintdef()`.
- [x] Restore `20260804_device_attestation_cutover/migration.sql` to its original immutable content.
- [x] Add a forward compatibility migration if needed.
- [ ] Back up and reconcile staging Prisma history once using a reviewed procedure.
- [ ] Remove repeated `migrate resolve ... || true` calls from the normal staging certification workflow.
- [x] Make normal certification use strict `npx prisma migrate deploy`.
- [ ] Record backup, repair, migration, and post-deploy checks in `docs/database/migration-tracker.md`.

## P1 — Review and release proof

- [ ] Triage every CodeRabbit Major finding; resolve valid findings and document accepted residual risk.
- [x] Fix smoke-session refresh so a smoke session cannot be renewed into the ordinary 12-hour lifetime.
- [x] Fix Approval Panel handling of non-2xx generated-client responses and preserve actionable error state after refresh.
- [x] Correct the approval-threshold smoke test to enter naira units while asserting the kobo boundary.
- [ ] Eliminate or formally replace the divergent long-lived staging workflow branch; certify from the trusted master/candidate workflow definition.
- [ ] Enforce staging certification before production promotion in the release pipeline.
- [ ] Define and implement the durable image-artifact strategy: promote the exact image scanned by Trivy, or document and approve Vercel’s source-build alternative with residual risk.
- [ ] Rewrite the Trivy requirement to distinguish fixable HIGH/CRITICAL vulnerabilities from unfixed advisories, including inventory, applicability review, time-limited acceptance, and automatic blocking after fixes publish.
- [ ] Add persistent production worker heartbeat and release-SHA provenance evidence, and verify freshness and SHA match operationally.
- [ ] Run the approval-gated ZAP baseline against the certified staging release.
- [ ] Complete provider-managed backup/restore proof and operational readiness evidence.
- [ ] Complete role/operator training and signoffs.
- [ ] Regenerate final readiness evidence and repeat three staging certifications after the final fixes produce a new merged master SHA.
- [ ] Trigger one approved production smoke only after staging PASS and isolated-tenant readiness.
- [ ] Resolve final verification findings, inspect the final diff/status, and record remaining operational risks before formal certification.
- [x] Run all CI, security, integration, frontend, GitNexus, and Vercel checks.
- [x] Merge the PR only after required checks and review approval pass.
- [x] Freeze the resulting master SHA after merge.
- [x] Deploy frontend, API, and worker from that exact master SHA.
- [x] Verify runtime provenance from deployed services.
- [x] Run three consecutive staging certifications against that final SHA.
- [ ] Refresh final evidence manifests and readiness records.
- [ ] Obtain provider-managed backup/restore and operational readiness evidence.
- [x] Keep production smoke blocked until explicit approval.

## Acceptance

- No authenticated browser state is present in uploaded artifacts.
- Bootstrap sessions are short-lived, throttled, and revoked.
- Untrusted workflow-run sources cannot receive staging secrets or execute candidate code.
- Staging repair cannot touch unrelated devices.
- Trivy passes with no HIGH/CRITICAL findings.
- Outbox recovery and migration invariants are complete and tested.
- Final merged master SHA has three clean staging certifications and complete release evidence.
