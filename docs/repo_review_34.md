Halfway Production Gate — Complete Unlock Checklist

Current reviewed head: e002576de57ee551cc90ae2b972a3cd5d467dfc1
Current decision: No-go for production; development can continue.

The core earn and redemption workflows are reasonably mature. The remaining gate is primarily blocked by production evidence, device security, financial concurrency, operational safety, read-model consistency, messaging integrity and release governance.

---

1. Restore the actual shared database and verify it

Blocker

The current restore test no longer accepts the real shared Supabase dump. It always creates a synthetic pre-migration database, dumps it and restores it. That proves the migration works against a constructed fixture, but not against the database that has experienced db push, migrate resolve and historical migrations.

The migration tracker still describes shared-backup verification even though the current test no longer performs it.

Required work

[ ] Keep the synthetic test, but rename it to clearly identify it as a synthetic upgrade-path test.

[ ] Add a separate protected shared-database restore test.

[ ] Require the actual schema and data dump paths.

[ ] Do not silently fall back to a generated fixture when a shared backup is unavailable.

[ ] Restore the real backup into an isolated PostgreSQL instance.

[ ] Preserve the restored _prisma_migrations table.

[ ] Run prisma migrate status before changing anything.

[ ] Apply only genuinely pending migrations using prisma migrate deploy.

[ ] Verify historical financial rows survived:

Receipt.

Loyalty ledger entry.

Credit lot.

Redemption allocation.

Allocation restoration.

Adjustment.

Approval.

Outbox event.

SMS message.

[ ] Record the source project, backup timestamp, database identifier and release commit SHA.

Acceptance criteria

The shared restore must fail when:

A migration is missing.

A checksum differs.

A required function, trigger, constraint or index is missing.

Historical financial evidence violates the new invariants.

A migration is recorded as applied without its expected database objects.

---

2. Make migration checksum verification independent

Blocker

The current synthetic test excludes _prisma_migrations, restores the database and then runs prisma migrate resolve --applied for every migration. It subsequently compares the records it just created with the same repository files. That comparison is circular and cannot prove the shared migration history is authentic.

Required work

[ ] Preserve _prisma_migrations from the actual backup.

[ ] Read the existing rows before running any repair command.

[ ] Compare each database record with the corresponding repository migration:

Migration name.

SHA-256 checksum.

finished_at.

rolled_back_at.

Applied-step count.

[ ] Confirm there are no extra database migrations absent from the repository.

[ ] Confirm there are no committed migrations absent from the database after deployment.

[ ] Never use migrate resolve as part of the verification assertion.

[ ] Use migrate resolve only after documenting and approving a known historical repair.

[ ] Add behavioural probes so object effects—not only migration rows—are verified.

[ ] Produce a machine-readable migration reconciliation report.

Acceptance criteria

The restored shared database’s original migration rows must match the repository before any reconciliation or repair command is executed.

---

3. Revoke device-bound sessions when a device becomes ineligible

Blocker

Device status is checked at login, but session refresh and guarded request resolution validate only the session, user, tenant and user branch. They do not reload or validate the device attached to the session. A blocked device can therefore continue using and refreshing an existing session.

Required work

[ ] Include the linked device and its branch when loading sessions.

[ ] During every guarded request, verify:

Device still exists.

Device status is ACTIVE.

Device tenant matches the user tenant.

Device branch is active.

Device branch remains compatible with the user’s assigned branch.

[ ] Perform the same checks before refresh-token/session rotation.

[ ] Prevent session rotation when the linked device is no longer eligible.

[ ] Revoke all active sessions associated with a device when that device is blocked.

[ ] Handle the race where device blocking and session refresh occur concurrently.

[ ] Add an audit entry when sessions are revoked because of device status.

Required tests

[ ] Login, deactivate device, protected request returns 401.

[ ] Login, deactivate device, refresh returns 401.

[ ] Login, deactivate device branch, refresh fails.

[ ] Move device to another branch, existing session fails.

[ ] Block device concurrently with refresh; no replacement session is issued.

