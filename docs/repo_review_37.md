# Full Sprint 3 halfway-completion review

**Repository:** `micahjatau/shopcity_LP`
**Reviewed head:** `cd32a43dddeab37cc9ec65c8f912417d60067384` — `docs: add commit and push workflow note`.

## Final verdict

| Assessment                          |    Result |
| ----------------------------------- | --------: |
| Functional halfway implementation   |  **~87%** |
| Security and integrity readiness    |  **~82%** |
| Release-evidence readiness          |  **~55%** |
| Quality-adjusted halfway completion |  **~74%** |
| Continue implementation             |    **GO** |
| Mark the halfway sprint complete    | **NO-GO** |
| Deploy this halfway release         | **NO-GO** |

I found **no new P0 financial-integrity defect**. However, there are **ten P1 blockers** preventing the repository from satisfying its own declared halfway-release specification.

The implementation is much stronger than it was previously. The remaining problems are concentrated in contract truthfulness, device cutover, destructive quarantine operations, enforceable validation, operational proof, and release evidence.

---

# Scope reviewed

The review reconciled the current runtime, tests, schema, OpenAPI, generated client, CI, operational SQL and evidence against all eight capabilities declared by the halfway proposal:

1. Reversal capability boundary.
2. Receiptless capability boundary.
3. Device-attestation cutover.
4. Branch-scoped device administration.
5. Repository validation enforcement.
6. Protected release evidence.
7. SMS delivery closeout.
8. Quarantine operator integrity.

The declared design requires one immutable release SHA, truthful deferral of incomplete workflows, real restore and SMS evidence, a safe device-secret migration, enforceable CI checks and relationally safe quarantine operations.

---

# P1 blockers

## 1. Reversal still has a fictional successful response

### Current behaviour

The runtime is correctly unavailable:

- The controller assigns HTTP 503.
- The service always throws `REVERSAL_UNAVAILABLE`.
- It creates no reversal, idempotency record, outbox event or financial effect.

But the controller also declares `@ApiNoContentResponse`, which generates a `204` success response in OpenAPI and the client. A later test explicitly requires this nonexistent success path.

This directly violates the halfway specification, which requires a stable unavailable response and **no successful accepted-work envelope**.

### Why it blocks completion

A frontend generated from the contract can legitimately interpret `204` as a completed operation, even though the server can never produce it. The public contract therefore remains misleading.

### Required correction

- Remove `@ApiNoContentResponse`.
- Remove the generated `204` client type.
- Configure a targeted Spectral exception for this intentionally unavailable endpoint rather than fabricating a 2xx response.
- Add an HTTP integration test asserting:

  - status `503`
  - `success: false`
  - `error.code: REVERSAL_UNAVAILABLE`
  - no durable reversal or idempotency side effects.

- Assert that `201`, `202` and `204` are absent from the operation.
- Regenerate and commit OpenAPI and client artifacts.

The existing tests only verify service exceptions and controller delegation; they do not validate the actual HTTP response envelope.

---

## 2. The protected restore workflow cannot retrieve a backup

The workflow accepts a `backup_reference`, but its “download” step performs no download. It merely checks whether two runner environment paths already point to files. It also lacks Node setup, dependency installation and Prisma generation.

The recorded protected run failed at this exact step, so the restore and artifact-upload steps were skipped.

### Additional artifact-path defect

The restore test writes evidence to:

```text
/tmp/opencode/repo-review-34-migration-reconciliation.json
/tmp/opencode/repo-review-34-object-probes.json
```

But the workflow uploads:

```text
docs/release-evidence/sprint-3-halfway/**
test-results/**
```

The generated reconciliation files are therefore not included in the configured upload path.

### Required correction

The protected workflow must:

1. Download an approved backup from a real protected source.
2. Verify a supplied SHA-256 checksum or immutable artifact ID.
3. Write the schema and data dump paths to `$GITHUB_ENV`.
4. Set up Node and install locked dependencies.
5. Generate the Prisma client.
6. Create the evidence output directory.
7. Run the protected restore against the caller-supplied exact SHA.
8. Write all reports to a repository-standard location such as:

```text
test-results/halfway-release/<release-sha>/
```

