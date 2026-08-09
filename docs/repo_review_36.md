# ShopCity Sprint 3 Halfway Completion Plan

**Repository:** `micahjatau/shopcity_LP`
**Planning baseline:** `3563492bef654d4fad4eb51efadb3e48e0ade631`
**Baseline commit:** `test: align reversal openapi contract`

## 1. Objective

Complete the Sprint 3 halfway implementation as a coherent, evidence-backed release containing:

- Receipt-backed earning.
- Receipt-backed redemption.
- Earn and redemption approvals.
- FIFO credit-lot allocation.
- Immutable financial evidence.
- Session-bound device enforcement.
- Replay-resistant device attestation.
- Transactional SMS intent and reliable delivery processing.
- Safe migration and receipt-quarantine operations.
- Accurate OpenAPI and generated-client contracts.
- Green validation against one immutable release SHA.

The following capabilities remain **formally deferred** until the second half of Sprint 3:

- Executable transaction reversals.
- Executable manual balance adjustments.
- Receiptless transaction-detail and customer-ledger read models.
- Branch provenance for receiptless financial entries.

The halfway implementation must not expose these deferred capabilities as available functionality.

---

# 2. Completion definition

The halfway implementation is complete only when all of the following are true:

1. The reversal endpoint truthfully reports that reversals are unavailable.
2. Every active device uses a dedicated high-entropy attestation secret.
3. Supervisors cannot manage devices outside their assigned branch.
4. No API returns device fingerprint material that can be used as an attestation key.
5. The release-validation scope check can detect uncovered critical files.
6. Critical financial coverage thresholds are executed in CI.
7. Formatting and validation cover all relevant documentation, OpenSpec and runbook files.
8. The actual shared-backup restore test runs in a protected release workflow and cannot silently skip.
9. SMS payloads correctly preserve zero balances and malformed payloads remain terminal.
10. Receipt-quarantine operational tables have batch and actor integrity.
11. All deferred receiptless capabilities are removed from active product and API claims.
12. A real SMS smoke test is recorded.
13. Every release gate passes against one final immutable commit.
14. Issue #1 and the release-evidence package reference that same commit.

---

# 3. Implementation sequence

| Order | Workstream                                                | Primary dependency      |
| ----: | --------------------------------------------------------- | ----------------------- |
|     1 | Freeze halfway scope and create OpenSpec change           | None                    |
|     2 | Correct reversal contract                                 | Scope decision          |
|     3 | Complete device-secret migration and branch authorization | Database and auth       |
|     4 | Replace validation-scope gate                             | None                    |
|     5 | Expand CI, formatting and coverage enforcement            | Validation-scope design |
|     6 | Add protected shared-restore release workflow             | CI foundation           |
|     7 | Complete SMS and quarantine hardening                     | Existing runtime        |
|     8 | Reconcile deferred receiptless capability claims          | API and documentation   |
|     9 | Run exact-head release validation                         | All implementation work |
|    10 | Assemble final evidence and close halfway gate            | Green release SHA       |

Do not begin executable reversal or manual-adjustment work while this plan is active.

---

# 4. Workstream 1 — Freeze the halfway scope

## 4.1 Create the controlling OpenSpec change

Create:

```text
openspec/changes/sprint-3-halfway-completion/
├── .openspec.yaml
├── proposal.md
├── design.md
├── tasks.md
└── specs/
    ├── reversal-capability-boundary/
    ├── device-attestation-cutover/
    ├── branch-scoped-device-administration/
    ├── repository-validation-enforcement/
    ├── protected-release-evidence/
    ├── sms-delivery-closeout/
    └── quarantine-operator-integrity/
```

The proposal should explicitly state that receiptless Reversal and Adjustment execution are deferred. The existing read models currently reject receiptless transaction details and filter them from customer-ledger lists.

## 4.2 Add a halfway capability matrix

Update:

- `docs/api/sprint-3-financial-contract-draft.md`
- Main README or operator-facing workflow document.
- Generated API description where appropriate.