[ ] Reactivate device; old revoked session remains unusable.

---

4. Add device-attestation replay protection

Blocker

Device attestations include a timestamp and nonce, but accepted nonces are not persisted. The same signed attestation can be reused multiple times during its five-minute validity window.

Required work

[ ] Add a persistent DeviceAttestationNonce or equivalent table.

[ ] Store:

Tenant ID.

Device ID.

Nonce hash.

Attestation timestamp.

Accepted timestamp.

Expiry timestamp.

Issued session ID where appropriate.

[ ] Add a unique constraint over the device and nonce hash.

[ ] Consume the nonce in the same database transaction that creates the session.

[ ] Map unique conflicts to a stable replay error.

[ ] Add an expiry index and deterministic cleanup process.

[ ] Reject timestamps outside the permitted window.

[ ] Reject future-dated timestamps beyond a small clock-skew allowance.

[ ] Confirm that fingerprintHash is a high-entropy secret available only to the device and server.

[ ] Otherwise replace it as the HMAC key with a dedicated per-device secret.

[ ] Add device-secret rotation and revocation support.

Required tests

[ ] First use of an attestation succeeds.

[ ] Second use of the same attestation fails.

[ ] Concurrent use produces exactly one successful session.

[ ] Same nonce on a different device does not collide incorrectly.

[ ] Expired attestation fails.

[ ] Invalid signature fails.

[ ] Rotated device secret invalidates old attestations.

---

5. Fix approval decision locking and stale-state reuse

Blocker

The approval flow reads and validates the complete Approval aggregate, then locks the rows, but continues using the object fetched before the lock. Another transaction can alter relevant state between the initial read and lock acquisition.

Required work

[ ] Resolve only the scoped approval ID before locking.

[ ] Acquire locks over:

Approval.

Receipt.

Redemption where applicable.

Card/customer/device rows required for execution.

Relevant ledger or allocation rows.

[ ] Re-read the complete aggregate after acquiring the locks.

[ ] Re-run every eligibility check against the post-lock state.

[ ] Execute the decision using only post-lock values.

[ ] Keep conditional updateMany checks as a second line of defence.

[ ] Add concurrency tests where state changes between initial request and lock acquisition.

Acceptance criteria

No approval can execute using stale receipt, card, customer, device, policy or approval-state information.

---

6. Make approval expiry an atomic aggregate transition

Blocker

expireApproval() confirms that one Approval row was updated, but ignores the affected-row counts for its Receipt and Redemption updates. It can therefore commit an expired Approval and audit record without successfully transitioning the expected related records. Automatic expiration can also be attributed to the supervisor who happened to encounter it.

Required work

[ ] Determine the expected related records from targetType.

[ ] Add source-state predicates to Receipt and Redemption updates.

[ ] Require the expected update count for every related row.

[ ] Roll back the transaction when an expected related row is missing or in the wrong state.

[ ] Attribute deadline-driven expiration to SYSTEM or a null system actor.

[ ] Store the detecting user or worker identity separately in audit metadata.

[ ] Confirm whether Redemption expiry should change the underlying Receipt review state.

[ ] Make worker-triggered and request-triggered expiry follow the same rules.

Required tests

[ ] Missing Receipt causes full rollback.

[ ] Redemption already transitioned causes full rollback.

[ ] Concurrent decision and expiry produce one valid final outcome.

[ ] System expiry does not identify the supervisor as decision-maker.

[ ] Replaying expiry is safely idempotent or returns a stable conflict.

---

7. Add safe batch semantics to receipt quarantine

Blocker

The new report/stage/execute separation is a clear improvement, but the approval and stage tables have no batch or operation identifier. The execute script acts on all rows currently in the stage table, and completed or abandoned rows are not closed or cleared.

Required work

[ ] Add a durable quarantine batch record with:

Batch ID.

Incident/reference ID.

Created by.

Created at.

Approved by.

Approved at.

Executed by.

Executed at.

Status.

Notes.

[ ] Scope every approval, stage and execution query to one batch ID.

