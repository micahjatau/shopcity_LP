# Tasks: Repo review 69 release-candidate closure

## P0 — Report correctness

- [x] Trace and replace UTC-string day-boundary construction with an IANA-timezone-aware exclusive cutoff helper.
- [x] Apply the helper to historical stock/liability and all affected report as-of queries.
- [x] Extend SMS source records/joins to resolve card-linked replacement messages to their customer/branch.
- [x] Preserve receipt-linked, customer-linked, tenant, and branch scope semantics; exclude unresolved ownership.
- [x] Add unit coverage for timezone boundaries and card-linked replacement SMS attribution.
- [x] Add integration coverage for card-linked replacement SMS attribution.
- [x] Add integration coverage for timezone boundaries and next-day exclusion using the supported supervisor timestamp-override fixture.
- [x] Confirm existing `immutable-earn-ledger.int-spec.ts` integration coverage covers duplicate prevention and the Prisma `connection_limit=1` regression.
- [x] Confirm no report/OpenAPI/client contract regeneration is required for the materializer-only change.

## P0 — Candidate lineage

- [x] Inspect current protected `master`, branch divergence, and existing working-tree changes before reconciliation; the working tree was dirty and a backup branch was created.
- [x] Reconcile `chore/release-certification-followup` with current `origin/master` using a conflict-free merge commit; existing changes were stashed and restored unchanged.
- [ ] Open the clean candidate PR and record merge-base, candidate SHA, workflow SHA, and required checks.
- [ ] Classify Vercel projects and obtain owner approval before retiring or disconnecting obsolete projects.
- [ ] Freeze the exact candidate SHA after protected CI, CodeQL, Gitleaks, Trivy, static, frontend, integration, E2E, Docker, and GitNexus gates pass.

## P0 — Runtime certification

- [ ] Run issue #39 duplicate-receipt staging regression against the frozen candidate; prove 409, durable evidence, and no 500.
- [ ] Run issue #40 authenticated k6 report-isolation performance evidence with a valid approved branch fixture.
- [ ] Deploy API, frontend, and long-lived worker from the same candidate SHA.
- [ ] Run issue #41 worker/SMS certification and capture deployment identity, readiness, and terminal provider/outbox states without sensitive data.
- [ ] Run issue #42 final release-evidence verifier and record all residual risks.
- [ ] Promote only the frozen, fully evidenced candidate and rerun production smoke against that same SHA.

## P1 — Verification and documentation

- [x] Run targeted report tests, lint, typecheck, build, unit/integration suites, targeted Semgrep, and OpenSpec validation.
- [ ] Run full Semgrep and affected Playwright/smoke workflows.
- [ ] Run GitNexus `detect_changes()` and confirm only expected symbols and execution flows are affected.
- [ ] Update release, deployment, reporting, and migration trackers with exact evidence and environment-gated items.
- [ ] Record rollback pairing for API/worker and preserve append-only audit, outbox, SMS, and ledger evidence.
