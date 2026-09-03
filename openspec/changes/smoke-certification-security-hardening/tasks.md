# Tasks

## P0 — Auth artifacts and sessions

- [ ] Move role storage-state files from `test-results/smoke/**` to `$RUNNER_TEMP/shopcity-smoke-auth/<run-id>/`.
- [ ] Ensure smoke evidence contains no auth path or storage-state reference.
- [ ] Exclude `auth/**`, cookies, traces with auth state, and session files from artifact upload.
- [ ] Revoke all smoke-created sessions during teardown.
- [ ] Delete temporary auth files on success and failure.
- [ ] Extend evidence verifier rejection rules for cookies, storageState, session/token, csrf, authorization, bearer, and password fields.
- [ ] Add unit tests proving auth state cannot be serialized or uploaded.
- [ ] Add optional session lifetime to backend issuance; retain 12-hour ordinary login lifetime.
- [ ] Configure smoke bootstrap sessions for 15 minutes (or an explicitly documented 10–30 minute value).
- [ ] Add session-lifetime and teardown-revocation tests.

## P0 — Bootstrap endpoint protection

- [ ] Add an explicit IP throttle for `POST /auth/smoke-session` using a dedicated bucket, limit, and window.
- [ ] Confirm `RequestThrottleGuard` applies the route-specific policy.
- [ ] Add tests for below-limit success, over-limit rejection, and fail-closed configuration.
- [ ] Confirm throttle responses do not disclose the bootstrap secret or session material.

## P0 — Workflow trust boundary

- [ ] Require `workflow_run.repository.full_name == github.repository` before checkout or secret exposure.
- [ ] Restrict accepted workflow-run branch/event/conclusion to the trusted release contract.
- [ ] Set least-privilege workflow permissions (`contents: read`).
- [ ] Set `persist-credentials: false` on checkout.
- [ ] Make manual dispatch checkout `inputs.candidate_sha` directly.
- [ ] Verify exact checked-out SHA before database, worker, or smoke operations.
- [ ] Add workflow validation/tests for fork/untrusted repository and mismatched dispatch SHA cases.

## P0 — Scoped staging repair

- [ ] Scope any attestation repair query to `SMOKE_TENANT_ID` and `SMOKE_DEVICE_ID`.
- [ ] Prefer supported authorized device rotation over direct generic SQL remediation.
- [ ] Emit only safe count/ID diagnostics; never emit secrets or ciphertext.
- [ ] Add a guard that fails if any non-smoke device would be modified.
- [ ] Record the one-time staging reconciliation in the migration tracker/runbook.

## P0 — Dependency security

- [ ] Update `fast-uri` override and lockfile to `4.1.3`.
- [ ] Rebuild the actual candidate image from a clean install.
- [ ] Run Trivy with HIGH/CRITICAL severity gates.
- [ ] Do not add vulnerability ignores or VEX exceptions for these SSRF/host-confusion findings.

## P1 — Outbox recovery and migration safety

- [ ] Include `SENT` in terminal SMS recovery (`SENT`, `DELIVERED`, `SUPPRESSED`).
- [ ] Add a crash-window regression test for `SENT` plus incomplete outbox completion.
- [ ] Make migration repair cover every invalid processed row, including dead-lettered rows, or explicitly encode a reviewed exception.
- [ ] Seed every invalid `processedAt`/status combination, including dead-lettered rows, before migration tests; verify repair, then separately verify the resulting constraint rejects newly inserted invalid rows. Inspect `contype = 'c'` and `pg_get_constraintdef()`.
- [ ] Restore `20260804_device_attestation_cutover/migration.sql` to its original immutable content.
- [ ] Add a forward compatibility migration if needed.
- [ ] Back up and reconcile staging Prisma history once using a reviewed procedure.
- [ ] Remove repeated `migrate resolve ... || true` calls from the normal staging certification workflow.
- [ ] Make normal certification use strict `npx prisma migrate deploy`.
- [ ] Record backup, repair, migration, and post-deploy checks in `docs/database/migration-tracker.md`.

## P1 — Review and release proof

- [ ] Triage every CodeRabbit Major finding; resolve valid findings and document accepted residual risk.
- [ ] Run all CI, security, integration, frontend, GitNexus, and Vercel checks.
- [ ] Merge the PR only after required checks and review approval pass.
- [ ] Freeze the resulting master SHA after merge.
- [ ] Deploy frontend, API, and worker from that exact master SHA.
- [ ] Verify runtime provenance from deployed services.
- [ ] Run three consecutive staging certifications against that final SHA.
- [ ] Refresh final evidence manifests and readiness records.
- [ ] Obtain provider-managed backup/restore and operational readiness evidence.
- [ ] Keep production smoke blocked until explicit approval.

## Acceptance

- No authenticated browser state is present in uploaded artifacts.
- Bootstrap sessions are short-lived, throttled, and revoked.
- Untrusted workflow-run sources cannot receive staging secrets or execute candidate code.
- Staging repair cannot touch unrelated devices.
- Trivy passes with no HIGH/CRITICAL findings.
- Outbox recovery and migration invariants are complete and tested.
- Final merged master SHA has three clean staging certifications and complete release evidence.
