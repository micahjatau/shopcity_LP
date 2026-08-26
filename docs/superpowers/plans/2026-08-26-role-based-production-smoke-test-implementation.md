# Role-Based Staging and Production Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic API + Playwright smoke-test subsystem that certifies Cashier, Supervisor, Admin, cross-role financial workflows, critical negative guardrails, and post-run reconciliation in staging and in an isolated production smoke tenant.

**Architecture:** Reuse the existing Next.js/Playwright frontend test stack and the real `/api/v1` contracts. Persistent smoke tenants/fixtures are provisioned operationally; tests validate and reset them through production APIs, execute user-operable flows through Playwright, verify durable post-conditions through API reads, then reconcile financial effects through canonical reversals/compensating mutations. Staging runs automatically for release candidates; production is `workflow_dispatch` + GitHub Environment approval + single-run concurrency.

**Tech Stack:** TypeScript 5.7, Playwright 1.62, Next.js 15, NestJS 11, generated OpenAPI client, GitHub Actions, existing ShopCity session/CSRF/device-attestation model, PostgreSQL/Supabase backend.

**Spec:** `docs/superpowers/specs/2026-08-26-role-based-production-smoke-test-design.md`

## Global Constraints

- Production smoke MUST use a dedicated persistent smoke tenant; never ordinary ShopCity operational records.
- Production smoke MUST NOT silently create a replacement tenant when a fixture is missing.
- Every run MUST have one unique `smokeRunId` and candidate SHA.
- User-facing workflows MUST be executed through the real UI; API calls are for setup, verification, and reconciliation.
- Financial cleanup MUST use canonical reversal/compensation; immutable ledger/audit evidence MUST NOT be deleted.
- Cleanup/reconciliation failure MUST fail the smoke gate.
- Production smoke MUST be manual-only, environment-approved, and single-concurrency.
- Evidence MUST NOT contain passwords, cookies, CSRF tokens, device attestation secrets, Supabase service keys, or Redis credentials.
- Staging smoke target duration is 5–10 minutes; keep exhaustive permutations in existing regression/security suites.
- Use the existing `/api/v1` same-origin proxy for browser/API smoke interactions unless a post-condition explicitly requires the configured backend URL.
- Preserve existing role and device security semantics; do not add smoke-only bypass endpoints.

---

## File Structure

Create or modify the following focused units:

```text
apps/web/
├── playwright.smoke.config.ts               # smoke-only Playwright config/reporting
└── tests/smoke/
    ├── config.ts                            # validated environment + fixture config
    ├── global-setup.ts                      # run identity, preflight, baseline snapshot
    ├── global-teardown.ts                   # reconcile, invariants, evidence finalization
    ├── support/
    │   ├── smoke-run.ts                     # run ID, paths, outcome model
    │   ├── api-client.ts                    # authenticated CSRF-aware API wrapper
    │   ├── auth.ts                          # UI login/logout helpers per role
    │   ├── fixtures.ts                      # deterministic fixture loading/reset
    │   ├── assertions.ts                    # durable backend assertions
    │   ├── reconciliation.ts                # canonical reversal/reset logic
    │   ├── evidence.ts                      # secret-free JSON/Markdown evidence
    │   └── timing.ts                        # workflow timing capture
    ├── roles/
    │   ├── cashier.smoke.spec.ts
    │   ├── supervisor.smoke.spec.ts
    │   └── admin.smoke.spec.ts
    ├── scenarios/
    │   ├── earn-approval.smoke.spec.ts
    │   ├── redeem.smoke.spec.ts
    │   └── reversal.smoke.spec.ts
    ├── guardrails/
    │   ├── rbac.smoke.spec.ts
    │   └── business-rules.smoke.spec.ts
    └── offline/
        └── offline-earn.smoke.spec.ts
scripts/smoke/
├── verify-smoke-evidence.mjs                # artifact schema/provenance verifier
└── verify-smoke-evidence.spec.mjs
docs/runbooks/
└── smoke-testing.md                         # operator/provisioning/recovery runbook
.github/workflows/
├── staging-smoke.yml                        # automatic candidate smoke
└── production-smoke.yml                     # approved manual production smoke
package.json                                 # root smoke scripts
apps/web/package.json                        # Playwright smoke scripts
```

Do not introduce a smoke-only NestJS controller or database backdoor. Persistent smoke tenant provisioning is an operational prerequisite; the suite validates it through normal authenticated APIs.

---

### Task 1: Smoke Configuration, Run Identity, and Playwright Entry Point

**Files:**
- Create: `apps/web/playwright.smoke.config.ts`
- Create: `apps/web/tests/smoke/config.ts`
- Create: `apps/web/tests/smoke/support/smoke-run.ts`
- Create: `apps/web/tests/smoke/config.smoke.spec.ts`
- Modify: `apps/web/package.json`
- Modify: `package.json`

**Interfaces:**
- Produces `SmokeEnvironment = 'staging' | 'production'`.
- Produces `SmokeConfig` with exact frontend/backend URLs, candidate SHA, fixture IDs, and role credentials.
- Produces `SmokeRun` with `smokeRunId`, evidence/output paths, timestamps, and result state.
- Later tasks consume `loadSmokeConfig()` and `createSmokeRun()`.

- [ ] **Step 1: Write the failing configuration tests**

Create `apps/web/tests/smoke/config.smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { parseSmokeConfig } from './config';
import { createSmokeRunId } from './support/smoke-run';

test('production config rejects missing deterministic fixture ids', () => {
  expect(() =>
    parseSmokeConfig({
      SMOKE_ENVIRONMENT: 'production',
      SMOKE_FRONTEND_URL: 'https://shopcity.example',
      SMOKE_BACKEND_URL: 'https://api.example',
      SMOKE_CANDIDATE_SHA: 'a'.repeat(40),
    }),
  ).toThrow(/SMOKE_TENANT_ID/);
});

test('smoke run id is traceable and filesystem safe', () => {
  expect(createSmokeRunId(new Date('2026-08-26T14:30:00Z'), 'abc123'))
    .toBe('SMOKE-20260826-143000-abc123');
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm --prefix apps/web exec playwright test --config ./playwright.config.ts tests/smoke/config.smoke.spec.ts
```

