## Context

The approved design requires a smoke suite that is fast enough for every staging release candidate, safe for manually approved production use, and meaningful enough that a failure indicates an unavailable, unauthorized, financially unsafe, or unreconciled core workflow. The implementation plan establishes a layered TypeScript/Playwright subsystem under `apps/web/tests/smoke`, with GitHub Actions and a secret-free evidence verifier around it.

The existing application uses Next.js/Playwright on the frontend, real `/api/v1` contracts, backend-owned sessions/RBAC, CSRF protection, device-bound Cashier authentication, PostgreSQL/Supabase persistence, and immutable financial history. The smoke subsystem must preserve those semantics rather than inventing test-only shortcuts.

## Goals

1. Certify user-facing workflows through the real browser UI.
2. Use authenticated API calls only for deterministic setup, preflight, durable assertions, reconciliation, and restoration.
3. Make staging and production behavior explicit and environment-aware.
4. Fail closed when required fixtures, release provenance, credentials, or reconciliation state is invalid.
5. Correlate every run-created artifact to one globally unique `smokeRunId`.
6. Retain immutable financial evidence while restoring mutable fixtures.
7. Produce evidence safe for CI artifacts and release review.
8. Prevent overlapping production mutations.

## Non-Goals and Boundaries

The suite is not a complete regression or performance system. It will not add a NestJS test controller, SQL cleanup utility, direct ledger insertion, shared-infrastructure fault injection, ordinary production-data discovery, or a production fixture auto-provisioning fallback.

## Architecture

### Execution boundary

Every workflow follows:

```text
API setup/preflight
  → deterministic fixture validation and baseline capture
Playwright UI
  → authenticate as the real role
  → navigate and perform the user workflow
  → assert visible product outcome
API verification
  → assert session, authorization, transaction, ledger, lot, balance, audit, and status post-conditions
Reconciliation
  → reverse or compensate mutable financial effects canonically
  → restore mutable fixtures
  → assert post-run invariants
Evidence
  → publish secret-free manifest, role results, timings, traces/screenshots, and reconciliation outcome
```

The UI remains the certification boundary for user-operable behavior. API calls must not replace browser proof for Cashier, Supervisor, or Admin workflows.

### Configuration and run identity

`loadSmokeConfig()` parses a strict `SmokeConfig` from environment variables. It validates the environment (`staging` or `production`), exact URLs, 40-character candidate SHA, all deterministic fixture IDs, role credentials, and device identity. The Cashier device ID must equal the configured smoke device ID. Production configuration must never infer, fuzzy-search, or create missing fixtures.

`createSmokeRun()` generates one UTC-safe identifier in the form `SMOKE-YYYYMMDD-HHMMSS-<suffix>`. Run metadata contains only public IDs, environment, candidate SHA, timestamps, paths, and statuses. Run-specific receipts, adjustment reasons, approval context, and audit correlation fields carry the ID whenever the domain contract permits.

### Fixture isolation

Production uses a dedicated persistent smoke tenant, branch, users, POS device, baseline customer/card, inactive customer/card, staff/ineligible customer/card, and spare cards. Configuration references explicit IDs or serials supplied by environment secrets/manifests. Preflight verifies tenant, branch, role, device, customer, and card identity through normal APIs and fails if anything is absent or belongs to the wrong scope.

A baseline snapshot records mutable fixture status/profile values, card ownership/status, device status/branch, and the baseline balance. Setup resets mutable state to the expected baseline before tests. Teardown restores it after reconciliation. Missing fixtures never trigger create-on-missing behavior.

Fixture identity SHALL be represented by a versioned, reviewable smoke-fixture manifest in addition to environment-provided secret values. The manifest SHALL contain non-secret fixture IDs, serials, expected tenant/branch relationships, eligibility/status expectations, and a manifest version. Environment configuration SHALL select the manifest version and provide credentials/secrets; it SHALL not silently substitute a different manifest.

### API and authentication

`SmokeApiSession` uses Playwright's request context against the same-origin frontend proxy and authenticates using the application's normal login contract. It extracts the existing CSRF cookie and sends the expected CSRF header on mutations, plus idempotency keys containing the run identity. Cashier login includes the existing device headers/credentials; Admin and Supervisor use their normal role credentials.

Errors expose only HTTP status and safe API error codes. Responses, logs, evidence, and artifacts must never include credentials, cookies, CSRF values, device attestation secrets, service-role keys, or Redis credentials.

UI helpers use current labels and route behavior to log in and out as each role. Expected post-login routes are `/cashier`, `/supervisor`, and `/admin`. No storage-state file is persisted into evidence.

### Evidence and outcomes

Evidence is written atomically beneath the run directory and includes a manifest, summary, role/scenario records, reconciliation, timings, JUnit, traces, and screenshots as applicable. Evidence is recursively checked for secret-like keys before serialization. The immutable verifier requires exact candidate SHA provenance, all mandatory role groups, a passing reconciliation result, valid timestamps/run ID, and `PASS` overall status.

Allowed outcomes are `PASS`, `FAIL_TEST`, `FAIL_RECONCILIATION`, `FAIL_INFRASTRUCTURE`, and `ABORTED`. Cleanup or invariant failure is never downgraded because browser assertions passed.

### Financial reconciliation