[ ] Prevent execution of abandoned, cancelled or already executed batches.

[ ] Lock staged Receipt rows before revalidation and deletion.

[ ] Revalidate that every staged row is still a duplicate at execution time.

[ ] Reject IDs not present in that batch’s report.

[ ] Mark the batch executed after completion.

[ ] Do not leave active staging rows available to later operations.

[ ] Make repeat execution idempotent and non-destructive.

---

8. Make receipt-quarantine approval and deletion fully auditable

Blocker

The approval table does not identify the approving operator or approval reason. The execution script inserts into quarantine with ON CONFLICT DO NOTHING and then deletes the Receipt. An existing quarantine row could prevent the current snapshot from being written while still allowing deletion.

Required work

[ ] Store approvedBy, approval reason and approval timestamp.

[ ] Store executedBy and execution timestamp.

[ ] Preserve the exact reviewed duplicate report with the batch.

[ ] Verify all Receipt dependencies, including:

Ledger entries.

Redemptions.

Approvals.

SMS records.

Any other Receipt foreign-key references.

[ ] Require a reconciliation plan for every row with financial dependencies.

[ ] Insert or update the quarantine snapshot before deletion.

[ ] Confirm the quarantine write count equals the staged-row count.

[ ] Confirm the deletion count equals the approved-row count.

[ ] Roll back if either count differs.

[ ] Preserve the full Receipt snapshot and necessary related-record references.

[ ] Add a restoration/recovery procedure for accidentally quarantined records.

[ ] Ensure non-approved duplicates remain untouched.

Required tests

[ ] Empty batch rejected.

[ ] Unapproved ID rejected.

[ ] Stale staged ID rejected.

[ ] Existing quarantine record cannot cause silent deletion.

[ ] Missing reconciliation plan rejects financially linked Receipt.

[ ] Partial insert or delete rolls back the entire batch.

[ ] Two concurrent executions cannot both succeed.

---

9. Resolve receiptless ledger branch ownership and visibility

Blocker

Branch-scoped customer-ledger queries currently depend on receipt.branchId, excluding receiptless Adjustment and Reversal entries. Transaction detail also returns 422 for ledger entries without a Receipt.

Required design decision

Choose one authoritative ownership model:

1. Add immutable branchId directly to every ledger entry.

2. Add branch ownership to Adjustment and Reversal evidence and derive it in reads.

3. Hard-disable receiptless financial entries for the halfway release.

The safest long-term option is usually an immutable branch ID on the ledger entry.

Required implementation

[ ] Add tenant-safe branch ownership to receiptless financial entries.

[ ] Backfill receipt-linked ledger rows from their Receipt branch.

[ ] Define an explicit source for historical receiptless entries.

[ ] Reject entries whose branch cannot be established.

[ ] Make branch ownership immutable.

[ ] Update customer-ledger scope to include authorised receiptless entries.

[ ] Update transaction detail to return a type-specific Adjustment or Reversal response rather than 422.

[ ] Do not expose another branch’s receiptless entries.

[ ] Update approval-list handling so valid receiptless targets are not silently dropped.

[ ] Update OpenAPI and generated clients.

Gate alternative

The gate can proceed without this read model only when Adjustment and Reversal creation are formally disabled in the halfway release and the public contract does not claim those capabilities.

---

10. Make every active SMS template strictly validated

Blocker

Only redemption-confirmed receives strict intent validation. Missing creditKobo in an earn confirmation silently produces generic “store credit” wording. Reversal and adjustment templates currently ignore most financial evidence.

The worker can treat malformed existing SMS payloads as retryable failures until the retry budget is exhausted rather than immediately terminal.

Required work

[ ] Define a discriminated payload schema for every active template:

earn-confirmed.

redemption-confirmed.

transaction-reversed.

balance-adjusted.

[ ] Require version and template consistency.

[ ] Validate:

Required IDs.

Phone number.

Amount strings.

Non-negative integer format.

Transaction/customer relationships where available.

Remaining balance.