Expected: FAIL because `config.ts` and `smoke-run.ts` do not exist.

- [ ] **Step 3: Implement strict configuration parsing**

Create `apps/web/tests/smoke/config.ts` with this public shape:

```ts
export type SmokeEnvironment = 'staging' | 'production';

export interface SmokeConfig {
  environment: SmokeEnvironment;
  frontendUrl: string;
  backendUrl: string;
  candidateSha: string;
  tenantId: string;
  branchId: string;
  deviceId: string;
  activeCustomerId: string;
  activeCardSerial: string;
  inactiveCustomerId: string;
  inactiveCardSerial: string;
  staffCustomerId: string;
  staffCardSerial: string;
  admin: { username: string; password: string };
  supervisor: { username: string; password: string };
  cashier: {
    username: string;
    password: string;
    deviceId: string;
    deviceAttestationSecret: string;
  };
}

export function parseSmokeConfig(env: NodeJS.ProcessEnv): SmokeConfig;
export function loadSmokeConfig(): SmokeConfig;
```

Require these variables with explicit error messages:

```text
SMOKE_ENVIRONMENT
SMOKE_FRONTEND_URL
SMOKE_BACKEND_URL
SMOKE_CANDIDATE_SHA
SMOKE_TENANT_ID
SMOKE_BRANCH_ID
SMOKE_DEVICE_ID
SMOKE_ACTIVE_CUSTOMER_ID
SMOKE_ACTIVE_CARD_SERIAL
SMOKE_INACTIVE_CUSTOMER_ID
SMOKE_INACTIVE_CARD_SERIAL
SMOKE_STAFF_CUSTOMER_ID
SMOKE_STAFF_CARD_SERIAL
SMOKE_ADMIN_USERNAME
SMOKE_ADMIN_PASSWORD
SMOKE_SUPERVISOR_USERNAME
SMOKE_SUPERVISOR_PASSWORD
SMOKE_CASHIER_USERNAME
SMOKE_CASHIER_PASSWORD
SMOKE_CASHIER_DEVICE_ID
SMOKE_CASHIER_DEVICE_ATTESTATION_SECRET
```

Validate candidate SHA using `/^[0-9a-f]{40}$/i`; validate URLs using `new URL(...)`; require the Cashier device ID to equal `SMOKE_DEVICE_ID`.

- [ ] **Step 4: Implement smoke-run identity and result model**

Create `apps/web/tests/smoke/support/smoke-run.ts`:

```ts
export type SmokeOutcome =
  | 'PASS'
  | 'FAIL_TEST'
  | 'FAIL_RECONCILIATION'
  | 'FAIL_INFRASTRUCTURE'
  | 'ABORTED';

export interface SmokeRun {
  smokeRunId: string;
  candidateSha: string;
  startedAt: string;
  outputDir: string;
  evidenceDir: string;
}

export function createSmokeRunId(now = new Date(), suffix = crypto.randomUUID().slice(0, 6)): string;
export function createSmokeRun(candidateSha: string, root = 'test-results/smoke'): SmokeRun;
```

Use UTC `YYYYMMDD-HHmmss`, strip non-alphanumeric suffix characters, and create run/evidence paths without embedding secrets.

- [ ] **Step 5: Add smoke-only Playwright configuration**

Create `apps/web/playwright.smoke.config.ts` based on the existing Playwright config but with:

```ts
export default defineConfig({
  testDir: './tests/smoke',
  testMatch: /.*\.smoke\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  globalSetup: './tests/smoke/global-setup.ts',
  globalTeardown: './tests/smoke/global-teardown.ts',
  reporter: [
    ['list'],
    ['junit', { outputFile: 'test-results/smoke/junit.xml' }],
    ['html', { outputFolder: 'test-results/smoke/html', open: 'never' }],
  ],
  use: {
    baseURL: process.env.SMOKE_FRONTEND_URL,
    locale: 'en-NG',
    timezoneId: 'Africa/Lagos',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

Do not configure a local `webServer`; smoke targets an already deployed environment.

- [ ] **Step 6: Add package scripts**

In `apps/web/package.json` add:

```json
"smoke:test": "playwright test --config ./playwright.smoke.config.ts",
"smoke:cashier": "playwright test --config ./playwright.smoke.config.ts tests/smoke/roles/cashier.smoke.spec.ts",
"smoke:production": "SMOKE_ENVIRONMENT=production playwright test --config ./playwright.smoke.config.ts"
```

In root `package.json` add:

```json
"smoke:test": "npm --prefix apps/web run smoke:test",
"smoke:staging": "SMOKE_ENVIRONMENT=staging npm --prefix apps/web run smoke:test",
"smoke:production": "SMOKE_ENVIRONMENT=production npm --prefix apps/web run smoke:test"
```

- [ ] **Step 7: Run configuration tests and typecheck**

Run:

```bash
npm --prefix apps/web exec playwright test --config ./playwright.config.ts tests/smoke/config.smoke.spec.ts
npm run web:typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/playwright.smoke.config.ts apps/web/tests/smoke/config.ts apps/web/tests/smoke/support/smoke-run.ts apps/web/tests/smoke/config.smoke.spec.ts apps/web/package.json package.json
git commit -m "test(smoke): add smoke configuration and runner"
```

---

### Task 2: Authenticated API Client and UI Role Authentication

**Files:**
- Create: `apps/web/tests/smoke/support/api-client.ts`
- Create: `apps/web/tests/smoke/support/auth.ts`
- Create: `apps/web/tests/smoke/api-client.smoke.spec.ts`

**Interfaces:**
- Produces `SmokeApiSession` with authenticated `APIRequestContext`, CSRF header support, and JSON envelope parsing.
- Produces `createRoleApiSession(role, config)` and `loginRoleInUi(page, role, config)`.
- Later fixture/assertion/reconciliation tasks consume these helpers.

- [ ] **Step 1: Write failing API helper tests**

Create `apps/web/tests/smoke/api-client.smoke.spec.ts` and mock `APIRequestContext` methods to prove:

```ts
expect(csrfHeaderFromCookies([
  { name: 'shopcity_csrf', value: 'csrf-123', domain: 'x', path: '/' },
])).toBe('csrf-123');
```

and that mutation requests send both:

```text
x-csrf-token: csrf-123
Idempotency-Key: SMOKE-...-fixture-reset
```

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
npm --prefix apps/web exec playwright test --config ./playwright.config.ts tests/smoke/api-client.smoke.spec.ts
```

Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement `SmokeApiSession`**

