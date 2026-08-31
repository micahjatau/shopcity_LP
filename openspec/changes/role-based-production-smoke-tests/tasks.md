## 1. Establish smoke configuration and runner

- [x] 1.1 Create `apps/web/playwright.smoke.config.ts` with smoke-only test discovery, serial execution, retries, timeout, JUnit/HTML/list reporters, traces, screenshots, global setup, and global teardown.
- [x] 1.2 Create strict `SmokeConfig` parsing for staging/production, exact URLs, 40-character candidate SHA, tenant/branch/device IDs, active/inactive/staff fixtures, spare cards, and separate Admin/Supervisor/Cashier credentials.
- [x] 1.3 Validate Cashier device identity against the configured smoke device and reject absent or malformed values with safe field-specific errors.
- [x] 1.4 Add a versioned, non-secret smoke-fixture manifest containing expected tenant/branch relationships, fixture IDs/serials, statuses, eligibility, and manifest version; require configuration to select an explicit manifest version.
- [x] 1.5 Create `SmokeRun`, `SmokeOutcome`, UTC run-ID generation, output/evidence paths, timestamps, and current-run metadata handling.
- [x] 1.6 Add root and web package scripts for generic, staging, production, and focused Cashier smoke execution.
- [x] 1.7 Add configuration/run-ID tests covering missing production fixtures, malformed SHA/URLs, device mismatch, manifest mismatch, deterministic IDs, and secret-free paths.
- [x] 1.8 Run smoke support tests and web typecheck before proceeding.

## 2. Implement authenticated API and UI role helpers

- [x] 2.1 Create CSRF-aware `SmokeApiSession` using the existing same-origin `/api/v1` proxy and Playwright request context.
- [x] 2.2 Authenticate Admin, Supervisor, and Cashier with the existing login contract; preserve Cashier device headers and attestation semantics.
- [x] 2.3 Attach CSRF and run-scoped idempotency headers to mutations and parse success/error envelopes without exposing sensitive response data.
- [x] 2.4 Create UI login/logout helpers using current labels and assert `/cashier`, `/supervisor`, and `/admin` landing routes.
- [x] 2.5 Test cookie-to-CSRF extraction, mutation headers, safe API errors, role-specific login, and logout authorization state.

## 3. Add deterministic fixture preflight and baseline management

- [x] 3.1 Create fixture models for tenant, branch, users, device, active/inactive/staff customer-card pairs, spare cards, and baseline state.
- [x] 3.2 Verify configured identities through normal APIs, including tenant/branch scope, role identity, device branch/status, card ownership/status, and customer eligibility.
- [x] 3.3 Fail closed on missing, mismatched, or ambiguous fixtures; prohibit create-on-missing and fuzzy production discovery.
- [x] 3.4 Capture mutable baseline state including balance, statuses, card assignment, device state, and reversible profile/branch values.
- [x] 3.5 Reset mutable fixtures idempotently before tests using real APIs and run-scoped idempotency keys.
- [x] 3.6 Implement global setup to load config, create run, authenticate Admin, preflight, snapshot, reset, and write secret-free `current-run.json`.
- [x] 3.7 Test wrong-tenant/wrong-branch fixtures, missing resources, manifest mismatch, baseline capture, reset idempotency, and setup failure semantics.

## 4. Build evidence, timing, reconciliation, and teardown core

- [x] 4.1 Create workflow evidence, financial-artifact registration, outcome classification, manifest, summary, and reconciliation models.
- [x] 4.2 Implement atomic, secret-rejecting evidence writes with safe references, route names, IDs, statuses, timings, and candidate SHA only.
- [x] 4.3 Implement `measureWorkflow()` and capture lookup, Earn, Redeem, approval, and report-load durations.
- [x] 4.4 Implement canonical Earn reversal, Redeem restoration/reversal, and compensating adjustment logic; never delete immutable rows.
- [x] 4.5 Ensure every financial artifact registration and reconciliation status is atomically persisted in `current-run.json`/evidence, so teardown can recover after runner interruption; ensure already-reversed artifacts are not reversed twice and pending/rejected operations remain terminal and expected.
- [x] 4.6 Implement post-run invariants for balance, approvals, fraud flags, device/card/customer state, offline retry records, credit lots, outbox backlog, and terminal run artifacts.
- [x] 4.7 Add a persistent production safety lock: set it on reconciliation/invariant failure, check it before mutation, and provide an authorized auditable clear operation.
- [ ] 4.8 Provision deterministic smoke-scoped fraud fixtures and make Supervisor fraud review/decision mandatory in the production-ready matrix.
- [x] 4.9 Implement global teardown that runs after failures, reads current-run metadata, reconstructs the persisted artifact registry, reconciles, restores, checks invariants, writes final evidence, and fails on reconciliation errors.
- [x] 4.10 Add unit tests for `PASS`, `FAIL_TEST`, `FAIL_RECONCILIATION`, redaction, artifact persistence/recovery, canonical compensation, invariant failures, and safety-lock behavior.