Expiry date where included.

[ ] Use payload-builder functions everywhere outbox intents are created.

[ ] Reject direct unvalidated raw payload construction.

[ ] Make every SmsPayloadError terminal.

[ ] Dead-letter malformed payloads on the first processing attempt.

[ ] Do not call the SMS provider for invalid payloads.

[ ] Store a stable failure code and validation detail.

[ ] Ensure rendered amounts cannot throw an unclassified BigInt conversion error.

Required tests

[ ] Missing earn amount.

[ ] Invalid numeric amount.

[ ] Missing transaction ID.

[ ] Missing redemption balance.

[ ] Incomplete reversal payload.

[ ] Incomplete adjustment payload.

[ ] Provider is never invoked for malformed payload.

[ ] Malformed payload is not repeatedly retried.

---

11. Verify production SMS configuration and actual delivery

Blocker

The application has a real eBulkSMS provider and blocks fake providers in production unless explicitly overridden. However, the halfway gate still needs deployment evidence proving that production uses the real provider and does not use the bypass.

Required work

[ ] Set NODE_ENV=production.

[ ] Set SMS_PROVIDER_MODE=real.

[ ] Provision provider URL, username, API key and sender ID through secrets.

[ ] Ensure ALLOW_FAKE_SMS_IN_PRODUCTION is absent or false.

[ ] Add a deployment-policy check rejecting that override in the production environment.

[ ] Send a controlled production smoke-test SMS.

[ ] Confirm the provider request uses the outbox ID as an idempotency key.

[ ] Verify retryable versus terminal provider responses.

[ ] Document provider outage and credential-rotation procedures.

[ ] Confirm financial transactions remain committed when the provider is unavailable.

---

12. Align the Prisma Adjustment model with the database invariant

Blocker

The database now rejects null Adjustment ledger links, but Prisma still declares ledgerEntryId and the relationship as optional. Application types therefore permit states the database refuses.

Required work

[ ] Decide that Adjustment records are committed-only, or introduce a formal draft lifecycle.

[ ] For the committed-only model:

Make ledgerEntryId non-nullable in Prisma.

Make the relation non-optional.

Add a forward migration setting the column NOT NULL.

Run the historical preflight before altering the column.

[ ] Regenerate Prisma Client.

[ ] Update fixtures and services that pass null.

[ ] Retain database triggers as defence in depth.

[ ] Remove contradictory specification language about optional draft Adjustments.

---

13. Complete the missing Adjustment regression tests

Blocker

Review tasks claim coverage for linking Adjustments to EARN and REDEEM ledgers, but current visible tests primarily cover kind mismatch, amount mismatch, null linkage and immutability.

Required tests

[ ] Adjustment linked to EARN ledger is rejected.

[ ] Adjustment linked to REDEEM ledger is rejected.

[ ] Adjustment linked to REVERSAL ledger is rejected.

[ ] Adjustment linked to another customer’s ledger is rejected.

[ ] Adjustment linked across tenants is rejected.

[ ] Wrong direction is rejected.

[ ] Wrong amount is rejected.

[ ] Wrong effective date is rejected.

[ ] Missing ledger is rejected.

[ ] Historical preflight rejects every invalid variant.

[ ] A valid credit Adjustment with one lot succeeds.

[ ] A valid debit Adjustment with exact allocations succeeds.

---

14. Correct OpenAPI and generated-contract drift

Blocker

Review-33 still lists public error examples and generated-contract alignment as unfinished.

Required work

[ ] Align all documented errors with the runtime envelope.

[ ] Verify examples for:

400.

401.

402.

403.

404.

405.

406.

407.

[ ] Document the new device-revoked and attestation-replayed errors.

[ ] Document type-specific receiptless transaction responses or their explicit deferral.

[ ] Regenerate docs/api/openapi.json.

[ ] Run Spectral.

[ ] Run the breaking-change diff.

[ ] Regenerate the API client.

[ ] Type-check the generated client.

[ ] Require a clean generated-file diff in CI.

---