Create `api-client.ts` with:

```ts
export interface SmokeApiSession {
  context: APIRequestContext;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T>;
  patch<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T>;
  dispose(): Promise<void>;
}

export async function createRoleApiSession(
  role: 'admin' | 'supervisor' | 'cashier',
  config: SmokeConfig,
): Promise<SmokeApiSession>;
```

Use `request.newContext({ baseURL: config.frontendUrl })` so API fixture actions traverse the same frontend proxy as users. Authenticate through `POST /api/v1/auth/login`. Cashier login body uses username/password and sends the existing device headers required by ShopCity's login contract; Admin/Supervisor use their normal credentials.

After login, inspect `context.storageState().cookies`, read the existing CSRF cookie name used by `apps/web/lib/api/cookies.ts`, and attach `x-csrf-token` to state-changing requests. Parse ShopCity success envelopes and throw an error containing HTTP status + safe API error code, never response cookies or credentials.

- [ ] **Step 4: Implement UI login helpers**

Create `auth.ts`:

```ts
export type SmokeRole = 'cashier' | 'supervisor' | 'admin';

export async function loginRoleInUi(
  page: Page,
  role: SmokeRole,
  config: SmokeConfig,
): Promise<void>;

export async function logoutRoleInUi(page: Page): Promise<void>;
```

Cashier UI login fills username, password, device ID and attestation secret using current LoginForm labels; Supervisor/Admin fill username/password only. Assert final URLs:

```text
cashier    /cashier
supervisor /supervisor
admin      /admin
```

Never write storage state to evidence artifacts.

- [ ] **Step 5: Run tests and typecheck**

```bash
npm --prefix apps/web exec playwright test --config ./playwright.config.ts tests/smoke/api-client.smoke.spec.ts
npm run web:typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/tests/smoke/support/api-client.ts apps/web/tests/smoke/support/auth.ts apps/web/tests/smoke/api-client.smoke.spec.ts
git commit -m "test(smoke): add authenticated API and role helpers"
```

---

### Task 3: Deterministic Fixture Preflight, Snapshot, and Reset

**Files:**
- Create: `apps/web/tests/smoke/support/fixtures.ts`
- Create: `apps/web/tests/smoke/fixtures.smoke.spec.ts`
- Create: `apps/web/tests/smoke/global-setup.ts`

**Interfaces:**
- Produces `SmokeBaseline` snapshot.
- Produces `preflightFixtures(config, adminApi)`, `captureBaseline(...)`, `resetMutableFixtures(...)`.
- Writes non-secret run metadata to `test-results/smoke/current-run.json` for teardown/evidence tasks.

- [ ] **Step 1: Write failing fixture-preflight tests**

Test that preflight fails when any deterministic fixture resolves to the wrong tenant/branch or role, rather than silently creating it.

Example assertion:

```ts
await expect(
  validateFixtureIdentity(
    { id: 'customer-a', tenantId: 'wrong-tenant' },
    { id: 'customer-a', tenantId: 'smoke-tenant' },
  ),
).rejects.toThrow(/fixture tenant mismatch/i);
```

- [ ] **Step 2: Implement fixture model**

Use this public shape:

```ts
export interface SmokeBaseline {
  customer: { id: string; status: string; fullName: string; email?: string | null };
  card: { serialNumber: string; status: string; customerId: string };
  device: { id: string; status: string; branchId: string };
  balanceKobo: number;
}
```

`preflightFixtures()` MUST verify through normal APIs:

- `/api/v1/auth/me` identities for Admin/Supervisor/Cashier;
- active customer and inactive/staff fixture existence;
- active/inactive card identity;
- device ID/status/branch;
- expected smoke tenant and branch scope.

No create-on-missing behavior is permitted in production or staging smoke execution. Provisioning is a separate operator action described in the runbook.

- [ ] **Step 3: Implement mutable reset using real APIs**

`resetMutableFixtures()` restores:

```text
active customer → ACTIVE
active card     → ACTIVE and assigned to baseline customer
smoke device    → ACTIVE
```

Use current customer/card/device status endpoints and idempotency keys containing the current `smokeRunId`.

Do not attempt to delete historical transactions/ledger/audit rows.

- [ ] **Step 4: Implement global setup**

`global-setup.ts` must:

1. call `loadSmokeConfig()`;
2. call `createSmokeRun(config.candidateSha)`;
3. authenticate Admin API;
4. run fixture preflight;
5. capture baseline;
6. reset mutable fixtures;
7. write `current-run.json` containing only run ID, candidate SHA, environment, public fixture IDs, baseline non-secret state, and timestamps.

If any prerequisite fails, throw `FAIL_INFRASTRUCTURE: <reason>` before browser tests begin.

- [ ] **Step 5: Run tests**

```bash
npm --prefix apps/web exec playwright test --config ./playwright.config.ts tests/smoke/fixtures.smoke.spec.ts
npm run web:typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/tests/smoke/support/fixtures.ts apps/web/tests/smoke/fixtures.smoke.spec.ts apps/web/tests/smoke/global-setup.ts
git commit -m "test(smoke): add deterministic fixture preflight"
```

---

### Task 4: Evidence, Timing, and Reconciliation Core

