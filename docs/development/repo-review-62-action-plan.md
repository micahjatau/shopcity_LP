# Repo Review 62 Action Plan

## Objective

Make the role-based staging smoke gate deterministic and safe for the single shared staging smoke tenant, then complete release certification without weakening reconciliation.

## Current baseline

- Latest reviewed candidate: `0262db8eab3411cc405237288cff67201a0ff7d6`.
- Latest functional result: `43/43` smoke tests passed.
- Current failure: teardown reports `open fraud flags`.
- Root cause: normalized receipt tags uppercase the run suffix while cleanup compares case-sensitively.
- Existing broad cleanup patch (`SMOKE-`) must not be treated as the final ownership model.
- Staging has one mutable smoke tenant and must never run concurrent certification mutations.

## Workstream 1 — Correct run-scoped fraud cleanup (P0)

- [ ] Update `resolveTaggedSmokeFraudFlags()` in `apps/web/tests/smoke/support/fixtures.ts` to compare the tag prefix case-insensitively.
  - Normalize `tagPrefix` once with `.toUpperCase()`.
  - Normalize the stored receipt number before `startsWith()`.
  - Retain the run-specific prefix; do not use a global `SMOKE-` prefix in teardown.
- [ ] Restore teardown cleanup in `apps/web/tests/smoke/global-teardown.ts` to pass `run.smokeRunId`.
- [ ] Add a regression test proving:
  - run ID suffix is lowercase;
  - persisted normalized receipt suffix is uppercase;
  - only the matching run is resolved;
  - another run's flag remains open.
- [ ] Add a regression test proving a shared `SMOKE-` prefix cannot cause cross-run cleanup.
- [ ] Verify cleanup is idempotent when a flag is already resolved or a decision is retried.

### Acceptance

- A run-created `FR-DUP-001`, `FR-HV-001`, or `FR-HV-002` flag is resolved during teardown.
- Flags belonging to another run are not resolved.
- Final open-fraud state returns to the pre-run state.

## Workstream 2 — Serialize stateful staging smoke runs (P0)

- [ ] Change `.github/workflows/staging-smoke.yml` concurrency to one global staging group:
  ```yaml
  concurrency:
    group: shopcity-staging-smoke
    cancel-in-progress: false
  ```
- [ ] Confirm manual dispatches and release-triggered runs use the same group.
- [ ] Document that the staging smoke tenant is single-writer state.
- [ ] Verify a second candidate waits rather than cancelling a run in the middle of financial mutations.
- [ ] Ensure worker cleanup and smoke teardown run on cancellation/interruption paths where GitHub permits it.
- [ ] Keep production smoke in its own non-canceling, approval-gated concurrency group.

### Acceptance

- No two staging smoke jobs can mutate the shared smoke tenant simultaneously.
- A queued candidate cannot cause an active candidate to skip reconciliation.

## Workstream 3 — Strengthen fraud baseline restoration (P0)

- [ ] Extend `SmokeBaseline` to capture the exact set of initially open smoke-tenant fraud flag IDs, not only `openCount`.
- [ ] Capture stable identifying fields for each baseline flag where safe:
  - ID;
  - rule code;
  - subject ID/type;
  - status.
- [ ] Add a teardown assertion that:
  - all baseline open IDs remain open unless intentionally changed and restored;
  - no run-owned open flags remain;
  - no unexpected new open flags exist.
- [ ] Keep the count invariant as a secondary diagnostic, not the primary proof.
- [ ] Ensure baseline IDs and evidence contain no secrets or unnecessary PII.

### Acceptance

The following state must fail reconciliation even if counts match:

```text
baseline: A, B, C
final:    B, C, D
```

## Workstream 4 — Verify the worker and outbox fixes (P0)

- [ ] Add a regression test for the publisher CAS transition:
  - publisher claims `QUEUED`;
  - consumer completes the row;
  - publisher update affects zero rows;
  - `COMPLETED` and `processedAt` survive.
- [ ] Add normal publisher-first and consumer-first tests.
- [ ] Add BullMQ tests for existing waiting, active, locked, completed, and failed jobs.
- [ ] Confirm no `job could not be removed because it is locked` errors occur.
- [ ] Add a test for repair of `processedAt != NULL` plus non-`COMPLETED` status.
- [ ] Add a database migration for:
  ```sql
  CHECK ("processedAt" IS NULL OR "status" = 'COMPLETED')
  ```
- [ ] Before applying the constraint to shared environments:
  - enumerate invalid rows;
  - repair through an auditable procedure;
  - record the operation in `docs/database/migration-tracker.md`;
  - apply and validate the migration.
- [ ] Verify the dedicated smoke tenant reaches zero outbox backlog before baseline capture.
- [ ] Verify terminal SMS envelopes become `COMPLETED`.
- [ ] Verify no report materialization state remains `RUNNING` after worker shutdown.

## Workstream 5 — Worker lifecycle and shutdown (P1)