15. Fix repository-wide lint and formatting coverage

Blocker

Test linting is currently a manually enumerated list. New tests can be added without being linted unless package.json is edited. Nested documentation and OpenSpec artefacts are also outside parts of the formatting scope.

Required work

[ ] Replace the manually enumerated test list with a robust glob or ESLint flat-config target.

[ ] Include all tracked:

test/**/*.ts.

docs/**/*.

openspec/**/*.

API contract files.

SQL runbooks.

[ ] Add SQL linting or at least parse/execution tests for operational SQL.

[ ] Ensure new files are automatically covered.

[ ] Add a CI check that fails when tracked source or docs are outside validation scope.

---

16. Obtain visible CI evidence for the exact release commit

Blocker

I could not independently verify pull-request workflow runs or combined statuses for the current head. The repository has static, GitNexus, E2E and integration jobs configured, but the halfway gate requires visible evidence for the exact candidate SHA.

Required CI gates

[ ] npm ci.

[ ] Prisma generation.

[ ] Format check.

[ ] Source lint.

[ ] Complete test lint.

[ ] Type-check.

[ ] Production build.

[ ] Production entry-point verification.

[ ] Prisma schema validation.

[ ] Architecture check.

[ ] Unit tests.

[ ] OpenAPI export and lint.

[ ] OpenAPI breaking-change diff.

[ ] Client generation and type-check.

[ ] Generated OpenAPI clean-diff check.

[ ] Generated client clean-diff check.

[ ] GitNexus analysis.

[ ] E2E tests.

[ ] Full integration suite.

[ ] Synthetic migration upgrade test.

[ ] Protected shared-backup restore verification.

[ ] Receipt-quarantine integration tests.

[ ] Auth replay and device-revocation integration tests.

Additional quality work

[ ] Run test:cov in CI if repository coverage thresholds are intended to be enforceable.

[ ] Do not allow required release jobs to pass with continue-on-error.

[ ] Store migration reconciliation and database-object inventory as workflow artefacts.

[ ] Record workflow run and job IDs in the release evidence.

Acceptance criteria

Every mandatory job must be green against one immutable release-candidate SHA. Do not combine local results from one commit with CI results from another.

---

17. Correct the migration tracker and Review task states

Blocker

The tracker currently claims shared-backup restoration that the latest test no longer performs. Review-32 also marks shared-restore and checksum tasks complete despite the synthetic fallback and reconstructed migration ledger.

Required work

[ ] Reopen Review-32 restore task 4.1.

[ ] Reopen Review-32 checksum/history task 4.3.

[ ] Describe the current test accurately as synthetic upgrade verification.

[ ] Add a separate row for actual shared-backup verification once completed.

[ ] Record each migration exactly once.

[ ] Record:

Commit SHA.

Backup timestamp.

Restore target.

Migration counts.

Checksum report.

SQL object report.

Behavioural probe result.

CI run.

[ ] Do not check tasks complete solely because code or documentation was added.

[ ] Check them only when the stated evidence exists.

---

18. Reconcile Issue #1 with release policy

Blocker

Issue #1 is closed as completed, although its own closure notes say visible remote CI evidence remained outstanding. Repository specifications also say the release issue should stay open when required evidence is missing.

Required work

Choose one:

Option A — Reopen Issue #1

[ ] Reopen it.

[ ] Add the remaining release evidence checklist.

[ ] Close only after exact-head CI and migration evidence exist.

Option B — Separate implementation from production release

[ ] Keep Issue #1 closed as implementation-complete.

[ ] Open a dedicated “Sprint 2 / Sprint 3 halfway production readiness” issue.

[ ] Move every unresolved gate item into that issue.

[ ] Make the release issue the authoritative production gate.

The repository must stop treating implementation completion and production approval as the same state.

---

19. Decide the halfway scope for Reversal and Manual Adjustment

Current state

The database has strengthening support for Adjustment and Reversal evidence, but real reversal execution and the complete manual-adjustment API are not finished.

Two valid gate paths

Path A — Keep them outside the halfway release