9. Upload evidence using `if: always()`.
10. Include:

- backup reference and checksum
- checked-out SHA
- migration inventory comparison
- `prisma migrate status`
- database object probes
- financial-row probes
- logs and final outcome.

The `backup_reference` must identify the actual downloaded object, not merely act as a descriptive string.

---

## 3. No immutable current-head release candidate has complete evidence

The current evidence package declares `3563492...` as the final release SHA, while the repository has advanced to `cd32a43...`. It also records that the protected restore failed and lists nearly every operational proof as pending.

The deployment checklist remains completely unchecked and references the old SHA.

The rollback checklist is also completely unchecked.

Issue #1 correctly remains reopened, confirming that the evidence gate is not closed.

The current-head GitHub checks could not be independently verified through the connector: no associated workflow runs or status entries were returned for `cd32a43...`.

### Required correction

After all code corrections:

1. Select one final immutable SHA.
2. Run normal CI on that SHA.
3. Run the protected restore on that SHA.
4. Run the real SMS smoke test on that SHA.
5. Run the device-cutover rehearsal on that SHA.
6. Run the quarantine dry run on that SHA.
7. Complete deployment and rollback rehearsals.
8. Generate the final evidence package from the workflow itself.
9. Update Issue #1 with the same SHA and downloadable artifacts.
10. Do not add documentation-only commits after declaring the final SHA.

---

## 4. Device KEK separation is specified but not enforced

The specification requires `DEVICE_ATTESTATION_KEK` to be distinct from session-secret material.

Current environment validation only requires a nonempty string. It does not enforce:

- minimum length or entropy
- inequality with `SESSION_SECRET`
- inequality with `CSRF_SECRET`
- a supported encoding or key version.

The encryption code hashes arbitrary key material into an AES key, meaning even a very weak one-character secret is technically accepted.

The environment tests do not cover the device KEK at all.

### Required correction

- Require at least 32 bytes of unpredictable material.
- Prefer base64-encoded 32-byte keys.
- Reject a KEK equal to:

  - `SESSION_SECRET`
  - `CSRF_SECRET`
  - SMS credentials.

- Add a `DEVICE_ATTESTATION_KEK_VERSION`.
- Add tests for missing, weak, malformed and reused keys.
- Add a documented KEK rotation process capable of decrypting the prior version during controlled rotation.

---

## 5. Legacy device backfill can lock every migrated device out

The backfill script generates a new random device secret, stores only its encrypted value, revokes active sessions and outputs device IDs and counts. It does not provide the plaintext secret to the corresponding physical device or require proof that the device received it.

Authentication now correctly fails closed when dedicated ciphertext is missing, which means incomplete provisioning results in a real lockout rather than a fallback.

### Required correction

Implement an explicit provisioning lifecycle:

```text
LEGACY
→ REPROVISION_REQUIRED
→ SECRET_ISSUED
→ DEVICE_ACKNOWLEDGED
→ ACTIVE
```

The operation should:

1. Discover affected devices with a dry run.
2. Mark each device `REPROVISION_REQUIRED`.
3. Generate a one-time secret.
4. Deliver it through an administrator-controlled provisioning channel.
5. Require the device to sign a challenge.
6. Persist acknowledgement time and secret version.
7. Activate the device only after successful acknowledgement.
8. Revoke prior sessions.
9. Produce machine-readable counts and per-device outcomes.

The backfill should also be resumable and use conditional updates or row locks so concurrent runs cannot rotate a device twice.

---

## 6. Active-device secret completeness is not database-enforced

The Prisma model permits:

```text
status = ACTIVE
attestationSecretCiphertext = null
attestationSecretVersion = 0
attestationSecretRotatedAt = null
```

because the secret fields remain nullable/defaulted and there is no database constraint tying them to active status.

The device update path also permits reactivating a device without checking that its secret metadata is complete.

One test explicitly verifies that reactivation does not restore sessions, but it does not verify that the device has a valid secret before becoming active. The service tests also use an admin actor and do not prove the required supervisor branch boundaries.

### Required correction

Add a database constraint equivalent to:

```sql
CHECK (
  status <> 'ACTIVE'
  OR (
    "attestationSecretCiphertext" IS NOT NULL
    AND "attestationSecretVersion" > 0
    AND "attestationSecretRotatedAt" IS NOT NULL
  )
)
```

Also:

- Reject activation without valid secret metadata.
- Allow activation and secret rotation atomically in one transaction.
- Add integration tests for:

  - activation without a secret
  - failed secret decryption
  - supervisor list scope
  - supervisor cross-branch create
  - supervisor cross-branch update
  - admin tenant-wide access
  - non-enumerating cross-branch failure.

---

## 7. The claimed real-provider SMS smoke path is missing

The halfway checklist marks the controlled real-provider smoke script complete.

However:

- `package.json` contains no SMS smoke command.
- No executable smoke implementation was found in the inspected current head.
- The release evidence still lists SMS smoke evidence as pending.

The production provider and fake-provider production guard are present, which is good.

### Required correction

Add a command such as:

```text
npm run sms:smoke:production
```

It must require:

- `SMS_SMOKE_APPROVED=true`
- an allowlisted test destination
- `SMS_PROVIDER_MODE=real`
- one message maximum
- a unique correlation ID
- retry disabled for the smoke execution
- no full phone number or credentials in logs.

It should produce redacted JSON evidence containing:

```json
{
  "releaseSha": "...",
  "provider": "ebulksms",
  "destinationSuffix": "1234",
  "correlationId": "...",
  "providerMessageId": "...",
  "submittedAt": "...",
  "outcome": "SENT"
}
```

A successful run must be captured against the same final SHA as the restore evidence.

---

## 8. Quarantine does not prevent concurrent active-batch ownership

The specification requires a receipt to participate in no more than one nonterminal destructive batch.

The current stage SQL adds batch foreign keys and composite primary keys, but it does not prevent the same receipt ID from appearing in two different `APPROVED` or `STAGED` batches.

The execution script locks only stage rows belonging to the current batch. It does not establish exclusive ownership across active batches.

### Required correction

Introduce a durable ownership mechanism, preferably a dedicated claim table:

```text
ReceiptQuarantineClaim
- receiptId unique
- batchId
- claimedAt
- releasedAt nullable
```

Alternatively, add a suitable partial unique index over a persistent active-ownership table.

Staging must atomically claim each receipt and fail when another nonterminal batch already owns it. Claims should only be released when a batch is cancelled or otherwise reaches a defined terminal state.

Add a concurrency integration test with two batches racing to stage the same receipt.

---

## 9. Quarantine operator validation and upgrade handling are incomplete

The execution script substitutes literal placeholders:

```text
__EXECUTED_BY__
__INCIDENT_REFERENCE_ID__
__APPROVAL_REASON__
```

It verifies that metadata matches but does not reject an empty or unreplaced placeholder as an operator identity.

The scripts also rely on `CREATE TABLE IF NOT EXISTS`. That does not upgrade older installations whose existing support tables had different primary keys or lacked foreign keys.

The integration test is a single happy path. It does not cover:

- placeholder operator identity
- missing or blank reason
- cross-batch receipt ownership
- re-execution
- old-table upgrade
- count mismatch rollback
- failed dependency reconciliation.

### Required correction

- Move support-table evolution into a committed migration using explicit `ALTER TABLE`.
- Add `NOT NULL` and nonblank checks.
- Reject values matching placeholder patterns such as `__%__`.
- Record tenant and branch scope on the batch.
- Require distinct creator, approver and executor where policy demands separation of duties.
- Add negative, rollback and concurrency tests.
- Produce a quarantine dry-run report before execution.
- Attach the report to the final evidence package.

---

## 10. The validation-scope gate is not fully enforceable

The new implementation is materially better because the release-critical universe and validation mapping are now separate.

But four defects remain.

### A. Step-level `continue-on-error` is ignored

The parser records only job-level `continue-on-error`. A required individual step can be optionalized without the gate noticing. This violates the declared specification.

### B. Commands can appear only in an optional/manual workflow

The validator searches all workflows rather than requiring commands inside named mandatory jobs in the main CI workflow.

### C. Substring matching can be bypassed

A line such as the following may satisfy the current string check:

```bash
echo "npm run typecheck"
npm run typecheck || true
```

### D. The negative regression test does not test the negative case

The test named `flags uncovered release-critical files` actually asserts that zero files are uncovered.

More importantly, this `.cjs` Node test is not invoked by any package command or CI step. The Jest configuration is scoped to TypeScript tests under `src`, so normal `npm test` does not execute it.

### Required correction

Add:

```json
"test:validation-scope": "node --test scripts/validation-scope/validation-scope.spec.cjs"
```

Then:

- run it in CI before `validate:scope`
- parse individual workflow steps
- detect job- and step-level `continue-on-error`
- require commands in specific mandatory jobs
- reject common bypass patterns
- add negative tests for:

  - uncovered critical file
  - missing package script
  - missing CI command
  - command only in manual workflow
  - optionalized step
  - optionalized job.

---

# Additional contract and release-gate deficiencies

## Receiptless unsupported response is not explicitly documented

Runtime correctly rejects a receiptless transaction detail with `UNSUPPORTED_TRANSACTION_TYPE`, and customer-ledger reads filter out receiptless entries.

The controller correctly labels the successful read models as receipt-backed.

However, it does not document the endpoint-specific stable `422 UNSUPPORTED_TRANSACTION_TYPE` response. The generic helper documents a generic `POLICY_VIOLATION` example instead.

### Correction

Add endpoint-specific OpenAPI examples and HTTP contract tests for the unsupported receiptless case.

---

## Release-artifact validation checks the wrong package

`format:release` checks a narrow collection of older files and omits the actual halfway:

- README
- validation JSON
- deployment checklist
- rollback checklist
- halfway task file
- protected workflow.

Normal CI also uploads `docs/release-evidence/repo-review-34/**` rather than the current `sprint-3-halfway` package.

### Correction

Create a release-evidence verifier that checks:

- JSON schema validity
- all evidence files use `$GITHUB_SHA`
- no required evidence remains pending
- workflow run IDs and artifact IDs are populated
- deployment and rollback checklists are complete
- deferred capabilities match OpenAPI
- all referenced report files exist.

Upload an artifact named with the exact SHA.

---

## OpenSpec is not version-pinned

The command uses:

```text
npx -y @fission-ai/openspec validate --changes
```

No exact version is declared in the command or repository development dependencies.

The commit titled “pin openspec cli package” pinned the package identity, not its version.

### Correction

Install an exact development dependency, commit the lockfile and execute the local binary.

---

# Incorrectly completed checklist entries

The following halfway-task items should be reopened:

| Task                                              | Correct status                                                |
| ------------------------------------------------- | ------------------------------------------------------------- |
| 1.2 OpenAPI/client do not expose deferred success | **Incomplete** — reversal exposes 204                         |
| 3.1 Dedicated KEK validation                      | **Partial** — separation and entropy not enforced             |
| 3.2 One-time device backfill                      | **Partial** — no safe physical-device provisioning            |
| 3.4 Branch-scoped administration tests            | **Partial** — service logic exists, required tests incomplete |
| 4.2 Negative validation regression tests          | **Incomplete** — insufficient and not executed                |
| 5.1 Protected workflow                            | **Partial** — workflow exists but cannot retrieve backups     |
| 5.2 Protected evidence upload                     | **Incomplete** — restore failed and output paths do not align |
| 5.3 Final immutable-SHA evidence                  | **Incomplete** — package references an older SHA              |
| 6.2 Real-provider SMS smoke                       | **Incomplete**                                                |
| 6.4 Quarantine integrity                          | **Partial** — concurrent batch ownership unresolved           |
| 6.5 Quarantine negative tests                     | **Incomplete**                                                |
| 7.2 Final evidence links                          | **Incomplete**                                                |

The current checklist marks these as completed even though its final exact-head validation item remains open.

---

# Halfway completion matrix