Use a matrix similar to:

| Capability                        | Halfway state |
| --------------------------------- | ------------- |
| Earn                              | Available     |
| Earn approval                     | Available     |
| Redemption                        | Available     |
| Redemption approval               | Available     |
| Transaction reversal              | Unavailable   |
| Manual adjustment                 | Unavailable   |
| Receiptless transaction detail    | Unavailable   |
| Receiptless customer-ledger entry | Unavailable   |

## Acceptance criteria

- No active document describes Reversal or manual Adjustment as an operational halfway capability.
- Every deferred capability has an explicit future-phase reference.
- OpenSpec validation passes.
- No implementation task for real reversals is included in this change.

---

# 5. Workstream 2 — Correct the reversal API contract

## Problem

The reversal service returns a normal object, which the global response interceptor wraps as:

```json
{
  "success": true,
  "data": {
    "code": "REVERSAL_DEFERRED",
    "transactionId": "..."
  },
  "meta": {}
}
```

The controller’s manual OpenAPI schema currently documents `success: false` for the HTTP 202 response.

The runtime response is wrapped as successful by the global interceptor.

More importantly, the endpoint creates no reversal job or durable reversal request. HTTP 202 therefore implies asynchronous processing that does not exist.

## 5.1 Adopt a truthful unavailable response

For the halfway release, use:

- HTTP status: `503 Service Unavailable`.
- Stable error code: `REVERSAL_UNAVAILABLE`.
- Message: `Transaction reversal is not available in this release`.
- No Reversal, Approval, OutboxEvent, AuditLog or review request is created.
- No completed idempotency record is created for an operation that was not accepted.

Retain the route for forward compatibility, but remove it from operator-facing UI workflows.

## 5.2 Controller changes

Modify:

- `src/modules/reversals/reversals.controller.ts`

Remove:

- `@HttpCode(202)`.
- The manually created success/deferred envelope.
- `ApiResponse` claiming a successful 202 result.

Add:

- Standard error-envelope documentation for 503.
- A documented `REVERSAL_UNAVAILABLE` example.
- An operation description explicitly saying that no reversal request is queued.

## 5.3 Service changes

Modify:

- `src/modules/reversals/reversals.service.ts`

The service should:

1. Validate the transaction identifier and request body using the normal DTO pipeline.
2. Throw `DomainHttpException(503, 'REVERSAL_UNAVAILABLE', ...)`.
3. Perform no persistence.

Remove the current completed idempotency record for a deferred no-op. The current service persists a completed response despite performing no reversal.

## 5.4 Contract and HTTP tests

Update:

- `src/modules/reversals/reversals.controller.spec.ts`
- `src/modules/reversals/reversals.service.spec.ts`
- `test/openapi.int-spec.ts`
- Relevant E2E test.

Tests must verify:

- Runtime status is 503.
- Runtime envelope has `success: false`.
- Error code is `REVERSAL_UNAVAILABLE`.
- No idempotency record is created.
- No financial, approval, outbox or audit row is created.
- OpenAPI has a documented 503 response.
- OpenAPI does not have 201 or 202 success responses.
- Generated client does not expose a successful reversal response type.

## 5.5 Regenerate artifacts

Run:

```bash
npm run openapi:lint
npm run openapi:diff
npm run client:generate
npm run client:typecheck
git diff --exit-code -- docs/api/openapi.json
git diff --exit-code -- client/shopcity-client.ts
```

## Acceptance criteria

- Runtime and OpenAPI envelopes match exactly.
- Calling the reversal endpoint cannot be interpreted as an accepted background operation.
- No durable record suggests that a reversal was queued.
- UI-facing documentation excludes reversal from available workflows.

---

# 6. Workstream 3 — Complete device-attestation cutover

## Problems

New devices receive a dedicated encrypted secret, but legacy devices without `attestationSecretCiphertext` fall back to `fingerprintHash` as the HMAC key.

The device-list endpoint currently returns `fingerprintHash`, and supervisors can list devices tenant-wide.