- [ ] Keep `SHOPCITY_WORKER_READY` as the readiness contract.
- [ ] Launch the actual Node worker process in staging, not an npm wrapper.
- [ ] Send `SIGTERM` to the actual worker PID.
- [ ] Wait for process exit with a bounded timeout.
- [ ] Force-kill only after timeout and fail the job visibly.
- [ ] After shutdown, query materialization state and assert no state is `RUNNING`.
- [ ] Preserve worker logs as safe artifacts without printing database URLs or secrets.
- [ ] Evaluate independent runtime failure isolation after smoke certification:
  - report failure must not silently terminate outbox processing;
  - report degradation must be observable;
  - outbox/fraud/SMS processing must remain independently healthy where possible.

## Workstream 6 — Smoke baseline and teardown semantics (P0)

- [ ] Require inherited smoke-tenant outbox backlog to reach zero before `captureBaseline()`.
- [ ] Fail setup as `FAIL_INFRASTRUCTURE` if zero is not reached within the configured timeout.
- [ ] Capture baseline only after worker readiness and zero backlog.
- [ ] Capture offline retry count in the baseline and compare final state against it.
- [ ] Resolve run-owned fraud flags before final invariant evaluation.
- [ ] Reconcile financial artifacts before restoring mutable fixtures.
- [ ] Retain strict zero/expected-equality assertions; never accept positive drift.
- [ ] Make teardown errors primary and avoid secondary undefined-state errors when setup fails.

## Workstream 7 — Runtime deployment provenance (P1)

- [ ] Keep backend runtime SHA verification through `/api/v1/reports/pilot-operations-summary`.
- [ ] Ensure Vercel production `RELEASE_SHA` is set to the deployed candidate SHA before smoke.
- [ ] Add equivalent actual frontend runtime provenance rather than relying only on `SMOKE_DEPLOYED_FRONTEND_SHA`.
- [ ] Record deployment IDs, candidate SHA, and runtime SHA in evidence.
- [ ] Fail before mutations on any provenance mismatch.
- [ ] Do not treat manually maintained GitHub SHA variables as sole proof.

## Workstream 8 — OpenSpec and evidence reconciliation (P1)

- [ ] Reconcile `openspec/changes/role-based-production-smoke-tests/tasks.md` with actual implementation versus verified evidence.
- [ ] Resolve remaining tasks:
  - `4.8` deterministic fraud fixtures and mandatory Supervisor decision;
  - `5.6` staging Cashier proof;
  - `6.2–6.6` Supervisor workflow proof;
  - `7.2–7.5` Admin workflow/report/export proof;
  - `10.3` staging Offline Earn proof;
  - `11.1` release-candidate workflow trigger;
  - `15.1`, `15.3–15.7` release gate.
- [ ] Regenerate `docs/release-evidence/sprint-5-pilot/readiness.json` for the final frozen SHA.
- [ ] Remove stale SHA `78b186af...` evidence.
- [ ] Resolve contradictory training/signoff records using real operator evidence.
- [ ] Add provider-managed backup/restore evidence.
- [ ] Add persistent production worker deployment and heartbeat/provenance evidence.

## Workstream 9 — Branch and release governance (P0)

- [ ] Reconcile the feature branch with current `master` before final certification.
- [ ] Resolve conflicts in deployment, security, proxy, runtime, and workflow files deliberately.
- [ ] Open/update the pull request.
- [ ] Run full CI on the post-reconciliation SHA.
- [ ] Do not reuse staging evidence from a pre-merge SHA.
- [ ] Freeze the exact final SHA only after merge/reconciliation and CI success.

## Workstream 10 — Certification sequence (P0 release gate)

- [ ] Deploy API and frontend for the frozen final SHA.
- [ ] Verify actual runtime provenance.
- [ ] Verify worker readiness and zero inherited outbox backlog.
- [ ] Run staging smoke #1.
- [ ] Require:
  - `43 passed`;
  - reconciliation PASS;
  - fraud baseline restored;
  - offline baseline restored;
  - balance restored;
  - outbox backlog zero;
  - worker shutdown clean;
  - evidence verification PASS.
- [ ] Repeat with the same SHA and unchanged environment for staging smoke #2.
- [ ] Repeat for staging smoke #3.
- [ ] If code or deployment configuration changes, restart the three-run sequence.
- [ ] Attach all three run artifacts to the release evidence.
- [ ] Keep production smoke blocked until staging certification and isolated-tenant readiness are complete.
- [ ] Obtain explicit approval before one production smoke execution.

## Verification commands

```bash
npm run format:check
npm run lint:src
npm run lint:test
npm run typecheck
npm run build
npm run test -- --runInBand
npm run test:integration
npm run test:e2e
npm run openspec:validate
npm run openapi:lint
npm run verify:release-artifacts
node scripts/gitnexus.cjs detect_changes -r shopcity_LP --scope compare --base-ref master
```

## Stop conditions

Do not proceed to production smoke if any of the following is true:

- staging fraud cleanup is broader than the run-owned prefix;
- staging concurrency permits overlapping mutations;
- outbox backlog is nonzero at baseline or teardown;
- actual runtime SHA cannot be proven;
- any report materialization state remains `RUNNING`;
- evidence is tied to a pre-merge SHA;
- backup/restore, worker deployment, or required human approvals are missing.