All confirmed Earn, Redeem, and manual adjustments are registered as artifacts. Teardown uses canonical reversal/restoration or compensating adjustment endpoints. It never deletes ledger, transaction, credit-lot, or audit rows. Already reversed artifacts are marked reconciled to prevent double reversal. Pending/rejected operations are verified as terminal expected states rather than fabricated into financial records.

Post-run checks cover baseline balance, open approvals/fraud flags, device/card/customer state, offline retry records, credit-lot reconciliation, outbox backlog, and terminal status of all run-created operations. The production smoke tenant SHALL include deterministic smoke-scoped fraud fixtures so Supervisor fraud review/decision is mandatory rather than conditionally omitted.

A persistent production smoke safety lock SHALL be checked before any production fixture mutation. A `FAIL_RECONCILIATION` result SHALL set the lock and prevent later production runs from proceeding until an authorized operator records resolution and explicitly clears it. GitHub Actions concurrency prevents overlap; the safety lock prevents unsafe reruns after residue.

### Role and scenario coverage

The suites are serial and deterministic where financial state is shared. Cashier covers login, lookup, confirmed Earn, pending Earn, Redeem, customer-safe view, activity, sync queue, and logout. Supervisor covers customer and card lifecycle, transactions, approvals, fraud queue, reports, materialization visibility, and reversal. Admin covers user/device/branch/customer/card management, controlled adjustment, transaction/reversal, reports, CSV, audit, pilot operations, and report refresh.

Every financial artifact registration SHALL be durably written to the run evidence/current-run record as it is created, using atomic updates. Teardown SHALL reconstruct its reconciliation work from that persisted registry rather than depending on an in-memory test process. This guarantees recovery after worker crashes or test-runner interruption.

Named cross-role scenarios cover Earn requiring approval, Redeem, and reversal. Guardrails cover role denial, duplicate receipt, inactive/ineligible entities, insufficient balance, Offline Redeem blocking, and protected mutations. Offline Earn uses browser-local request routing only and never disables shared infrastructure.

### CI and release integration

Staging smoke runs automatically after candidate CI/security validation and deployment, with the exact candidate SHA and deterministic staging secrets. The staging workflow SHALL be connected to the existing release-candidate deployment completion event (or an equivalent reusable workflow contract), so deployment success is a prerequisite rather than relying solely on an unrelated manual or pull-request trigger. The production workflow is `workflow_dispatch` only, requires `RUN_PRODUCTION_SMOKE`, an exact candidate SHA, a reason, GitHub Environment approval, and a single concurrency group. It verifies deployed frontend/backend provenance before mutating fixtures. Evidence uploads with `if: always()` and job summaries contain only safe run metadata.

### Operational recovery

The runbook documents one-time fixture provisioning without real IDs/secrets, staging and production invocation, evidence privacy, and recovery. `FAIL_RECONCILIATION` blocks a rerun until an operator identifies run-tagged records, performs canonical Admin remediation, verifies invariants, and records resolution.

## Failure Semantics

- Missing or mismatched configuration/fixture/release evidence: `FAIL_INFRASTRUCTURE` before browser mutation.
- Browser assertion failure: `FAIL_TEST`, followed by teardown attempt.
- Reversal, compensation, fixture reset, or invariant failure: `FAIL_RECONCILIATION`.
- Infrastructure outage or unavailable environment: `FAIL_INFRASTRUCTURE`.
- Explicit operator interruption: `ABORTED`.
- Production smoke safety lock already set: fail before mutation with an infrastructure/safety-gate error and preserve the blocking incident reference.
- Only all mandatory groups plus reconciliation/invariants passing yields `PASS`.

## Security and Privacy

Separate credentials are used per role. Secrets live only in GitHub environment/repository secret storage or runtime process memory. Tests do not print passwords, cookies, CSRF tokens, attestation secrets, service-role keys, or Redis credentials. Production data is synthetic and isolated. Screenshots and traces are reviewed for accidental sensitive values before artifact publication.

## Rollout

1. Build and unit-test configuration, API, fixture, evidence, and reconciliation helpers.
2. Add role and cross-role browser suites against a frozen staging candidate.
3. Add negative and offline paths, including a mandatory smoke-scoped fraud fixture and a short-timeout staging deployment for session-expiry coverage.
4. Add staging CI gate and evidence verification, connected to the release-candidate deployment completion event.
5. Provision and validate the dedicated production smoke tenant, versioned fixture manifest, and persistent safety-lock store.
6. Enable manual production smoke only after exact-SHA, approval, concurrency, safety-lock, durable artifact registry, and recovery checks pass.

## Risks and Mitigations

- **Financial residue:** reconcile-and-preserve, run tags, invariant checks, and hard failure on cleanup errors.
- **Wrong production data:** explicit fixture IDs, tenant/branch identity validation, no fuzzy lookup, no auto-create.
- **Credential leakage:** strict parser, redaction, safe errors, no storage-state artifacts, evidence verifier.
- **Cross-role race conditions:** serial execution and production concurrency lock.
- **False release confidence:** UI proof plus backend post-conditions, exact candidate provenance, and no partial-pass interpretation.
- **Lost teardown state:** atomically persist every artifact registration and make teardown/recovery consume the persisted registry.
- **Unsafe rerun after residue:** use a persistent production safety lock that only an authorized operator can clear after reconciliation review.
- **Conditional coverage gaps:** provision mandatory fraud and short-timeout session-expiry fixtures/environments, or record an explicit release exception rather than silently skipping required design coverage.
- **API contract drift:** use existing generated/current contracts and run regular typecheck/openapi verification.