The encryption key is also derived from `SESSION_SECRET`, coupling session-secret rotation to device-secret decryption.

## 6.1 Introduce a dedicated encryption key

Add the environment variable:

```text
DEVICE_ATTESTATION_KEK
```

Requirements:

- Required in staging and production.
- At least 32 bytes of high-entropy material.
- Separate from `SESSION_SECRET`.
- Never returned by an API or included in logs.
- Documented in deployment and credential-rotation runbooks.

Modify:

- `src/config/env.validation.ts`
- `src/common/auth/device-attestation-secret.ts`
- `src/modules/branches/branches.service.ts`
- `src/modules/auth/auth.service.ts`

Do not use `process.env` directly inside `BranchesService`; inject `ConfigService`.

## 6.2 Add secret metadata

Add a forward migration and Prisma fields to `Device`:

```prisma
attestationSecretCiphertext String?
attestationSecretVersion    Int       @default(0)
attestationSecretRotatedAt  DateTime?
```

Add a database constraint after backfill:

```sql
CHECK (
  status <> 'ACTIVE'
  OR (
    "attestationSecretCiphertext" IS NOT NULL
    AND "attestationSecretVersion" > 0
  )
)
```

This may be implemented through expand-and-contract migrations if the shared environment requires a separate backfill deployment.

## 6.3 Implement a one-time backfill command

Create:

```text
scripts/backfill-device-attestation-secrets.ts
```

The command should:

1. Require `DEVICE_ATTESTATION_KEK`.
2. Select devices with no dedicated secret.
3. Lock and process devices in deterministic batches.
4. Generate a random 32-byte secret per device.
5. Encrypt it using the dedicated KEK.
6. Set secret version and rotation timestamp.
7. Revoke every active session for that device.
8. Write an audit event for each migrated device.
9. Produce a machine-readable summary containing counts, not secret values.
10. Be safe to rerun.

The command must not print plaintext secrets. Legacy devices will require reprovisioning or controlled secret distribution to the trusted client.

## 6.4 Remove the fingerprint fallback

Modify `resolveDeviceAttestationSecret()` so that:

- Missing ciphertext fails closed.
- `fingerprintHash` is never used as signing material.
- The stable failure code is `DEVICE_ATTESTATION_SECRET_UNAVAILABLE`.
- An active device without a secret cannot authenticate.

## 6.5 Stop returning fingerprint data

Remove `fingerprintHash` from:

- `listDevices`.
- Device creation responses, except when genuinely required by a tightly controlled enrolment operation.
- Audit metadata where it is unnecessary.
- OpenAPI response examples.

The fingerprint may remain stored for identification or duplicate detection, but should not be returned by normal management APIs.

## 6.6 Enforce branch-scoped supervisor administration

Implement a common authorization helper:

```text
resolveDeviceManagementScope(actor)
```

Rules:

- Admin: may list and manage devices across the tenant.
- Supervisor: must have `branchId`.
- Supervisor list: filter by the supervisor’s branch.
- Supervisor create: target branch must equal the supervisor’s branch.
- Supervisor update: device branch must equal the supervisor’s branch.
- Supervisor cannot move devices between branches.
- Cross-branch operations return 404 or a stable forbidden error without revealing device existence.

Modify:

- `src/modules/branches/branches.service.ts`
- `src/modules/branches/branches.controller.ts`
- DTOs if branch changes are presently possible.

## 6.7 Secret rotation semantics

When `rotateAttestationSecret` is requested:

1. Generate and store a new secret.
2. Increment `attestationSecretVersion`.
3. Set `attestationSecretRotatedAt`.
4. Revoke active device sessions in the same transaction.
5. Record a dedicated `device.attestation-secret.rotate` audit event.
6. Return the new plaintext secret only once to the authorized enrolment response.
7. Never return the ciphertext.

## 6.8 Tests

Add or expand tests for:

