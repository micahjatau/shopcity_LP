# Role-Based Staging and Production Smoke Test Design

**Date:** 2026-08-26  
**Branch:** `frontend-development`  
**Status:** Approved design, implementation pending  
**Source of truth:** `docs/TRD.md`, current role/workflow routes, OpenAPI-generated client contracts, and release-certification requirements.

## 1. Purpose

ShopCity requires a release smoke-test subsystem that proves the most important workflows for Cashier, Supervisor, and Admin roles work end to end in the deployed application. The smoke suite is deliberately narrower than the regression suite: it must be fast enough to run for every release candidate in staging, safe enough to run manually in production, and strong enough that a failure means a core ShopCity workflow is unavailable, incorrectly authorized, financially unsafe, or cannot reconcile its state.

The suite SHALL combine Playwright browser execution with API-driven fixture preparation and post-condition verification. User-facing workflows SHALL be exercised through the real UI. API calls SHALL be used only for deterministic fixture setup, prerequisite state, post-run verification, and reconciliation where using the UI would add noise rather than product confidence.

## 2. Environments

### 2.1 Staging

Staging smoke tests SHALL run automatically for every release candidate after normal CI/security validation and deployment.

Staging MAY exercise the full destructive workflow surface, including:

- customer creation and editing;
- card assignment, replacement, block/unblock;
- Earn and Redeem;
- approval and rejection;
- reversal and manual adjustment;
- device activation/deactivation and attestation-secret rotation;
- offline Earn capture and reconciliation;
- negative authorization and validation guardrails.

Target duration: approximately 5–10 minutes. This is a smoke suite, not an exhaustive regression suite.

### 2.2 Production

Production smoke tests SHALL be manual-only and require an explicit GitHub Actions `workflow_dispatch` trigger plus production-environment approval.

Production smoke SHALL use a dedicated persistent smoke tenant and SHALL NOT use ordinary ShopCity pilot/customer data.

Production MAY exercise broad write workflows because its data is isolated, but SHALL NOT intentionally degrade shared infrastructure such as Redis, Supabase, Postgres, or Vercel services.

## 3. Production Isolation Model

Production SHALL contain a dedicated smoke tenant with deterministic persistent fixtures.

Recommended logical structure:

```text
Production
├── ShopCity operational tenant
│   └── real branches, customers, devices, cards, ledger
│
└── ShopCity smoke tenant
    └── Smoke Test Branch
        ├── smoke.admin
        ├── smoke.supervisor
        ├── smoke.cashier
        ├── SMOKE-POS-01
        ├── baseline active customer/card
        ├── inactive customer/card fixtures
        └── run-specific financial records
```

The fixture manager MUST fail closed when expected smoke resources are missing. It MUST NOT silently create a new production smoke tenant or discover production fixtures using fuzzy searches.

Persistent fixture identifiers SHALL be supplied by explicit environment configuration or a versioned smoke-fixture manifest.

## 4. Smoke Run Identity

Each execution SHALL generate one globally unique `smokeRunId`.

Recommended format:

```text
SMOKE-YYYYMMDD-HHMMSS-<short-random-suffix>
```

The identifier SHALL be propagated through smoke-created records wherever the domain permits, for example:

- receipt number suffix/prefix;
- reversal reason;
- adjustment reason;
- approval context/reason;
- smoke fixture metadata/reference fields;
- audit correlation metadata where supported.

The suite MUST be able to trace every run-created financial or administrative artifact back to its `smokeRunId`.

## 5. Test Architecture

Recommended repository structure:

```text
tests/smoke/
├── config/
│   ├── staging.ts
│   └── production.ts
├── fixtures/
│   ├── tenant.ts
│   ├── users.ts
│   ├── device.ts
│   ├── customers.ts
│   └── cards.ts
├── api/
│   ├── fixture-client.ts
│   ├── assertions.ts
│   └── reconciliation.ts
├── roles/
│   ├── cashier.smoke.spec.ts
│   ├── supervisor.smoke.spec.ts
│   └── admin.smoke.spec.ts
├── scenarios/
│   ├── earn-confirmed.spec.ts
│   ├── earn-approval.spec.ts
│   ├── redeem.spec.ts
│   ├── reversal.spec.ts
│   └── offline-earn.spec.ts
├── guardrails/
│   ├── rbac.smoke.spec.ts
│   ├── duplicate-receipt.spec.ts
│   ├── inactive-entity.spec.ts
│   ├── offline-redeem.spec.ts
│   └── session-expiry.spec.ts
├── support/
│   ├── smoke-run.ts
│   ├── auth.ts
│   └── evidence.ts
└── global-teardown.ts
```

