## ADDED Requirements

### Requirement: Smoke runs use strict, deterministic configuration

The smoke subsystem SHALL accept only validated staging or production configuration with explicit frontend/backend URLs, candidate SHA, tenant/branch/device IDs, role user IDs, fixture identifiers, and separate role credentials. Production configuration SHALL fail closed when any required fixture is missing, mismatched, or unavailable and SHALL NOT create replacement fixtures or fuzzy-discover ordinary operational data.

#### Scenario: Missing production fixture configuration fails before tests

- **GIVEN** production smoke configuration omits a required tenant, branch, device, customer, card, or role credential value
- **WHEN** smoke setup loads configuration
- **THEN** setup fails with a safe, named configuration error
- **AND** no browser workflow or fixture mutation begins

#### Scenario: Fixture scope mismatch fails closed

- **GIVEN** a configured fixture exists but belongs to another tenant or branch
- **WHEN** preflight validates the fixture through an authenticated API
- **THEN** the smoke run fails as infrastructure failure
- **AND** it does not silently replace or reassign the fixture

### Requirement: Fixture manifests and reconciliation state are durable

The smoke subsystem SHALL use a versioned, reviewable manifest for non-secret fixture identities and expected relationships. Environment configuration SHALL select the manifest version and provide secrets without silently substituting fixtures. Every financial artifact registration and reconciliation status SHALL be atomically persisted so teardown and operator recovery do not depend on in-memory test state.

#### Scenario: Fixture manifest version is enforced

- **GIVEN** smoke configuration selects a fixture-manifest version
- **WHEN** setup loads and validates fixtures
- **THEN** the selected manifest is available and its tenant, branch, device, customer, card, and expected-state relationships are verified
- **AND** an absent or incompatible manifest fails before mutations

#### Scenario: Teardown recovers persisted artifacts

- **GIVEN** a test runner is interrupted after creating a financial artifact
- **WHEN** teardown or operator recovery resumes from `current-run.json` and evidence
- **THEN** the persisted artifact registry identifies the operation and its reconciliation status
- **AND** recovery does not require the original test process to remain alive

### Requirement: Every run has traceable identity and safe evidence

Each execution SHALL create one globally unique `smokeRunId`, propagate it through run-created records where supported, record the candidate SHA, and produce an evidence bundle that contains no secrets.

#### Scenario: Run identity is filesystem-safe and correlated

- **GIVEN** a smoke run starts
- **WHEN** setup creates run metadata and workflow references
- **THEN** the run receives a UTC `SMOKE-YYYYMMDD-HHMMSS-<suffix>` identifier
- **AND** receipts, reasons, approvals, and audit references use the identifier where supported
- **AND** run paths and metadata contain no credentials or tokens

#### Scenario: Secret-like evidence is rejected

- **GIVEN** evidence contains a key or nested value representing a password, secret, cookie, CSRF token, authorization value, service-role key, or Redis credential
- **WHEN** evidence is serialized or verified
- **THEN** evidence publication fails safely
- **AND** the secret value is not printed in the error

### Requirement: User-facing workflows are certified through Playwright

The smoke subsystem SHALL use Playwright to authenticate as the actual role for login semantics coverage, navigate the deployed application, execute user-operable workflows, and assert visible outcomes. API calls SHALL be limited to deterministic setup, secret-gated smoke session bootstrap, post-condition verification, reconciliation, and restoration. Smoke session bootstrap SHALL require a configured `SMOKE_SESSION_BOOTSTRAP_SECRET`, SHALL create short-lived role-scoped sessions only, SHALL preserve Cashier device attestation requirements, and SHALL NOT weaken the normal login throttle.

#### Scenario: Cashier workflow is browser-certified

- **GIVEN** a configured active smoke customer/card and Cashier session
- **WHEN** the Cashier looks up the card and completes a workflow through the UI
- **THEN** the suite asserts the visible lookup and terminal state
- **AND** backend APIs verify the durable result

#### Scenario: Role login preserves security semantics

- **GIVEN** separate smoke credentials for Cashier, Supervisor, and Admin
- **WHEN** each role logs in through the normal application flow in dedicated login coverage
- **THEN** the expected role shell and route are rendered
- **AND** Cashier device-bound login requirements remain enforced

#### Scenario: Smoke session bootstrap avoids login throttle exhaustion