- Legacy active device without ciphertext is rejected.
- Backfilled device authenticates using the new secret.
- Fingerprint-signed attestation is rejected after cutover.
- Session-secret rotation does not break device-secret decryption.
- Device-KEK misconfiguration fails startup.
- Rotation revokes active sessions.
- Old secret fails after rotation.
- New secret succeeds.
- Supervisor cannot list another branch’s devices.
- Supervisor cannot create or update another branch’s device.
- Admin retains tenant-wide access.
- `fingerprintHash` is absent from API responses.
- Backfill command is idempotent.
- Backfill logs and reports contain no plaintext secrets.

## Acceptance criteria

- Every active shared-environment device has a versioned dedicated secret.
- No production authentication path uses `fingerprintHash` as an HMAC key.
- No standard API exposes fingerprint material.
- Supervisors are restricted to their own branch.
- Secret rotation revokes old sessions and old signatures.

---

# 7. Workstream 4 — Replace the ineffective validation-scope gate

## Problem

The current script derives `criticalFiles` from the same validation groups later used to test coverage. Consequently, every selected file is covered by definition.

The `validatedBy` values are labels; the script does not verify that the commands exist or run in CI.

## 7.1 Separate critical scope from coverage rules

Refactor into:

```text
scripts/validation-scope/
├── index.cjs
├── release-critical-files.cjs
├── coverage-rules.cjs
└── validation-scope.spec.cjs
```

Define an independent release-critical universe, including:

- `src/**/*.ts`
- `test/**/*.ts`
- `prisma/schema.prisma`
- `prisma/migrations/**/*.sql`
- `.github/workflows/**/*.yml`
- `scripts/**/*`
- `docs/api/**/*`
- `docs/database/**/*`
- `docs/runbooks/**/*`
- `docs/release-evidence/**/*`
- `openspec/changes/**/*`
- `package.json`
- TypeScript, Jest, ESLint and Prisma configuration files.

Define coverage rules separately:

```js
{
  pattern: /^src\/.*\.ts$/,
  validators: ['lint', 'typecheck', 'test', 'build']
}
```

## 7.2 Validate actual command existence

The script must:

1. Load `package.json`.
2. Confirm every referenced package script exists.
3. Load CI workflow YAML.
4. Confirm every mandatory release command appears in at least one non-optional job.
5. Detect `continue-on-error`.
6. Fail when a mandatory command is missing.
7. Produce a report mapping files to validators.

Use a YAML parser rather than unreliable substring matching.

## 7.3 Add negative regression tests

Tests must demonstrate failure when:

- A new critical directory has no coverage rule.
- A coverage rule references a nonexistent package script.
- A mandatory command is removed from CI.
- A required CI step has `continue-on-error: true`.
- A new OpenSpec change falls outside formatting coverage.
- A SQL runbook has no execution or parser validation.

## 7.4 Output format

On success:

```text
All release-critical files are covered.
124 source files -> lint, typecheck, test, build
31 integration files -> lint:test, test:integration
...
```

On failure:

```text
Release-critical files outside validation:
- openspec/changes/new-change/tasks.md
Required validators:
- format:check
- openspec:validate
```

## Acceptance criteria

- Deliberately adding an uncovered critical file makes `npm run validate:scope` fail.
- Deleting a required CI command makes it fail.
- The script reports real coverage rather than a self-referential set.
- The negative tests run in CI.

---

# 8. Workstream 5 — Expand CI, formatting and coverage enforcement

## 8.1 Enforce critical coverage thresholds

The Jest configuration defines coverage thresholds, but ordinary `npm test` does not enforce them.

Add:

```json
"test:coverage:critical": "jest --coverage --runInBand"
```

Run it in CI.

Do not remove the ordinary unit-test command; coverage should be a separate explicit gate or replace the duplicate execution where runtime cost is acceptable.

Critical modules should include at least:

- Earn orchestration.
- Redemption orchestration.
- Approval execution and expiry.
- Lot allocation.
- Session guard and refresh.
- Outbox worker runtime.
- SMS payload validation.
- Device management.