This structure MAY be adapted to the existing Playwright test layout, but the conceptual boundaries SHALL remain: configuration, fixtures, role workflows, cross-role scenarios, guardrails, evidence, and reconciliation.

## 6. Execution Principle

The test boundary SHALL follow this rule:

```text
API
→ provision/reset deterministic smoke fixtures
→ seed prerequisite state

Playwright
→ authenticate as the actual role
→ navigate the real application
→ execute the workflow a user performs
→ assert visible outcome

API
→ verify durable backend post-conditions
→ reconcile financial effects
→ restore mutable fixture state
```

A workflow that the product claims is user-operable SHALL NOT be certified solely through direct API calls.

## 7. Cashier Smoke Matrix

The Cashier suite SHALL prove at least the following happy paths.

| Workflow | Browser proof | Backend proof |
|---|---|---|
| Login | Login redirects to Cashier shell | session, role, branch and device context valid |
| Card lookup | scanner/manual lookup resolves expected customer | card/customer/balance match fixture |
| Earn confirmed | lookup → Earn → submit → confirmed result | receipt, ledger entry, credit lot, balance change |
| Earn requiring approval | high-value Earn shows pending state | approval exists; no premature credit |
| Redeem | lookup → Redeem → confirm | redemption, FIFO allocations and balance change |
| Customer view | customer search/detail works | Cashier-safe PII projection |
| Today's activity | just-created transaction appears | actor/branch-scoped activity endpoint matches |
| Sync queue | queue opens and reports truthful state | local/offline state matches backend reconciliation |
| Logout | role session exits | session invalid/revoked |

### 7.1 Cashier guardrails

The smoke suite SHALL verify a small set of release-critical negative paths:

- duplicate receipt is rejected;
- inactive card/customer cannot transact;
- staff/ineligible customer cannot Earn;
- insufficient balance cannot Redeem;
- Offline Redeem is blocked;
- Cashier cannot access Admin or Supervisor management routes;
- Cashier cannot perform protected customer/card management mutations.

## 8. Supervisor Smoke Matrix

The Supervisor suite SHALL verify:

- role login and routing;
- customer search;
- customer registration;
- customer profile/status update;
- card assignment;
- card replacement;
- card status changes;
- transaction search/detail;
- approval acceptance;
- approval rejection;
- fraud queue review/decision;
- reports load;
- materialization state is visible;
- report refresh remains unavailable where Admin-only;
- reversal produces a compensating result.

### 8.1 Supervisor guardrails

The suite SHALL verify Supervisor cannot:

- manage Admin users where Admin-only;
- perform device administration where Admin-only;
- refresh Admin-only report materialization;
- access Admin-only audit/report surfaces.

## 9. Admin Smoke Matrix

The Admin suite SHALL verify the operational control plane:

- Admin login and shell routing;
- user creation/update/status/role flows permitted by policy;
- device inspection/update;
- device activation/deactivation;
- device attestation-secret rotation in staging and controlled production use;
- branch management with reversible fixture values;
- customer management;
- card lifecycle management;
- controlled credit/debit adjustment;
- transaction inspection;
- reversal;
- Admin reports;
- CSV export produces non-empty valid content;
- audit entries contain smoke actions;
- pilot operations summary loads;
- Admin report refresh succeeds where applicable.

## 10. Cross-Role Scenarios

Some workflows SHALL be certified as named cross-role scenarios rather than isolated role tests.

### 10.1 Earn requiring approval

```text
Fixture API
→ reset baseline customer/card

Cashier UI
→ scan card
→ submit Earn above approval threshold
→ observe pending approval

API assertion
→ approval exists
→ customer balance unchanged

Supervisor UI
→ open Approvals
→ inspect smoke request
→ approve

API assertion
→ ledger entry exists
→ credit lot exists
→ balance increased

Cashier UI
→ lookup same card
→ updated balance visible
```