- **GIVEN** the backend and smoke runner share the configured bootstrap secret
- **WHEN** setup creates per-role smoke sessions
- **THEN** sessions are issued through the secret-gated bootstrap endpoint rather than password login
- **AND** configured tenant, deterministic role user ID, role, device, and tenant eligibility are validated
- **AND** normal login throttling remains unchanged

### Requirement: Cashier smoke covers core workflows and guardrails

The Cashier suite SHALL cover login/routing, card lookup, confirmed Earn, approval-pending Earn, Redeem, customer-safe view, today's activity, truthful sync queue state, logout, and release-critical negative paths.

#### Scenario: Confirmed Earn reconciles

- **GIVEN** an eligible active smoke card and a receipt tagged with the current run ID
- **WHEN** Cashier submits a below-threshold Earn through the UI
- **THEN** the UI displays confirmation
- **AND** backend verification finds the receipt, immutable ledger entry, credit lot, and expected balance change
- **AND** the artifact is registered for canonical reversal

#### Scenario: Cashier cannot perform protected or invalid operations

- **GIVEN** Cashier attempts Admin/Supervisor routes, protected mutations, duplicate receipt, inactive/ineligible transaction, insufficient-balance Redeem, or Offline Redeem
- **WHEN** the attempt is made through UI and, where consequential, the role API session
- **THEN** the UI denies or blocks the operation and the API returns the expected authorization/business error
- **AND** no unexpected financial mutation is created

### Requirement: Supervisor smoke covers operational workflows

The Supervisor suite SHALL cover role routing, synthetic customer registration/edit/status, card assignment/replacement/status, transaction detail, approval acceptance/rejection, smoke fraud review where provisioned, reports, materialization visibility, reversal, and Admin-only denial paths.

#### Scenario: Supervisor completes customer and card lifecycle

- **GIVEN** spare smoke cards and a run-tagged synthetic customer
- **WHEN** Supervisor creates/updates the customer, assigns/replaces a card, changes status, and restores the fixture through the UI
- **THEN** each visible result is asserted
- **AND** API verification confirms tenant/branch-scoped durable state
- **AND** teardown restores the baseline fixture state

#### Scenario: Supervisor cannot access Admin-only controls

- **GIVEN** an authenticated Supervisor
- **WHEN** the Supervisor navigates to Admin users/devices, audit, or report-refresh surfaces
- **THEN** the route is denied or redirected
- **AND** no Admin-only mutation occurs

### Requirement: Admin smoke covers the operational control plane

The Admin suite SHALL cover Admin routing, permitted user management, device inspection/status lifecycle, policy-controlled attestation rotation, reversible branch values, customer/card management, controlled adjustment, transaction/reversal, reports, CSV export, audit evidence, pilot operations, and report refresh.

#### Scenario: Admin adjustment is compensated

- **GIVEN** the smoke tenant and a controlled adjustment amount in integer kobo
- **WHEN** Admin submits a run-tagged adjustment through the UI
- **THEN** the adjustment and audit event are visible and API-verified
- **AND** teardown creates the canonical equal-and-opposite compensation
- **AND** no immutable history is deleted

### Requirement: Cross-role financial scenarios preserve ordering and truth

The smoke subsystem SHALL certify Earn requiring approval, Redeem, and reversal as named cross-role scenarios with deterministic ordering, UI proof for every user action, and API assertions for financial post-conditions.

#### Scenario: Earn requiring approval does not credit prematurely

- **GIVEN** Cashier submits an above-threshold Earn for the active smoke card
- **WHEN** the request enters pending approval
- **THEN** an approval exists and the balance remains unchanged
- **WHEN** Supervisor approves through the UI
- **THEN** the ledger, credit lot, balance, and Cashier-visible balance update are verified

#### Scenario: Reversal retains original evidence

- **GIVEN** a confirmed smoke financial transaction
- **WHEN** Supervisor or Admin reverses it through the UI with a run-tagged reason
- **THEN** the original transaction remains present
- **AND** a compensating transaction/ledger effect and audit event exist
- **AND** the resulting balance reconciles

### Requirement: Offline behavior is conservative and scoped

Staging SHALL exercise Offline Earn persistence and reconciliation. Offline Redeem SHALL be blocked. Production Offline Earn SHALL run only when explicitly enabled and shall use browser-local request interception scoped to the smoke context, never shared infrastructure degradation.