Coverage thresholds should focus on branch coverage for financial and security decisions rather than relying only on global line coverage.

## 8.2 Expand formatting scope

Replace narrow Review-specific globs with broad maintained paths:

```text
src/**/*.{ts,js,mjs,cjs}
test/**/*.{ts,js,mjs,cjs}
scripts/**/*.{ts,js,mjs,cjs}
docs/**/*.{md,json,yml,yaml}
openspec/**/*.{md,yml,yaml}
.github/workflows/**/*.{yml,yaml}
*.{md,json,yml,yaml}
```

Do not run Prettier against SQL unless a compatible SQL plugin is deliberately installed. Validate SQL through parsing and execution tests.

## 8.3 Add OpenSpec validation

Add a script such as:

```json
"openspec:validate": "openspec validate --changes"
```

Run it in CI and include it in `validate:scope`.

## 8.4 Ensure all test files are linted

Retain robust globs:

```text
test/**/*.e2e-spec.ts
test/**/*.int-spec.ts
test/support/**/*.ts
src/**/*.spec.ts
```

Verify that newly introduced test suffixes cannot bypass linting.

## 8.5 CI workflow requirements

The standard CI workflow should require:

- Install.
- Prisma generation.
- Format check.
- Source and test lint.
- Type-check.
- Build.
- Production entrypoint verification.
- Prisma validation.
- Architecture check.
- Unit tests.
- Critical coverage.
- OpenAPI export/lint/diff.
- Generated-client generation and type-check.
- OpenSpec validation.
- Validation-scope check.
- E2E.
- Integration.
- SQL runbook execution tests.
- Generated-artifact clean-diff checks.

## Acceptance criteria

- Coverage thresholds fail CI when a critical branch becomes untested.
- Every current OpenSpec change is formatted and validated.
- New test files are automatically linted.
- Generated API and client drift fails CI.
- No mandatory gate uses `continue-on-error`.

---

# 9. Workstream 6 — Add a protected shared-backup release workflow

## Problem

The real shared-backup test correctly requires dump paths, but the standard integration workflow does not provide them. The test therefore skips in normal CI.

## 9.1 Create a release-evidence workflow

Add:

```text
.github/workflows/halfway-release-evidence.yml
```

Trigger:

```yaml
on:
  workflow_dispatch:
    inputs:
      release_sha:
        required: true
      backup_reference:
        required: true
```

Use a protected GitHub environment:

```yaml
environment: halfway-production-release
```

Require approval before credentials or protected backup artifacts are made available.

## 9.2 Check out the exact release SHA

The workflow must:

```bash
git rev-parse HEAD
test "$(git rev-parse HEAD)" = "${RELEASE_SHA}"
```

It must not use a floating branch as its evidence identity.

## 9.3 Retrieve approved backup artifacts

Retrieve the schema and data dumps from approved private storage or a protected prior workflow artifact.

Before running tests:

```bash
test -s "$SHOPCITY_SHARED_SCHEMA_DUMP_PATH"
test -s "$SHOPCITY_SHARED_DATA_DUMP_PATH"
sha256sum "$SHOPCITY_SHARED_SCHEMA_DUMP_PATH"
sha256sum "$SHOPCITY_SHARED_DATA_DUMP_PATH"
```

Missing dumps must fail the job; the protected workflow must never skip.

## 9.4 Run protected restore verification

Execute:

```bash
npx jest test/financial-repair-restore.int-spec.ts \
  --config ./test/jest-int.json \
  --runInBand \
  -t "protected shared-backup"
```

The test must verify:

- Original `_prisma_migrations` before modifications.
- No rolled-back or incomplete migrations.
- No duplicate migration names.
- Repository and database checksums agree.
- Pending migrations deploy normally.
- No repository migration remains absent.
- No extra unknown database migration exists.
- Required financial rows and relationships remain intact.
- Required functions, triggers, indexes and constraints exist.
- Adjustment, EARN, REDEEM, lot, allocation and restoration evidence remains coherent.

## 9.5 Upload evidence

Upload:

