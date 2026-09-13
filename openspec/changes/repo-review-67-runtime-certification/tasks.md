# Tasks: Review 67 runtime certification closure

## P0 — Duplicate receipt correctness

- [x] Trace the current duplicate-receipt branch and define a typed result/transaction boundary that does not nest Prisma transactions.
- [x] Refactor `LoyaltyService.earn()` and `recordDuplicateReceiptAttempt()` so the financial transaction rolls back before evidence persistence begins.
- [x] Persist duplicate-attempt audit and `fraud.evaluate` outbox evidence atomically in the follow-up transaction.
- [x] Preserve tenant, branch, cashier, customer, device, receipt, and timestamp metadata without adding financial mutations.
- [x] Add unit coverage for duplicate detection and the existing 409 contract.
- [x] Add unit coverage for duplicate-evidence persistence failure handling.
- [x] Add an integration regression using Prisma `connection_limit=1`; assert duplicate earn returns 409 and durable evidence exists.
- [x] Verify normal earn idempotency and ledger invariants remain unchanged.

## P0 — Worker runtime and provenance

- [x] Select and document the supported long-lived worker deployment target without introducing a second application architecture.
- [x] Build and launch the actual `dist/src/worker.js` entrypoint from the candidate SHA in staging smoke.
- [x] Expose or collect worker readiness evidence based on `SHOPCITY_WORKER_READY`.
- [x] Add worker runtime SHA and deployment identity to the release provenance contract.
- [x] Fail certification before fixture mutation when API and worker candidate/runtime SHAs differ.
- [x] Add bounded worker startup, shutdown, and readiness checks with safe logs.
- [ ] Add staging smoke coverage for earn → outbox event → worker processing → terminal SMS-provider state.
- [x] Ensure worker evidence redacts credentials, provider payloads, cookies, and session material.

## P0 — Production SMS safety

- [x] Remove `SMS_PROVIDER_MODE=deterministic` and `ALLOW_FAKE_SMS_IN_PRODUCTION=true` from checked-in production deployment configuration.
- [x] Require production configuration to use `SMS_PROVIDER_MODE=real` and reject fake providers unless an explicitly non-production environment is selected.
- [x] Add configuration/provider-factory tests for unsafe production combinations and valid real-provider configuration.
- [x] Update deployment runbooks and release checklists with the real-SMS requirements.
- [x] Define secret-store verification requirements without recording secret values in repository evidence; execution remains remote-operator gated.

## P1 — Performance fixture validity

- [x] Make `K6_REPORT_BRANCH_ID` explicit for report-isolation runs; remove the nonexistent UUID fallback.
- [x] Validate the configured branch exists during k6 setup using the authenticated test session.
- [x] Fail setup clearly before scenario execution when the fixture is absent or inaccessible.
- [x] Add tests for valid, missing, and inaccessible report fixture configuration.
- [x] Record safe fixture identity and setup result requirements in performance evidence.

## P1 — Card and report correctness

- [x] Trace card assignment, replacement, block/unblock, and concurrency paths and define one server-side card-serial canonicalization rule.
- [x] Apply canonicalization at card lookup, creation, replacement, earn, redeem, and offline-sync boundaries.
- [x] Add unit coverage for surrounding whitespace and empty serial handling.
- [x] Add the required card-replacement SMS outbox event and unit coverage that it is emitted once.
- [ ] Add runtime smoke coverage for card assignment, replacement, block/unblock, and replacement concurrency; capture outcomes rather than relying on an empty error log.
- [x] Document executive-summary metric semantics for stock versus flow values, SMS queued counts, redemptions, and cashier activity.
- [ ] Correct report read models/queries/contracts to match those definitions and add integration tests for non-zero and empty-state fixtures.
- [ ] Confirm valid report requests remain fast after the correctness changes.

## P1 — Release evidence and verification

- [x] Extend release evidence schema/verifier for worker deployment ID, worker runtime SHA, and readiness.
- [x] Extend release evidence requirements for terminal outbox/provider state and SMS state counts.
- [x] Add a release gate requiring API/worker provenance match and successful worker smoke evidence.
- [ ] Run duplicate-receipt staging regression against the certified candidate and confirm no 500 responses. (Local integration regression passed; certified staging evidence remains pending.)
- [ ] Run the corrected k6 report-isolation performance suite and confirm no invalid-fixture 404 burst.
- [ ] Run a real-SMS or approved provider-terminal-state smoke and distinguish enqueue, queued, attempted, delivered, suppressed, and failed outcomes.
- [ ] Run lint, typecheck, build, unit/integration tests, Semgrep, affected Playwright/smoke tests, and OpenSpec validation. (Local lint/typecheck/build/integration/OpenSpec gates passed; staging/production smoke and full Semgrep remain pending.)
- [x] Run GitNexus `detect_changes()` and inspect the final diff/status before certification.
- [x] Record residual operational risks and update the migration/release evidence trackers where applicable.

## P2 — Infrastructure and dependency hygiene

- [x] Document the named Vercel project inventory procedure; live classification remains gated on Vercel auth/owner approval.
- [x] Document that obsolete projects may be retired/disconnected only after explicit owner approval and post-change alias verification.
- [x] Document the `vercel.json` build-settings source-of-truth and warning handling procedure.
- [x] Review deprecated dependency and Prisma/allow-scripts warning handling and document accepted residual-risk procedure.