**Files:**
- Create: `apps/web/tests/smoke/support/evidence.ts`
- Create: `apps/web/tests/smoke/support/timing.ts`
- Create: `apps/web/tests/smoke/support/assertions.ts`
- Create: `apps/web/tests/smoke/support/reconciliation.ts`
- Create: `apps/web/tests/smoke/global-teardown.ts`
- Create: `apps/web/tests/smoke/reconciliation.smoke.spec.ts`

**Interfaces:**
- Produces `recordWorkflowEvidence()`, `measureWorkflow()`, `registerFinancialArtifact()`, `reconcileRun()`, `assertPostRunInvariants()`.
- Later role/scenario tests register artifacts rather than deleting them.

- [ ] **Step 1: Write failing reconciliation tests**

Prove three rules:

```ts
expect(classifySmokeOutcome({ testsPassed: true, reconciliationPassed: true })).toBe('PASS');
expect(classifySmokeOutcome({ testsPassed: false, reconciliationPassed: true })).toBe('FAIL_TEST');
expect(classifySmokeOutcome({ testsPassed: true, reconciliationPassed: false })).toBe('FAIL_RECONCILIATION');
```

Also prove evidence redaction rejects keys matching `/password|secret|cookie|csrf|token/i`.

- [ ] **Step 2: Implement evidence model**

Use:

```ts
export interface WorkflowEvidence {
  group: 'cashier' | 'supervisor' | 'admin' | 'cross-role' | 'guardrail' | 'offline';
  name: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  references: Record<string, string>;
  errorCode?: string;
}

export interface FinancialArtifact {
  kind: 'EARN' | 'REDEEM' | 'ADJUSTMENT';
  referenceId: string;
  reversalRequired: boolean;
}
```

Write JSON atomically under the current run's evidence directory. Allow IDs, receipt numbers, statuses, route names, timings, and candidate SHA. Reject secret-like field names before serialization.

- [ ] **Step 3: Implement timing helper**

```ts
export async function measureWorkflow<T>(
  name: string,
  action: () => Promise<T>,
): Promise<{ value: T; durationMs: number }>;
```

Use `performance.now()` and record timings for lookup, Earn response, Redeem response, approval decision, and representative report load.

- [ ] **Step 4: Implement canonical reconciliation**

`reconcileRun()` receives registered financial artifacts and uses real transaction/reversal or compensating adjustment endpoints:

- confirmed Earn → canonical transaction reversal;
- confirmed Redeem → canonical reversal/restoration path;
- manual +X adjustment → compensating -X adjustment using a reason containing `smokeRunId`;
- pending/rejected operations → verify terminal expected state; do not fabricate ledger cleanup.

Never issue SQL DELETEs.

- [ ] **Step 5: Implement post-run invariants**

`assertPostRunInvariants()` checks through APIs:

```text
baseline smoke balance restored
no unexpected unresolved smoke approvals
no unexpected open smoke fraud flags
smoke device status == baseline
smoke active card/customer status == baseline
no smoke offline record remains RETRY_REQUIRED
pilot credit-lot reconciliation healthy
```

Scope all queries to the smoke tenant/run where the endpoint supports it. If an API lacks run-level filtering, identify smoke records using deterministic fixture IDs and `smokeRunId` receipt/reason prefixes.

- [ ] **Step 6: Implement global teardown**

Teardown must run even after test failures:

```text
read current-run.json
→ authenticate Admin API
→ reconcile registered financial artifacts
→ reset mutable fixtures to baseline
→ run post-run invariants
→ finalize manifest.json + summary.md + reconciliation.json
```

If reconciliation/invariants fail, throw after evidence is written so Playwright exits non-zero.

- [ ] **Step 7: Run tests and commit**

```bash
npm --prefix apps/web exec playwright test --config ./playwright.config.ts tests/smoke/reconciliation.smoke.spec.ts
npm run web:typecheck
git add apps/web/tests/smoke/support apps/web/tests/smoke/global-teardown.ts apps/web/tests/smoke/reconciliation.smoke.spec.ts
git commit -m "test(smoke): add evidence and reconciliation core"
```

---

### Task 5: Cashier Happy-Path Smoke Suite

**Files:**
- Create: `apps/web/tests/smoke/roles/cashier.smoke.spec.ts`

**Interfaces:**
- Consumes role login, config, evidence/timing helpers, deterministic card/customer fixtures.
- Registers confirmed Earn/Redeem artifacts for teardown.

- [ ] **Step 1: Write the Cashier login/lookup test**

Implement a serial test that:

```text
login as smoke.cashier
assert /cashier
assert device/branch context visible
assert scanner input focused
fill active smoke card serial
press Enter
assert expected masked customer identity
assert card ACTIVE / eligibility visible
assert balance visible
```

Measure lookup from Enter to verified-customer state and record evidence.

- [ ] **Step 2: Add confirmed Earn UI flow**

Generate receipt:

```ts
const receiptNumber = `${smokeRunId}-EARN-01`;
```

Through `/cashier/earn?card=<active-card>` fill required receipt and a deliberately low purchase amount that remains below approval threshold. Submit through UI and assert confirmed state. Verify via Admin/Supervisor API that receipt exists, ledger credit exists, credit lot exists, and balance increased by the backend-confirmed loyalty amount. Register the transaction reference for teardown reversal.

- [ ] **Step 3: Add Redeem UI flow**

Ensure baseline/smoke credit is sufficient through fixture setup or the confirmed Earn from the prior serial step. Navigate through verified-card context, submit a small Redeem below approval threshold, assert confirmation, then API-verify redemption allocation and decreased balance. Register the redemption transaction for canonical teardown reversal.

- [ ] **Step 4: Add customer view, recent-today, sync queue, logout**

Assert:

- Cashier customer view contains masked—not full—phone data;
- just-created activity appears under `Recent today` with correct +/− semantics;
- Sync Queue loads without falsely claiming queued work when empty;
- logout returns to login and subsequent `/auth/me` is unauthorized.

- [ ] **Step 5: Run staging Cashier smoke against a configured preview**

Run:

```bash
SMOKE_ENVIRONMENT=staging \
SMOKE_FRONTEND_URL="$STAGING_FRONTEND_URL" \
SMOKE_BACKEND_URL="$STAGING_BACKEND_URL" \
npm --prefix apps/web run smoke:cashier
```

Expected: all Cashier tests pass; teardown restores balance/status.

- [ ] **Step 6: Commit**

```bash
git add apps/web/tests/smoke/roles/cashier.smoke.spec.ts
git commit -m "test(smoke): cover cashier core workflows"
```

---

### Task 6: Supervisor Smoke Suite

**Files:**
- Create: `apps/web/tests/smoke/roles/supervisor.smoke.spec.ts`

**Interfaces:**
- Uses one run-specific customer identity with deterministic prefix `SMOKE-<run>-SUP-CUSTOMER`.
- Uses pre-provisioned spare smoke card serials supplied by `SMOKE_SPARE_CARD_SERIALS` as a comma-separated config field; extend `SmokeConfig` and its validation in this task.

- [ ] **Step 1: Extend configuration for spare cards**

Add:

```ts
spareCardSerials: string[];
```

Require at least two serials in `SMOKE_SPARE_CARD_SERIALS` for Supervisor/Admin card lifecycle scenarios. Add a config test rejecting fewer than two.

- [ ] **Step 2: Implement Supervisor role/routing and customer management smoke**

Through UI:

```text
login Supervisor
→ /supervisor
→ Customers
→ register run-specific synthetic customer
→ edit one profile field
→ set status INACTIVE
→ restore ACTIVE
```

API-verify each durable mutation. The run-specific customer may remain as immutable operational evidence if the product has no delete operation; ensure identifying fields are clearly synthetic and tagged by `smokeRunId`.

- [ ] **Step 3: Implement card lifecycle smoke**

Using spare smoke cards:

```text
assign spare A to run customer
→ verify ACTIVE
replace with spare B
→ verify old/new lifecycle
block spare B
→ unblock spare B
```

Use UI actions and API verification. Restore the fixture to a known terminal state during teardown/reset.

- [ ] **Step 4: Implement transactions/approvals/fraud/reports smoke**

Assert Supervisor can:

- find known smoke transaction and open detail;
- see a seeded/run-created pending approval;
- approve one and reject another run-specific approval;
- open Fraud queue and resolve only a smoke-tagged flag if such a deterministic fixture exists;
- load Supervisor reports;
- view materialization state.

Assert the materialization refresh control is absent/disabled for Supervisor.

- [ ] **Step 5: Run and commit**

```bash
npm --prefix apps/web run smoke:test -- tests/smoke/roles/supervisor.smoke.spec.ts
git add apps/web/tests/smoke/roles/supervisor.smoke.spec.ts apps/web/tests/smoke/config.ts apps/web/tests/smoke/config.smoke.spec.ts
git commit -m "test(smoke): cover supervisor core workflows"
```

---

### Task 7: Admin Smoke Suite

**Files:**
- Create: `apps/web/tests/smoke/roles/admin.smoke.spec.ts`

**Interfaces:**
- Uses smoke tenant only.
- Staging may perform full device secret rotation; production performs it only when `SMOKE_ALLOW_DEVICE_ROTATION=true`, otherwise verifies device inspection/status operations and records `SKIPPED_BY_POLICY` for rotation without counting it as a smoke failure.

- [ ] **Step 1: Add production-policy configuration**

Extend `SmokeConfig`:

```ts
allowDeviceRotation: boolean;
```

Parse `SMOKE_ALLOW_DEVICE_ROTATION === 'true'`; default false.

- [ ] **Step 2: Implement Admin login/users/devices smoke**

Through UI assert:

- Admin lands on `/admin`;
- Users page loads and a run-specific synthetic user can be created/updated when fixture policy permits;
- Devices page shows `SMOKE-POS-01` with correct branch/status;
- deactivate/reactivate smoke device works without touching operational devices.

If device secret rotation runs, assert a one-time secret is displayed but never attach/screenshot the secret value; immediately restore the Cashier smoke credential operationally only if the application exposes the rotated value to the test process securely. For production default, leave rotation disabled and test status lifecycle instead.

- [ ] **Step 3: Implement branch/customer/card/adjustment smoke**

Use only reversible smoke-branch values. Example branch mutation: change smoke branch display name suffix to `[<shortRun>]`, verify, then restore baseline name in teardown. Exercise Admin customer/card workspace. Submit a +₦100 adjustment using reason `[<smokeRunId>] admin smoke adjustment`; API-verify and register a -₦100 compensation for teardown.

- [ ] **Step 4: Implement Admin reports/audit/operations smoke**

Assert:

- Transactions page opens known smoke transaction;
- Admin reports load;
- CSV export returns non-empty content with `text/csv`/download semantics;
- Audit contains the smoke-tagged adjustment or customer/card action;
- Pilot Operations loads;
- report materialization refresh succeeds.

Record report-load timing.

- [ ] **Step 5: Run and commit**

```bash
npm --prefix apps/web run smoke:test -- tests/smoke/roles/admin.smoke.spec.ts
git add apps/web/tests/smoke/roles/admin.smoke.spec.ts apps/web/tests/smoke/config.ts
git commit -m "test(smoke): cover admin core workflows"
```

---

### Task 8: Cross-Role Financial Scenarios

**Files:**
- Create: `apps/web/tests/smoke/scenarios/earn-approval.smoke.spec.ts`
- Create: `apps/web/tests/smoke/scenarios/redeem.smoke.spec.ts`
- Create: `apps/web/tests/smoke/scenarios/reversal.smoke.spec.ts`

**Interfaces:**
- Uses serial execution and fresh browser contexts per role.
- Registers every financial artifact for teardown.

- [ ] **Step 1: Implement Earn-requires-approval scenario**

Cashier UI:

```text
lookup active smoke card
→ Earn using receipt `${smokeRunId}-APPROVAL-01`
→ amount configured above current approval threshold
→ assert PENDING_APPROVAL
```

API assert approval exists and balance has not increased prematurely.