- Backup checksums.
- Migration reconciliation JSON.
- Object-probe JSON.
- Historical financial-row probe report.
- Prisma migration status output.
- Test logs.
- Exact release SHA.
- Workflow run metadata.

## 9.6 Separate ordinary CI from release evidence

Normal PR CI may continue running:

- Fresh migration deployment.
- Synthetic upgrade-path tests.
- Integration suites.

Only the protected release workflow should claim actual shared-backup proof.

## Acceptance criteria

- The protected test cannot skip.
- The workflow fails without real backup artifacts.
- Evidence identifies one exact commit.
- Reconciliation reports are downloadable from the workflow.
- The release README references the workflow run and artifact IDs.

---

# 10. Workstream 7 — Complete SMS closeout

## 10.1 Preserve zero remaining balances

The current payload builder omits `remainingBalanceKobo` when its value is `0n` because it uses a truthiness check.

Replace:

```ts
input.remainingBalanceKobo;
```

with:

```ts
input.remainingBalanceKobo !== undefined;
```

Tests must cover:

- Undefined balance is omitted.
- `0n` is serialized as `"0"`.
- Positive balance is serialized correctly.

## 10.2 Make Adjustment messages directional

Add an explicit Adjustment direction or kind to the payload:

```ts
kind: 'CREDIT' | 'DEBIT';
```

Render:

- `Your balance was increased by ...`
- `Your balance was reduced by ...`

Avoid ambiguous wording such as “adjusted by”.

This change may be prepared even while executable manual Adjustments remain deferred, because persisted historical Adjustment SMS payloads still require truthful rendering.

## 10.3 Controlled real-provider smoke test

Create:

```text
scripts/smoke-real-sms.ts
```

The smoke test should:

1. Require explicit production or staging approval.
2. Use a designated test phone number.
3. Generate a unique correlation and idempotency identifier.
4. Send one controlled message.
5. Record provider message ID.
6. Verify the application stores the correct status.
7. Exercise one retryable provider failure using sandbox/provider test functionality where available.
8. Exercise one terminal rejection where safe.
9. Avoid printing API credentials.
10. Produce a redacted JSON evidence report.

## 10.4 Credential-rotation runbook

Update `docs/runbooks/sms-failure.md` with:

- Provider credential rotation.
- Sender-ID rotation.
- Expected deployment order.
- Worker restart requirements.
- How to avoid duplicate sends.
- Retryable versus terminal provider classifications.
- Outage handling.
- Verification after rotation.
- Rollback procedure.

## Acceptance criteria

- A zero remaining balance appears in the payload and rendered message.
- Invalid payloads remain terminal on the first processing attempt.
- Real-provider smoke evidence exists for the final SHA.
- Provider credentials and phone data are redacted from evidence.
- Credential rotation is operationally documented.

---

# 11. Workstream 8 — Strengthen quarantine operator integrity

The quarantine flow is now batch-scoped and count-checked, but its support tables should have stronger relational guarantees.

## 11.1 Add relational constraints

Change support-table definitions so that:

### Approval

```sql
PRIMARY KEY ("batchId", "id")
FOREIGN KEY ("batchId")
  REFERENCES "ReceiptLegacyIdentityQuarantineBatch"("id")
```

Add:

```text
approvedBy
approvalReason
approvedAt
```

per approved receipt or ensure the batch approval immutably applies to the exact stored receipt set.

### Stage

Retain:

```sql
PRIMARY KEY ("batchId", "id")
```

Add batch foreign key.

### Quarantine

Add batch foreign key and preserve a uniqueness rule preventing the same source Receipt from being destructively quarantined twice.

## 11.2 Record explicit operator identity

Do not rely solely on `CURRENT_USER`, because the database account may be shared.

Require substitution or session variables for:

- Approved by.
- Executed by.
- Incident reference.
- Approval reason.

Reject placeholder values such as `__BATCH_ID__` before execution.

## 11.3 Prevent concurrent active batches for one Receipt