[ ] Explicitly mark Reversal execution and Manual Adjustment as deferred.

[ ] Keep execution endpoints disabled or truthfully return unavailable.

[ ] Do not expose UI controls suggesting they work.

[ ] Do not include them in production capability claims.

[ ] Prevent operators from creating unsupported receiptless records through application paths.

[ ] Keep the database guards because they protect future work.

Path B — Include them in the halfway release

Then the gate additionally requires:

[ ] Reversal authorisation and approval rules.

[ ] Idempotent reversal execution.

[ ] Exact allocation restoration.

[ ] Partial versus full reversal policy.

[ ] Reversal SMS and audit evidence.

[ ] Admin-only manual Adjustment API.

[ ] Debit Adjustment FIFO allocations.

[ ] Credit Adjustment lot creation.

[ ] Approval requirements and limits.

[ ] Branch provenance.

[ ] Complete read models.

[ ] OpenAPI and E2E coverage.

The faster defensible path is Path A, provided the scope is documented and the unfinished capabilities are not exposed.

---

20. Produce a final release-evidence package

The gate should not be opened from an informal statement that tests passed.

Required artefacts

[ ] Final release commit SHA.

[ ] Pull request or release-review record.

[ ] Green CI workflow URL and run ID.

[ ] Individual mandatory job results.

[ ] Shared backup source and timestamp.

[ ] Restore execution record.

[ ] Original _prisma_migrations inventory.

[ ] Repository-versus-database checksum report.

[ ] pg_proc function inventory.

[ ] pg_trigger inventory including enabled and deferred state.

[ ] pg_constraint inventory.

[ ] Critical index inventory.

[ ] Financial behaviour-probe output.

[ ] Receipt-quarantine dry-run output.

[ ] Device-revocation and attestation-replay test results.

[ ] Real SMS smoke-test evidence.

[ ] Deployment configuration checklist.

[ ] Rollback and restore procedure.

[ ] Updated tracker and release issue.

---

Recommended execution order

Phase 1 — Security and financial correctness

1. Device session revalidation and revocation.

2. Device-attestation replay protection.

3. Approval post-lock re-read.

4. Approval-expiry atomicity and SYSTEM attribution.

5. Adjustment schema alignment and missing regression tests.

Phase 2 — Operational data safety

6. Batch-scoped Receipt quarantine.

7. Actor-attributed approval and deletion-count verification.

8. Receiptless branch-ownership decision.

9. Branch-safe list and transaction read models.

Phase 3 — Messaging and contracts

10. Strict validation for every active SMS template.

11. Terminal handling for malformed payloads.

12. Production real-provider configuration and smoke test.

13. OpenAPI, generated client and error-example updates.

Phase 4 — Evidence and release

14. Separate synthetic and shared-backup restore tests.

15. Independent migration checksum comparison.

16. Correct tracker and task states.

17. Run exact-head CI.

18. Create the release-evidence package.

19. Reconcile or reopen the release issue.

20. Approve the halfway gate only after all required evidence is attached.

---

Final gate criteria

The halfway production gate is unlocked only when all the following are true:

[ ] A blocked device immediately invalidates its sessions.

[ ] Device attestations cannot be replayed.

[ ] Approval decisions and expiry are transactionally consistent.

[ ] Receipt remediation cannot delete unapproved or stale records.

[ ] Receiptless financial entries are either safely scoped and readable or formally disabled.

[ ] Every active SMS payload is strictly validated.

[ ] Production uses a real SMS provider.

[ ] The actual shared database backup has been restored and inspected.

[ ] Original migration checksums match committed files.

[ ] Required SQL objects and financial behaviours are present.

[ ] Current-head static, unit, E2E and integration CI is green.

[ ] OpenAPI and generated clients match runtime behaviour.

[ ] Tracker, Review tasks and release issue accurately reflect the evidence.

[ ] The release evidence all points to the same immutable commit.

Until those conditions are met, the correct state remains:

> Development: Go
> Halfway production deployment: No-go