## 5. Implement Cashier core workflow smoke tests

- [x] 5.1 Authenticate as Cashier and verify shell route, device/branch context, scanner/manual lookup affordance, and active-card customer projection.
- [x] 5.2 Execute a below-threshold confirmed Earn through the UI with a run-tagged receipt; verify ledger, credit lot, balance, and register the artifact for reversal.
- [x] 5.3 Execute a small Redeem through the UI; verify confirmation, FIFO allocation presence, and register the artifact for reversal.
- [x] 5.4 Verify customer-safe context, today's activity surface, Sync Queue surface, and logout/session flow.
- [x] 5.5 Capture timings and evidence for lookup, Earn, Redeem, activity, queue, and logout paths.
- [ ] 5.6 Run against a configured staging candidate and prove teardown restores mutable state and financial balance.

## 6. Implement Supervisor workflow smoke tests

- [x] 6.1 Add and validate at least two spare smoke-card serials in configuration.
- [ ] 6.2 Verify Supervisor login/routing, customer search, synthetic run-tagged customer registration, profile edit, status changes, and restoration.
- [ ] 6.3 Verify card assignment, replacement, block/unblock, old/new lifecycle, and baseline restoration using spare cards.
- [ ] 6.4 Verify transaction search/detail, approval acceptance/rejection, smoke-scoped fraud review where provisioned, reports, and materialization visibility.
- [x] 6.5 Assert Admin-only users/devices/audit/report-refresh routes are denied without protected content flash.
- [ ] 6.6 Capture workflow evidence/timings and ensure synthetic customer data is clearly run-tagged.

## 7. Implement Admin workflow smoke tests

- [x] 7.1 Add explicit `allowDeviceRotation` policy parsing, defaulting production to disabled unless explicitly enabled.
- [ ] 7.2 Verify Admin login/routing, permitted synthetic user operations, device inspection, and reversible device activation/deactivation.
- [ ] 7.3 Exercise staging attestation-secret rotation only under policy; never print, screenshot, or persist the secret.
- [ ] 7.4 Exercise reversible smoke-branch values, customer/card management, and integer-kobo controlled adjustment.
- [ ] 7.5 Register and canonically compensate the adjustment; verify transaction, audit, reports, CSV export, pilot operations, and report refresh.
- [x] 7.6 Capture representative Admin report timing and evidence without exposing PII/secrets.

## 8. Implement cross-role financial scenarios

- [ ] 8.1 Implement above-threshold Cashier Earn pending approval and assert no premature balance/ledger/lot credit.
- [ ] 8.2 Approve the same run-tagged request in Supervisor UI and verify ledger, lot, balance, and Cashier-visible result.
- [ ] 8.3 Implement dedicated Cashier Redeem scenario with known available credit, FIFO verification, and registered reversal.
- [ ] 8.4 Implement confirmed Earn followed by Supervisor/Admin UI reversal; retain original evidence and verify compensating ledger/audit/balance state.
- [ ] 8.5 Use serial execution and fresh role contexts where required; prevent double reconciliation for already-reversed artifacts.

## 9. Implement critical negative guardrails

- [x] 9.1 Verify Cashier denial of Admin/Supervisor routes and protected customer/card mutations through both UI and API where consequential.
- [x] 9.2 Verify Supervisor denial of Admin users/devices, audit, and report-refresh surfaces.
- [x] 9.3 Verify duplicate receipt rejection with no additional ledger/credit mutation.
- [x] 9.4 Verify inactive card/customer, staff/ineligible customer, and insufficient-balance Redeem rejection.
- [x] 9.5 Verify Offline Redeem is blocked and creates neither local queue state nor backend financial state.
- [x] 9.6 Cover session expiry without changing production/global timeout settings; short-timeout deployment provisioning remains an environment prerequisite.

## 10. Implement Offline Earn coverage

- [x] 10.1 Add `allowOfflineProduction` policy configuration with staging default enabled and production default disabled.
- [x] 10.2 Use browser-context request routing to block only smoke Earn/sync requests; never disable shared services.
- [ ] 10.3 Execute staging Offline Earn, assert local persistence and Sync Queue visibility, restore connectivity, synchronize, verify backend confirmation, and register reversal.
- [x] 10.4 Verify Offline Redeem remains conservatively blocked during the offline context.
- [x] 10.5 In production, skip with explicit evidence when policy is false; when enabled, run exactly one low-value isolated flow and reconcile it canonically. Enabled-policy execution remains environment-dependent.

## 11. Add staging release-candidate workflow