### 10.2 Reversal

```text
Cashier UI
→ complete confirmed Earn

Supervisor/Admin UI
→ open transaction
→ reverse with smokeRunId-tagged reason

API assertion
→ original transaction retained
→ compensating ledger transaction exists
→ resulting balance reconciles
→ audit event exists
```

### 10.3 Redeem

```text
Fixture API
→ ensure known available smoke credit

Cashier UI
→ lookup
→ Redeem
→ enter basket/request
→ confirm

API assertion
→ redemption confirmed
→ FIFO allocations exist
→ balance decreased

Cashier UI
→ lookup again
→ new balance visible
```

## 11. Offline Earn

### 11.1 Staging

Staging SHALL exercise the complete offline flow:

```text
device-bound Cashier login
→ block backend/API requests
→ attempt Earn
→ confirm local persistence
→ open Sync Queue
→ restore connectivity
→ submit/retry synchronization
→ backend reports CONFIRMED
→ verify ledger/balance
```

Staging SHALL also verify Offline Redeem is blocked.

### 11.2 Production

Production MAY run one controlled Offline Earn against the dedicated smoke tenant/device. The financial result SHALL be reconciled through the application's canonical reversal path during teardown.

Production smoke SHALL NOT intentionally disable shared production infrastructure; browser/network interception SHALL be scoped to the smoke browser context.

## 12. Data Reconciliation Policy

Smoke data SHALL use **reconcile-and-preserve** semantics rather than destructive financial cleanup.

### 12.1 Financial records

Immutable financial/audit evidence SHALL be retained.

Examples:

```text
confirmed Earn
→ canonical reversal

+₦X manual adjustment
→ −₦X compensating adjustment

Redeem
→ canonical reversal/restoration workflow
```

The smoke suite SHALL NOT delete ledger records merely to return balances to baseline.

### 12.2 Mutable fixtures

Mutable state SHALL be restored to a pre-run snapshot, including where applicable:

- customer status/profile fixture values;
- card status/current active card;
- device status;
- branch smoke-test settings;
- seeded approval/fraud fixture state.

## 13. Cleanup Failure Semantics

Cleanup/reconciliation failure SHALL fail the smoke gate even when all workflow assertions passed.

Allowed top-level outcomes:

```text
PASS
FAIL_TEST
FAIL_RECONCILIATION
FAIL_INFRASTRUCTURE
ABORTED
```

`FAIL_RECONCILIATION` SHALL be treated as a high-severity operational failure because production smoke may have left financial or administrative state unresolved.

A production smoke run with `FAIL_RECONCILIATION` SHOULD block subsequent production smoke executions until an operator reviews and resolves the state.

## 14. Post-Run Invariants

At the end of each production run, the reconciliation layer SHALL verify at minimum:

- baseline smoke customer balance equals expected reconciled balance;
- no unexpected unresolved smoke approvals remain;
- no unexpected open smoke fraud flags remain;
- smoke POS device is in expected status;
- smoke card/customer statuses match baseline;
- no smoke offline records remain in retry-required state;
- credit-lot reconciliation is healthy;
- no unexpected smoke outbox backlog remains;
- every run-created financial operation is either terminal and expected or canonically reconciled.

Any failed invariant SHALL fail the run.

## 15. Evidence Bundle

Every run SHALL publish an evidence artifact containing no secrets.

Recommended shape:

```text
smoke-evidence/
├── manifest.json
├── summary.md
├── cashier.json
├── supervisor.json
├── admin.json
├── guardrails.json
├── reconciliation.json
├── screenshots/
├── traces/
└── junit.xml
```

`manifest.json` SHALL include at minimum:

```json
{
  "smokeRunId": "SMOKE-...",
  "environment": "staging|production",
  "candidateSha": "...",
  "frontendUrl": "...",
  "backendUrl": "...",
  "tenantId": "...",
  "branchId": "...",
  "deviceId": "...",
  "startedAt": "...",
  "completedAt": "...",
  "result": "PASS"
}
```

Artifacts MUST NOT contain:

- passwords;
- device attestation secrets;
- cookies/session IDs;
- CSRF tokens;
- Supabase service-role keys;
- Redis credentials;
- other production secrets.