Before staging or execution, reject a Receipt that is already part of another non-terminal batch.

## 11.4 Expand tests

Tests must cover:

- Same Receipt approved in two active batches.
- Missing batch foreign key.
- Approval row without actor or reason.
- Re-execution of an executed batch.
- Batch transitions by affected-row count.
- Source Receipt changed after staging.
- Existing quarantine snapshot.
- Shared database user versus explicit operator identity.
- Complete rollback after any count mismatch.

## Acceptance criteria

- Every stage, approval and quarantine row belongs to a valid batch.
- Every destructive action has an explicit human or service identity.
- A Receipt cannot participate in two concurrent destructive batches.
- Re-execution remains non-destructive.

---

# 12. Workstream 9 — Enforce the receiptless capability boundary

## 12.1 Verify application routes

Search the active application for:

- Adjustment controllers or public service methods.
- Reversal UI actions.
- Receiptless transaction response types.
- Manual Adjustment forms.
- Generated-client methods suggesting execution availability.

For halfway:

- Keep such routes absent, hidden or explicitly unavailable.
- Do not create placeholder durable financial rows.
- Do not synthesize Receipts for receiptless events.

## 12.2 Keep read-model rejection intentional

The current transaction detail returns `UNSUPPORTED_TRANSACTION_TYPE` for receiptless entries, and the customer ledger includes receipt-linked rows only.

Document this as a formal halfway contract, not an accidental omission.

## 12.3 Add tests for the boundary

Tests must verify:

- Receiptless ledger entries are not exposed to branch users.
- Receiptless entries cannot leak across branches.
- Admin behavior matches the documented deferral.
- Reversal and Adjustment routes cannot create receiptless ledger entries.
- OpenAPI does not promise receiptless payloads.
- Generated client does not expose unsupported successful workflows.

## Acceptance criteria

- Deferred capabilities are unavailable in runtime, API, generated client and UI.
- No cross-branch receiptless read leak is possible.
- The second-half design can later introduce immutable branch provenance without undoing halfway assumptions.

---

# 13. Workstream 10 — Exact-head validation and evidence package

## 13.1 Select one immutable release candidate

After all implementation work:

1. Commit all changes.
2. Ensure the working tree is clean.
3. Record the exact SHA.
4. Do not modify release-critical code after evidence starts.
5. Any correction creates a new candidate SHA and requires rerunning all gates.

## 13.2 Required exact-head gates

Run against the final SHA:

```bash
npm ci --ignore-scripts
npm run prisma:generate
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run verify:prod-entrypoints
npm run prisma:validate
npm run architecture:check
npm test -- --runInBand
npm run test:coverage:critical
npm run openapi:lint
npm run openapi:diff
npm run client:generate
npm run client:typecheck
npm run openspec:validate
npm run validate:scope
npm run test:e2e
npm run test:integration
npm run verify:release-artifacts
git diff --exit-code
```

Also run the protected shared-backup workflow and real SMS smoke test against that SHA.

## 13.3 Update the release-evidence package

The current evidence document references an older release candidate and still lists exact-head CI, real SMS and deployment evidence as pending.

Update:

```text
docs/release-evidence/sprint-3-halfway/
├── README.md
├── validation-summary.json
├── migration-reconciliation.json
├── object-probes.json
├── financial-row-probes.json
├── backup-checksums.txt
├── sms-smoke-redacted.json
├── quarantine-dry-run.json
├── deployment-checklist.md
└── rollback-checklist.md
```

The README must include:

- Final SHA.
- Reviewer and review date.
- Workflow URL and run ID.
- Every job result.
- Shared-backup source reference and timestamp.
- Backup checksums.
- Migration reconciliation.
- Database-object inventory.
- Financial-row probes.
- Quarantine dry-run evidence.
- Device-secret backfill counts.
- Device security test results.
- SMS smoke evidence.
- Deployment checklist.
- Rollback and restore instructions.
- Known deferred capabilities.

## 13.4 Reconcile Issue #1

Issue #1 is currently reopened, which is correct while evidence is incomplete.