- [ ] 11.1 Create `.github/workflows/staging-smoke.yml` connected to the existing release-candidate deployment completion event (or an equivalent reusable workflow contract), with release-candidate/manual triggers and deployment success as a prerequisite.
- [x] 11.2 Set staging environment protection and SHA-keyed concurrency; derive and verify the exact candidate SHA before mutations.
- [x] 11.3 Require staging URLs, deterministic fixture values, and role/device secrets without echoing them.
- [x] 11.4 Install dependencies/Chromium using repository conventions and run `npm run smoke:staging` against the deployed candidate.
- [x] 11.5 Upload smoke evidence, traces, screenshots, JUnit, and HTML report with `if: always()` and appropriate retention.
- [x] 11.6 Validate YAML/formatting and ensure the workflow cannot create circular release dependencies.

## 12. Add approval-gated production workflow

- [x] 12.1 Create manual-only `workflow_dispatch` inputs for exact `candidate_sha`, `RUN_PRODUCTION_SMOKE` confirmation, and run reason.
- [x] 12.2 Configure the `production-smoke` GitHub Environment with required reviewers and a single non-canceling concurrency group.
- [x] 12.3 Verify deployed frontend and backend release SHA before fixture preflight/reset or any mutation.
- [x] 12.4 Run production smoke only against the dedicated tenant/device and honor offline/device-rotation policy flags.
- [x] 12.5 Always upload safe evidence and write a job summary containing only candidate SHA, run ID, outcome, reconciliation result, and artifact name.
- [x] 12.6 Check the persistent production safety lock before fixture reset and set it when reconciliation/invariants fail.
- [x] 12.7 Document and test that a reconciliation failure is prominent and blocks safe rerun until an authorized operator resolves the incident and audibly clears the lock.

## 13. Add immutable evidence verifier and release integration

- [x] 13.1 Create `verify-smoke-evidence.mjs` with exact-SHA, schema, timestamp, outcome, mandatory-group, reconciliation, and secret-key validation.
- [x] 13.2 Add Node tests for valid PASS, failed outcomes, SHA mismatch, secret-like fields, missing reconciliation, and missing role groups.
- [x] 13.3 Add root scripts `verify:smoke-evidence` and `test:smoke-evidence`.
- [x] 13.4 Integrate verification with release certification only where it does not create a CI/staging circular dependency.
- [x] 13.5 Confirm evidence verification never requires production credentials for pure artifact tests.

## 14. Publish operator runbook and provisioning checklist

- [x] 14.1 Document dedicated tenant/branch/user/device/customer/card/spare-card provisioning using environment variable names only.
- [x] 14.2 Document staging automatic execution and production manual approval inputs.
- [x] 14.3 Document `FAIL_RECONCILIATION`, `FAIL_TEST`, and `FAIL_INFRASTRUCTURE` recovery procedures.
- [x] 14.4 Document artifact retention, synthetic PII requirements, secret handling, and prohibition on storage-state/device-secret artifacts.
- [x] 14.5 Add a concise README link only if it improves discoverability without duplicating the runbook.

## 15. Verify the complete release gate

- [ ] 15.1 Run formatting, lint, typecheck, build, OpenAPI, OpenSpec validation, and existing static gates.
- [x] 15.2 Run unit, integration, E2E, frontend critical-path, and smoke-support tests.
- [ ] 15.3 Run complete staging smoke against a frozen candidate SHA.
- [ ] 15.4 Verify evidence manifest provenance and all mandatory PASS groups.
- [ ] 15.5 Run GitNexus analysis/detect-changes and review auth, device, financial, and CI blast radius.
- [ ] 15.6 Trigger one approved production smoke only after staging PASS and isolated-tenant readiness.
- [ ] 15.7 Resolve all verification findings, rerun affected gates, inspect the final diff/status, and record remaining operational risks.

## Current remediation priority

- [ ] **P0:** Verify the staging fixture/report response contract and seeded balance, fraud, and outbox state before interpreting downstream failures.
- [ ] **P0:** Resolve balance drift and outbox residue through canonical, auditable setup or reversal flows.
- [ ] **P1:** Trace Offline Earn from IndexedDB persistence through Sync Queue rendering, batch submission, and backend response mapping.
- [ ] **P1:** Stabilize cross-role financial prerequisites and verify each earn/approval/redeem transition through the API.
- [ ] **P2:** Review remaining role-page selectors and content assertions only after confirming route behavior.
- [ ] **P0 release gate:** Redeploy the frozen candidate, rerun complete staging smoke, verify evidence, and keep production blocked until PASS.

## Review Gates

- **Gate A — framework safety:** Tasks 1–4 complete; reviewers confirm strict config, versioned fixture manifest, secret handling, fail-closed fixtures, durable artifact persistence, persistent safety lock, mandatory fraud fixture, and canonical reconciliation before financial scenarios are added.
- **Gate B — workflow coverage:** Tasks 5–10 complete; reviewers confirm all financial writes register teardown artifacts and all user-facing actions use Playwright.
- **Gate C — release safety:** Tasks 11–13 complete; reviewers confirm exact-SHA provenance, environment approval, concurrency, evidence validation, and no circular CI dependency.
- **Gate D — operational readiness:** Tasks 14–15 complete; staging evidence is PASS, production tenant is isolated, recovery is documented, and no partial role pass is accepted.