## 16. GitHub Actions Integration

### 16.1 Staging

The release-candidate pipeline SHALL follow:

```text
candidate SHA
→ normal CI
→ security gates
→ staging deployment
→ staging smoke
→ required PASS
```

The staging smoke job SHOULD be automatic for release candidates and SHALL record the exact candidate SHA.

### 16.2 Production

Production smoke SHALL be `workflow_dispatch` only and SHOULD require inputs such as:

```text
candidate_sha
confirmation = RUN_PRODUCTION_SMOKE
smoke_run_reason
```

A GitHub production environment approval SHALL gate access to production smoke secrets and execution.

The production run SHALL verify the requested `candidate_sha` matches the deployed frontend/backend release evidence before beginning destructive smoke operations.

## 17. Secrets and Credentials

Separate role credentials SHALL be used for smoke Admin, Supervisor, and Cashier accounts.

Secrets SHALL live in GitHub environment/repository secret storage as appropriate; they SHALL NOT be committed to fixtures, Playwright storage-state artifacts, logs, screenshots, or repository docs.

Device credentials SHALL follow the existing ShopCity device-provisioning model. Production smoke SHALL use the dedicated smoke POS device only.

## 18. Concurrency and Locking

Only one production smoke run SHALL mutate the smoke tenant at a time.

Production smoke SHOULD use GitHub Actions concurrency and/or an application-level smoke lock keyed by tenant/environment.

A second production run SHALL wait or fail rather than interleave financial operations with an active run.

Staging MAY parallelize independent non-financial scenarios, but cross-role financial scenarios SHALL preserve deterministic ordering.

## 19. Performance Capture

Smoke is not the full performance benchmark, but it SHOULD record workflow timing for the core production paths:

- card lookup;
- Earn confirmation/pending response;
- Redeem confirmation;
- approval decision;
- representative Supervisor/Admin report load.

These timings SHALL be included in the evidence bundle and MAY be compared against TRD performance budgets, but performance regression analysis remains a separate concern from smoke correctness.

## 20. What the Smoke Suite Does Not Cover

The smoke suite SHALL NOT attempt exhaustive coverage of:

- every validation permutation;
- every report filter combination;
- every responsive breakpoint;
- every fraud rule;
- exhaustive FIFO allocation permutations;
- expiry boundary matrices;
- security fuzzing/penetration testing;
- full accessibility regression;
- all browser/device combinations.

Those remain responsibilities of unit, integration, E2E, security, accessibility, and dedicated performance suites.

## 21. Required Smoke Gate

A release smoke result is PASS only when all mandatory groups pass:

```text
Cashier workflows         PASS
Supervisor workflows      PASS
Admin workflows           PASS
Cross-role scenarios      PASS
Negative guardrails       PASS
Reconciliation/invariants PASS
──────────────────────────────
SMOKE                     PASS
```

No partial role success SHALL be interpreted as a release PASS.

## 22. Acceptance Criteria

The smoke subsystem design is satisfied when implementation provides all of the following:

1. deterministic staging and production smoke configuration;
2. dedicated production smoke tenant, branch, users, device, customers and cards;
3. unique `smokeRunId` correlation per run;
4. API-based fixture setup and post-condition assertions;
5. Playwright-based execution of all user-facing core workflows;
6. mandatory Cashier, Supervisor and Admin role suites;
7. mandatory cross-role Earn approval, Redeem and reversal scenarios;
8. critical negative RBAC/business guardrails;
9. full staging Offline Earn coverage and controlled production Offline Earn coverage;
10. financial reconcile-and-preserve teardown;
11. mutable-fixture restoration;
12. fail-closed reconciliation and post-run invariant verification;
13. immutable secret-free evidence artifacts tied to candidate SHA;
14. automatic staging smoke for release candidates;
15. manual, approval-gated production smoke;
16. concurrency controls preventing overlapping production smoke runs;
17. smoke workflow timings captured for release evidence;
18. no reliance on ordinary ShopCity operational customer/branch data.

## 23. Implementation Boundary

This document defines architecture and acceptance criteria only. No implementation is authorized by this design document itself. Implementation SHALL begin only after this written spec is reviewed and approved, followed by a detailed implementation plan.