Before closure:

1. Add a final comment containing the exact SHA.
2. Attach the exact workflow run.
3. Attach the release-artifact name and identifiers.
4. Confirm the protected restore passed.
5. Confirm the real SMS smoke passed.
6. Link the deployment and rollback checklists.
7. State that Reversal and manual Adjustment remain deferred.
8. Close only after all evidence refers to the same SHA.

---

# 14. Proposed task checklist

## 14.1 Scope and contracts

- [ ] Create `sprint-3-halfway-completion` OpenSpec change.
- [ ] Record the explicit halfway capability matrix.
- [ ] Mark Reversal, Adjustment and receiptless reads deferred.
- [ ] Replace reversal 202 response with truthful 503 error.
- [ ] Remove reversal no-op idempotency persistence.
- [ ] Add runtime and OpenAPI contract tests.
- [ ] Regenerate OpenAPI and client.

## 14.2 Device security

- [ ] Add `DEVICE_ATTESTATION_KEK`.
- [ ] Add secret version and rotation metadata.
- [ ] Implement the legacy-device backfill command.
- [ ] Revoke sessions during secret backfill and rotation.
- [ ] Remove fingerprint fallback.
- [ ] Remove fingerprint from API responses.
- [ ] Restrict supervisor device operations to their branch.
- [ ] Add security and authorization tests.
- [ ] Record shared-environment backfill evidence.

## 14.3 Validation and CI

- [ ] Replace the tautological validation-scope implementation.
- [ ] Validate package scripts and CI command presence.
- [ ] Add negative validation-scope tests.
- [ ] Add OpenSpec validation to CI.
- [ ] Expand formatting scope.
- [ ] Run critical coverage in CI.
- [ ] Ensure mandatory jobs cannot continue on error.
- [ ] Add SQL operational-script validation.

## 14.4 Release restore proof

- [ ] Add protected release-evidence workflow.
- [ ] Require an exact release SHA.
- [ ] Require real schema and data dumps.
- [ ] Fail rather than skip when dumps are absent.
- [ ] Run protected shared-backup restore verification.
- [ ] Upload reconciliation and object-probe reports.
- [ ] Record backup checksums and source timestamps.

## 14.5 SMS and quarantine

- [ ] Preserve zero remaining balances.
- [ ] Add Adjustment direction to SMS payloads.
- [ ] Add zero-balance and direction tests.
- [ ] Add controlled real-provider smoke script.
- [ ] Update SMS outage and credential-rotation runbook.
- [ ] Add quarantine batch foreign keys.
- [ ] Add explicit approver and executor identity.
- [ ] Prevent the same Receipt entering concurrent active batches.
- [ ] Expand quarantine execution tests.

## 14.6 Final release

- [ ] Verify deferred capability boundary.
- [ ] Run all exact-head gates.
- [ ] Run protected shared restore.
- [ ] Run real SMS smoke.
- [ ] Assemble release-evidence package.
- [ ] Update migration tracker.
- [ ] Update Issue #1 with exact evidence.
- [ ] Perform deployment checklist review.
- [ ] Perform rollback/restore rehearsal.
- [ ] Change halfway gate from NO-GO to GO only after every item passes.

---

# 15. Final go/no-go criteria

## GO for halfway implementation completion

The halfway implementation can be marked complete when:

- All implementation and contract tasks pass.
- Legacy device secrets are fully migrated.
- Branch authorization is enforced.
- The reversal endpoint is truthful.
- Validation scope can fail negatively.
- Coverage is enforced.
- Deferred capabilities are consistently unavailable.
- Standard CI is green on the final SHA.

## GO for halfway production deployment

Production deployment additionally requires:

- Protected shared-backup restore evidence.
- Real SMS smoke evidence.
- Backup and rollback confirmation.
- Deployment checklist approval.
- Exact-head artifact package.
- Issue #1 reconciliation.

Until those operational requirements are attached to one immutable SHA, the correct production decision remains **NO-GO**.