#### Scenario: Staging Offline Earn synchronizes

- **GIVEN** an online authenticated Cashier browser and active smoke card
- **WHEN** only smoke-context Earn/sync requests are blocked
- **THEN** Earn persists locally and appears in Sync Queue
- **WHEN** connectivity is restored
- **THEN** synchronization reaches confirmed backend state and is reconciled

#### Scenario: Offline Redeem is blocked

- **GIVEN** the smoke browser is offline
- **WHEN** Cashier attempts Redeem
- **THEN** the UI conservatively blocks the operation
- **AND** no local or backend Redeem record is created

### Requirement: Reconciliation and invariants are mandatory

The smoke run SHALL reconcile all run-created financial artifacts through canonical application endpoints, restore mutable fixtures, and verify post-run invariants. Cleanup or invariant failure SHALL produce `FAIL_RECONCILIATION` even if all browser tests passed. Production reconciliation failure SHALL set a persistent safety lock that blocks subsequent production smoke until an authorized operator clears it after documented resolution.

#### Scenario: Cleanup failure fails the gate

- **GIVEN** browser workflow assertions pass
- **WHEN** reversal, compensation, fixture restoration, or invariant verification fails
- **THEN** the final result is `FAIL_RECONCILIATION`
- **AND** evidence identifies the unresolved run-tagged references
- **AND** a production rerun is not treated as safe until reviewed

#### Scenario: Production baseline invariants pass

- **GIVEN** production teardown completes
- **WHEN** the reconciliation layer checks balance, approvals, fraud flags, device/card/customer state, offline retry records, credit lots, outbox backlog, and terminal run artifacts
- **THEN** every expected invariant passes
- **AND** only then can the run be `PASS`

### Requirement: Production safety lock prevents unsafe reruns

Production smoke SHALL check a persistent environment/tenant safety lock before fixture reset or any financial mutation. A lock SHALL be set for `FAIL_RECONCILIATION`, unresolved invariant failure, or operator-declared residue, and SHALL be cleared only through an authorized, auditable recovery action.

#### Scenario: Residue blocks a later production run

- **GIVEN** a previous production smoke run ended with unreconciled state
- **WHEN** another production smoke workflow is requested
- **THEN** the run fails before mutation and identifies the blocking incident/run ID
- **AND** it cannot be bypassed merely by starting a new GitHub workflow

#### Scenario: Authorized recovery clears the lock

- **GIVEN** an operator has canonically reconciled the run and verified invariants
- **WHEN** the operator records resolution and clears the safety lock
- **THEN** a later production smoke run may proceed
- **AND** the clear action is auditable

### Requirement: Release workflows enforce provenance and isolation

Staging smoke SHALL run automatically for release candidates after deployment. Production smoke SHALL be manual-only, approval-gated, exact-SHA validated, and single-concurrency against the dedicated smoke tenant.

#### Scenario: Production run is blocked for an undeployed SHA

- **GIVEN** a manually requested candidate SHA
- **WHEN** deployed frontend/backend release evidence does not match it
- **THEN** the workflow fails before fixture reset or financial mutation

#### Scenario: Concurrent production run is prevented

- **GIVEN** one production smoke run is mutating the smoke tenant
- **WHEN** another production smoke workflow is requested
- **THEN** the second run waits or fails according to the configured lock
- **AND** the two runs do not interleave mutations

### Requirement: Smoke evidence is release-certification compatible

The evidence manifest SHALL include smoke run ID, environment, exact candidate SHA, public fixture IDs, timestamps, outcome, all mandatory group statuses, reconciliation status, and workflow timings. A verifier SHALL reject incomplete, mismatched, secret-bearing, or non-PASS evidence when used as a release gate.

#### Scenario: Valid exact-SHA evidence passes verification

- **GIVEN** a secret-free manifest with all Cashier, Supervisor, Admin, cross-role, guardrail, and reconciliation groups passing
- **AND** the manifest candidate SHA equals the requested candidate SHA
- **WHEN** the verifier runs
- **THEN** it exits successfully

#### Scenario: Partial role success is not a release pass

- **GIVEN** one mandatory role or reconciliation group is failed or absent
- **WHEN** the evidence verifier runs
- **THEN** it exits non-zero
- **AND** the release gate cannot interpret partial success as `PASS`