| Capability                          |              Runtime |      Tests |           Evidence |        Gate |
| ----------------------------------- | -------------------: | ---------: | -----------------: | ----------: |
| Redemption and FIFO allocation      |                 Pass |       Pass |            Partial |        Pass |
| Approval execution                  |                 Pass |       Pass |            Partial |        Pass |
| Reversal unavailable boundary       |                 Pass |    Partial |               Fail |    **Fail** |
| Manual adjustment deferral          |                 Pass |    Partial |            Partial |        Pass |
| Receiptless deferral                |                 Pass |    Partial |            Partial | **Partial** |
| Device replay protection            |                 Pass |       Pass |            Partial |        Pass |
| Device KEK separation               |              Partial |       Fail |               Fail |    **Fail** |
| Legacy-device cutover               |                 Fail |       Fail |               Fail |    **Fail** |
| Branch-scoped device administration |                 Pass |    Partial |            Missing | **Partial** |
| Validation-scope enforcement        |              Partial |       Fail |            Missing |    **Fail** |
| Critical coverage in CI             |                 Pass |       Pass | Unverified at head |     Partial |
| SMS payload correctness             |                 Pass |       Pass |            Partial |        Pass |
| Real SMS delivery proof             |              Unknown |    Missing |            Missing |    **Fail** |
| Quarantine count safety             |                 Pass | Happy path |            Missing |     Partial |
| Quarantine exclusive ownership      |                 Fail |    Missing |            Missing |    **Fail** |
| Protected shared-backup restore     | Not run successfully |    Present |             Failed |    **Fail** |
| Exact-head evidence package         |                    — |          — |              Stale |    **Fail** |
| Deployment rehearsal                |                    — |          — |            Missing |    **Fail** |
| Rollback rehearsal                  |                    — |          — |            Missing |    **Fail** |

---

# Required closure order

## Stage 1 — Restore truthful contracts

1. Remove reversal `204`.
2. Add HTTP 503 reversal test.
3. Add explicit receiptless `422 UNSUPPORTED_TRANSACTION_TYPE`.
4. Regenerate OpenAPI and client.
5. Verify generated artifacts are clean.

## Stage 2 — Fix enforceable validation

1. Add and run the validation-scope Node tests.
2. Detect step-level optionalization.
3. Bind required commands to mandatory CI jobs.
4. Pin OpenSpec.
5. Correct release-evidence validation and upload paths.

## Stage 3 — Complete safe device cutover

1. Harden KEK validation.
2. Add active-device database constraints.
3. Implement provisioning and acknowledgement.
4. Make the backfill dry-run capable and resumable.
5. Add branch-scope and activation tests.
6. Run a controlled cutover rehearsal and save counts.

## Stage 4 — Complete quarantine integrity

1. Add committed support-table migration.
2. Add exclusive receipt-claim ownership.
3. Validate all operator placeholders and nonblank values.
4. Add negative, rollback and concurrency tests.
5. Produce a quarantine dry-run report.

## Stage 5 — Add operational proof

1. Implement controlled real-provider SMS smoke.
2. Repair the protected backup workflow.
3. Run deployment rehearsal.
4. Run rollback rehearsal.

## Stage 6 — Freeze and validate one SHA

1. Select the immutable release SHA.
2. Run all normal CI jobs.
3. Run protected restore.
4. Run SMS smoke.
5. Run device-cutover rehearsal.
6. Run quarantine dry run.
7. Upload one SHA-bound evidence bundle.
8. Complete both checklists.
9. Update and close Issue #1.

---

# Definition of done

The halfway sprint is complete only when one immutable SHA has all of the following:

- Green static, unit, coverage, E2E, integration and GitNexus jobs.
- Clean OpenAPI and generated-client diff.
- No reversal 2xx contract.
- Explicit receiptless unsupported contract.
- Device KEK separation tests.
- Active-device secret database constraint.
- Device provisioning acknowledgement and backfill report.
- Branch-scope authorization tests.
- Validation-scope negative tests executed in CI.
- Quarantine migration and concurrency proof.
- Successful protected shared-backup restore artifact.
- Migration reconciliation and object inventory.
- Financial-row probes.
- Real-provider SMS smoke evidence.
- Quarantine dry-run evidence.
- Completed deployment checklist.
- Completed rollback checklist.
- Evidence package and Issue #1 referencing the exact same SHA.

Until those conditions are met, the repository should remain **open for halfway-completion work and unavailable for production release**.

No repository files, issues or workflow settings were changed during this review.