Supervisor UI:

```text
Approvals
→ locate smoke receipt/reference
→ approve
```

API assert ledger entry + credit lot + increased balance, then Cashier lookup verifies updated balance. Register Earn for teardown reversal.

- [ ] **Step 2: Implement dedicated Redeem scenario**

API fixture verification first ensures sufficient available credit; do not insert ledger records directly. Cashier UI completes a Redeem. API verifies FIFO allocation rows and balance change. Register reversal.

- [ ] **Step 3: Implement reversal scenario**

Create a confirmed smoke Earn through Cashier UI. Supervisor or Admin UI opens the transaction and reverses it with reason `[${smokeRunId}] reversal smoke`. Assert through API:

```text
original transaction still exists
compensating transaction/ledger exists
balance reconciles
smoke audit record exists
```

Mark the artifact reconciled so global teardown does not reverse it twice.

- [ ] **Step 4: Run scenarios and commit**

```bash
npm --prefix apps/web run smoke:test -- tests/smoke/scenarios
git add apps/web/tests/smoke/scenarios
git commit -m "test(smoke): add cross-role financial scenarios"
```

---

### Task 9: Critical Negative Guardrails

**Files:**
- Create: `apps/web/tests/smoke/guardrails/rbac.smoke.spec.ts`
- Create: `apps/web/tests/smoke/guardrails/business-rules.smoke.spec.ts`

**Interfaces:**
- Negative tests must assert both UI denial and, where consequential, direct API denial using the same role session.
- Do not enumerate every validation error; restrict to release-critical rules from the design.

- [ ] **Step 1: Implement RBAC guardrails**

Cashier:

```text
/admin → denied/redirected
/supervisor → denied/redirected
customer/card management mutation API → 403
```

Supervisor:

```text
/admin/users → denied
/admin/devices → denied
Admin-only audit endpoint → 403
Admin-only report refresh → 403
```

Assert no protected Admin UI content flashes before redirect by checking final route and absence of an Admin-only heading.

- [ ] **Step 2: Implement business-rule guardrails**

Through UI where available:

- reuse `${smokeRunId}-DUP-01` receipt after one successful Earn → duplicate receipt rejected;
- inactive card fixture → Earn blocked/rejected;
- staff card fixture → Earn rejected with staff/ineligible message;
- request Redeem above available balance → blocked/rejected;
- simulated offline browser → Redeem UI refuses submission.

API-verify no unexpected ledger/credit mutation after every rejected guardrail.

- [ ] **Step 3: Add idle-session guardrail to staging only**

Do not wait 15–30 minutes in smoke. Configure a dedicated staging smoke deployment with a short idle timeout via environment override, or skip this smoke if no short-timeout deployment is available and rely on the existing server-side integration tests. Production smoke MUST NOT mutate global idle-timeout configuration. Document the guardrail as `covered-by-server-regression` in production evidence rather than pretending it was exercised.

- [ ] **Step 4: Run and commit**

```bash
npm --prefix apps/web run smoke:test -- tests/smoke/guardrails
git add apps/web/tests/smoke/guardrails
git commit -m "test(smoke): add critical guardrails"
```

---

### Task 10: Offline Earn Smoke

**Files:**
- Create: `apps/web/tests/smoke/offline/offline-earn.smoke.spec.ts`

**Interfaces:**
- Uses Playwright request routing to block only the smoke browser's `/api/v1/loyalty/earn`/sync-relevant requests; never disables shared backend infrastructure.
- Production Offline Earn only executes when `SMOKE_ALLOW_OFFLINE_PRODUCTION=true`.

- [ ] **Step 1: Add policy configuration**

Extend `SmokeConfig`:

```ts
allowOfflineProduction: boolean;
```

Default false for production and true for staging unless explicitly overridden.

- [ ] **Step 2: Implement staging Offline Earn**

```ts
await page.route('**/api/v1/loyalty/earn', route => route.abort('internetdisconnected'));
```

Then through Cashier UI:

```text
lookup already completed while online
→ open Earn
→ submit `${smokeRunId}-OFFLINE-01`
→ assert saved locally / waiting-to-sync
→ open Sync Queue and assert record exists
→ remove route interception
→ submit/retry sync
→ assert backend CONFIRMED
→ API verify ledger/balance
```

Register confirmed Earn for teardown reversal.

- [ ] **Step 3: Verify Offline Redeem remains blocked**

Abort Redeem/API requests in the browser context and assert the UI does not create a local redeem queue record and shows the conservative offline block message.

- [ ] **Step 4: Production policy**

When environment is production and `allowOfflineProduction` is false, skip the destructive Offline Earn test with an explicit evidence reason. When true, execute exactly one low-value Offline Earn against `SMOKE-POS-01`, then reconcile canonically.

- [ ] **Step 5: Run and commit**

```bash
npm --prefix apps/web run smoke:test -- tests/smoke/offline
git add apps/web/tests/smoke/offline apps/web/tests/smoke/config.ts
git commit -m "test(smoke): cover offline earn reconciliation"
```

---

### Task 11: Staging Smoke GitHub Actions Gate

**Files:**
- Create: `.github/workflows/staging-smoke.yml`

**Interfaces:**
- Consumes existing release-candidate/PR SHA and staging deployment URLs/secrets.
- Produces `shopcity-staging-smoke-<sha>` evidence artifact.

- [ ] **Step 1: Create the staging workflow**

Use triggers that fit the current release flow without running against every arbitrary push. Recommended initial trigger:

```yaml
name: staging-smoke
on:
  workflow_dispatch:
    inputs:
      candidate_sha:
        required: true
        type: string
  pull_request:
    branches: [master]
```

Use an `environment: staging` job and `concurrency`:

```yaml
concurrency:
  group: shopcity-staging-smoke-${{ github.event.pull_request.head.sha || inputs.candidate_sha }}
  cancel-in-progress: true
```

- [ ] **Step 2: Verify exact SHA and deployment prerequisites**

Checkout the candidate ref and fail unless:

```bash
ACTUAL_SHA="$(git rev-parse HEAD)"
test "$ACTUAL_SHA" = "$CANDIDATE_SHA"
```

Require staging frontend/backend URLs and all deterministic fixture secrets. Do not echo secrets.

- [ ] **Step 3: Install and run smoke**

Use the repository's existing Node/npm setup pattern, install Playwright Chromium, then:

```bash
npm ci
npx playwright install --with-deps chromium
npm run smoke:staging
```

- [ ] **Step 4: Upload evidence on success or failure**

Use `actions/upload-artifact` with `if: always()` and path:

```text
apps/web/test-results/smoke/**
```

Set retention consistent with existing release evidence policy. Ensure Playwright auth/session storage is not included; the suite should not create persistent storage-state files.

- [ ] **Step 5: Validate workflow syntax and commit**

Run:

```bash
npm run format:check
npm run openspec:validate
```

Commit:

```bash
git add .github/workflows/staging-smoke.yml
git commit -m "ci(smoke): add staging release smoke gate"
```

---

### Task 12: Manual Approval-Gated Production Smoke Workflow

**Files:**
- Create: `.github/workflows/production-smoke.yml`

**Interfaces:**
- Manual only.
- Uses GitHub `production-smoke` Environment for approval and secrets.
- Single concurrent mutating run.

- [ ] **Step 1: Create strict workflow dispatch inputs**

```yaml
name: production-smoke
on:
  workflow_dispatch:
    inputs:
      candidate_sha:
        description: Exact 40-character deployed candidate SHA
        required: true
        type: string
      confirmation:
        description: Type RUN_PRODUCTION_SMOKE
        required: true
        type: string
      smoke_run_reason:
        required: true
        type: string
```

Reject unless confirmation equals `RUN_PRODUCTION_SMOKE` and SHA matches `^[0-9a-fA-F]{40}$`.

- [ ] **Step 2: Add approval and concurrency**

```yaml
jobs:
  production-smoke:
    environment: production-smoke
    concurrency:
      group: shopcity-production-smoke
      cancel-in-progress: false
```

Configure the GitHub Environment outside code with required reviewers before enabling production execution.

- [ ] **Step 3: Verify deployed release SHA before mutations**

Call the existing release/pilot-operations endpoint or canonical deployment evidence that exposes backend release SHA and compare it to `candidate_sha`. Also require a frontend deployment evidence value such as `SMOKE_DEPLOYED_FRONTEND_SHA` supplied by the environment/release workflow. Fail before fixture reset if either does not equal the requested SHA.

- [ ] **Step 4: Run production smoke**

```bash
SMOKE_ENVIRONMENT=production npm run smoke:production
```

No shared infrastructure fault injection is allowed. Browser-local network interception remains permitted for Offline Earn only when explicitly enabled.

- [ ] **Step 5: Always upload evidence and surface reconciliation failure prominently**

Upload `apps/web/test-results/smoke/**` with `if: always()`. Add a job summary that prints only:

```text
candidate SHA
smokeRunId
overall outcome
reconciliation outcome
artifact name
```

Never print fixture credentials or device secrets.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/production-smoke.yml
git commit -m "ci(smoke): add approved production smoke workflow"
```

---

### Task 13: Immutable Smoke Evidence Verifier and Release Integration

**Files:**
- Create: `scripts/smoke/verify-smoke-evidence.mjs`
- Create: `scripts/smoke/verify-smoke-evidence.spec.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml` only if smoke-evidence verification belongs in the current release-certification job without creating circular dependencies.

**Interfaces:**
- `node scripts/smoke/verify-smoke-evidence.mjs --manifest <path> --candidate-sha <sha>` exits 0 only for valid PASS evidence matching the exact SHA.

- [ ] **Step 1: Write verifier tests**

Use Node's built-in test runner. Cover:

```text
PASS manifest + matching SHA → success
manifest result FAIL_TEST → failure
manifest result FAIL_RECONCILIATION → failure
candidate SHA mismatch → failure
missing reconciliation PASS → failure
secret-like key in evidence → failure
missing mandatory role group → failure
```

- [ ] **Step 2: Implement verifier**

Require manifest fields:

```json
{
  "smokeRunId": "SMOKE-...",
  "environment": "staging|production",
  "candidateSha": "40hex",
  "startedAt": "ISO",
  "completedAt": "ISO",
  "result": "PASS",
  "groups": {
    "cashier": "PASS",
    "supervisor": "PASS",
    "admin": "PASS",
    "crossRole": "PASS",
    "guardrails": "PASS",
    "reconciliation": "PASS"
  }
}
```

Recursively reject object keys matching `/password|secret|cookie|csrf|authorization|service[_-]?role|redis[_-]?(url|token)/i`.

- [ ] **Step 3: Add scripts**

Root `package.json`:

```json
"verify:smoke-evidence": "node scripts/smoke/verify-smoke-evidence.mjs",
"test:smoke-evidence": "node --test scripts/smoke/verify-smoke-evidence.spec.mjs"
```

- [ ] **Step 4: Integrate without circular gating**

Do not make staging smoke depend on a CI job that itself requires staging smoke. Instead:

```text
CI/security/deploy
→ staging-smoke
→ release-certification/evidence verification
```

If the current `ci.yml` cannot express that without a cycle, leave smoke as a separate required check and have the final release-certification workflow consume/download its artifact.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test:smoke-evidence
npm run format:check
git add scripts/smoke package.json .github/workflows/ci.yml
git commit -m "ci(smoke): verify exact-sha smoke evidence"
```

Only stage `.github/workflows/ci.yml` if it was actually changed.

---

### Task 14: Operator Runbook and Provisioning Checklist

**Files:**
- Create: `docs/runbooks/smoke-testing.md`
- Modify: `README.md` with one short link under testing/release operations if appropriate.

**Interfaces:**
- Documents one-time fixture provisioning and how to respond to `FAIL_RECONCILIATION`.

- [ ] **Step 1: Document one-time smoke tenant provisioning**

Include an explicit checklist:

```text
[ ] dedicated tenant created
[ ] dedicated branch created
[ ] smoke Admin created
[ ] smoke Supervisor created
[ ] smoke Cashier created
[ ] SMOKE-POS-01 created, branch-bound, ACTIVE
[ ] Cashier device credential provisioned into GitHub production-smoke environment
[ ] active baseline customer/card provisioned
[ ] inactive customer/card provisioned
[ ] staff customer/card provisioned
[ ] >=2 spare cards provisioned
[ ] production smoke GitHub Environment has required reviewers
```

Do not document actual IDs or credentials; document environment variable names only.

- [ ] **Step 2: Document execution**

Staging:

```text
release candidate → staging deployment → automatic smoke → artifact
```

Production:

```text
Actions → production-smoke → Run workflow
candidate_sha=<exact deployed SHA>
confirmation=RUN_PRODUCTION_SMOKE
smoke_run_reason=<release/pilot reason>
→ reviewer approves Environment
```

- [ ] **Step 3: Document failure recovery**

For `FAIL_RECONCILIATION`:

1. do not rerun production smoke;
2. download evidence artifact;
3. identify unreconciled references by `smokeRunId`;
4. use canonical ShopCity Admin reversal/adjustment controls;
5. verify customer/card/device baseline and credit-lot reconciliation;
6. record incident resolution;
7. only then permit another production smoke run.

For `FAIL_TEST`, preserve evidence, fix/redeploy candidate, rerun staging first.

For `FAIL_INFRASTRUCTURE`, do not create replacement fixtures; repair the configured smoke fixture/environment.

- [ ] **Step 4: Document evidence retention and privacy**

Explicitly forbid storing screenshots of one-time device secrets and prohibit attaching Playwright storage state. State that smoke customer PII must be synthetic.

- [ ] **Step 5: Format and commit**

```bash
npm run format:check
git add docs/runbooks/smoke-testing.md README.md
git commit -m "docs(smoke): add smoke operations runbook"
```

Only stage `README.md` if changed.

---

### Task 15: Full Verification and Release-Gate Acceptance

**Files:**
- Modify only files required to fix defects discovered by verification.

**Interfaces:**
- Produces the first complete staging smoke evidence bundle suitable for release certification.

- [ ] **Step 1: Run static verification**

```bash
npm run format:check
npm run lint
npm run typecheck
npm run web:lint
npm run web:typecheck
npm run openapi:lint
npm run client:typecheck
npm run openspec:validate
```

Expected: all PASS.

- [ ] **Step 2: Run existing regression gates**

```bash
npm test -- --runInBand
npm run test:integration
npm run test:e2e
npm run web:critical:test
```

Expected: all PASS.

- [ ] **Step 3: Run smoke-support unit/config tests**

```bash
npm --prefix apps/web exec playwright test --config ./playwright.config.ts 'tests/smoke/*.smoke.spec.ts'
npm run test:smoke-evidence
```

Expected: PASS without requiring production credentials for pure support tests; environment-dependent suites remain under `playwright.smoke.config.ts`.

- [ ] **Step 4: Run the complete staging smoke against a frozen candidate**

Set the exact staging environment secrets and run:

```bash
npm run smoke:staging
```

Acceptance requires:

```text
Cashier PASS
Supervisor PASS
Admin PASS
Cross-role PASS
Guardrails PASS
Reconciliation PASS
Overall PASS
```

- [ ] **Step 5: Verify evidence provenance**

```bash
npm run verify:smoke-evidence -- \
  --manifest apps/web/test-results/smoke/<run>/evidence/manifest.json \
  --candidate-sha "$(git rev-parse HEAD)"
```

Expected: PASS.

- [ ] **Step 6: Verify GitNexus impact before final PR gate**

```bash
npm run gitnexus:analyze
npm run proposal:impact
```

Review high-risk financial/auth/device impacts manually before production smoke is enabled.

- [ ] **Step 7: Trigger one approved production smoke on the isolated tenant**

Use the GitHub `production-smoke` workflow against the exact deployed SHA. Acceptance requires overall `PASS` and reconciliation `PASS`. Do not merge/release on a partial role pass.

- [ ] **Step 8: Final commit if verification required fixes**

If no fixes were required, do not create an empty commit. If fixes were required:

```bash
git add <only-verified-smoke-fix-files>
git commit -m "fix(smoke): close smoke verification findings"
```

Then rerun Steps 1–7 against the new candidate SHA.

---

## Implementation Order and Review Gates

Execute tasks in order. Recommended reviewer checkpoints:

1. **Tasks 1–4:** framework/config/auth/fixtures/evidence — review for secret handling and fail-closed behavior before writing financial scenarios.
2. **Tasks 5–10:** role/scenario/guardrail/offline coverage — review against TRD core workflows and ensure every financial write registers reconciliation.
3. **Tasks 11–13:** CI/production workflow/evidence verifier — review for exact-SHA provenance, environment approvals, and concurrency.
4. **Tasks 14–15:** operator readiness and full release-gate proof.

A task is not complete merely because Playwright assertions pass. Any task that performs financial mutations is complete only when its registered teardown/reconciliation path is also tested.

## Self-Review Results

- **Spec coverage:** All design requirements are mapped: staging automation, manual production approval, dedicated persistent tenant, deterministic fixtures, `smokeRunId`, API/UI hybrid, all three roles, cross-role financial scenarios, guardrails, Offline Earn, reconcile-and-preserve, invariant checks, evidence, concurrency, timings, and release gating.
- **Placeholder scan:** No `TBD`, `TODO`, “implement later”, or undefined future work remains. Policy-conditional actions use explicit config flags and defined evidence behavior.
- **Type consistency:** Shared names are consistent across tasks: `SmokeConfig`, `SmokeRun`, `SmokeOutcome`, `SmokeApiSession`, `SmokeBaseline`, `WorkflowEvidence`, and `FinancialArtifact`.
- **Scope check:** This is one subsystem with sequential layers rather than independent products; a single implementation plan is appropriate.
