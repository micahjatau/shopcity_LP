Halfway Production Gate — Complete Remaining Work

Latest reviewed head: 69cd4c44b73cd46276f9168bb3f1054460d01eac
Current decision: Production no-go. Development may continue.

Most core earn, redemption, authentication and database safeguards are now in place. The remaining gate is blocked by a smaller set of runtime correctness, operational safety, evidence integrity and deployment-readiness issues.

---

A. Mandatory code blockers

1. Lock every dependency used during approval execution

Current problem

Approval processing now locks the Approval, Receipt and Redemption rows and rereads the aggregate afterward. However, it does not lock the other mutable rows used to determine eligibility:

Customer.

Card.

Device.

Relevant CreditLots.

Redemption allocations.

The Review-34 checklist marks this fully complete, but the actual lock helper only locks Approval, Receipt and Redemption records.

Required work

[ ] Lock Approval.

[ ] Lock Receipt.

[ ] Lock Redemption where applicable.

[ ] Lock Customer.

[ ] Lock Card.

[ ] Lock Device.

[ ] For redemption approvals, lock the CreditLots that may be allocated.

[ ] Lock existing allocation rows relevant to the transaction.

[ ] Acquire locks in a deterministic order to avoid deadlocks.

[ ] Reread the complete aggregate only after all locks are acquired.

[ ] Run all eligibility and policy checks against the post-lock data.

[ ] Add concurrency tests where Card, Customer or Device status changes while approval execution is waiting.

Acceptance criterion

No approval may commit using eligibility information that another transaction can change between validation and financial execution.

---

2. Fix automatic approval-expiry attribution

Current problem

The worker expiry path correctly uses a null/system decision actor. But when an expired approval is discovered during a supervisor’s decision request, the supervisor is still passed as both:

Decision actor.

Detector.

That makes the supervisor appear to have expired or rejected the approval, even though the deadline caused the transition.

Required work

[ ] Pass a null or dedicated SYSTEM actor for every deadline-driven expiry.

[ ] Record the requesting supervisor only as detectedBy.

[ ] Keep decisionBy, reviewedBy and related decision ownership null/system-controlled.

[ ] Apply the same behaviour to earn and redemption approvals.

[ ] Add tests for request-discovered expiry, not only worker expiry.

[ ] Reopen Review-34 task 4.6 until corrected.

Acceptance criterion

All automatic expirations have system ownership, while the detecting worker or user remains separately auditable.

---

3. Dead-letter malformed existing SMS rows immediately

Current problem

Malformed outbox events without an existing SMS row are terminally dead-lettered. But when an SmsMessage already exists, SmsPayloadError is caught by the general delivery-error handler and treated as retryable until the retry budget is exhausted.

This contradicts the completed task claiming malformed payloads are terminal on the first attempt.

Required work

[ ] Catch SmsPayloadError separately for existing SMS rows.

[ ] Mark the SMS row FAILED.

[ ] Set deadLetteredAt immediately.

[ ] Set nextAttemptAt = null.

[ ] Use a stable category such as invalid-payload.

[ ] Terminally fail the corresponding OutboxEvent.

[ ] Call job.discard().

[ ] Do not call the provider.

[ ] Do not rethrow the error for BullMQ retry.

[ ] Add a test using an existing malformed SMS record.

[ ] Verify that repeated worker recovery does not reschedule it.

Acceptance criterion

Every malformed payload—whether reconstructed or already persisted—is terminal after its first processing attempt.

---

4. Lock the actual Receipt rows during quarantine execution

Current problem

The receipt-quarantine execution script locks staging rows, not the source Receipt rows that will be revalidated and deleted.

The completed task claims the Receipt rows themselves are locked.

Required work

[ ] Join the selected quarantine batch to Receipt.

[ ] Acquire FOR UPDATE locks on the actual Receipt rows.

[ ] Lock before duplicate revalidation.

[ ] Confirm every locked Receipt still matches its staged tenant, branch, week and normalized receipt identity.

[ ] Reject the batch if any Receipt is missing or changed.

[ ] Hold the locks through quarantine snapshot insertion and deletion.

[ ] Add a concurrent-update test.

Acceptance criterion

No quarantined Receipt can change between final duplicate validation, snapshot capture and deletion.

---

5. Make quarantine batch selection explicit

Current problem

The stage script requires exactly one globally approved batch. The execute script chooses the latest globally staged batch. This is safer than processing every staged row, but operators still do not explicitly identify the batch being acted upon.

Required work

[ ] Require an explicit batch ID for report, stage and execute operations.

[ ] Never select “the latest” approved or staged batch.

[ ] Add foreign keys from Approval, Stage and Quarantine records to the Batch record.

[ ] Use a composite key such as (batchId, receiptId) for approvals.

[ ] Prevent a batch from being staged or executed more than once.

[ ] Check the affected-row count when transitioning:

APPROVED → STAGED.

STAGED → EXECUTED.

[ ] Reject cancelled, expired, abandoned or already executed batches.

[ ] Close or delete active staging rows after execution.

[ ] Store the business operator ID, not only PostgreSQL CURRENT_USER.

[ ] Preserve the approving operator and execution operator separately.

Acceptance criterion

An operator must intentionally specify one immutable approved batch, and no other batch can be selected implicitly.

---

6. Complete quarantine failure and concurrency testing

Current problem

The dedicated quarantine integration test mainly covers the successful path. Another test confirms that an unapproved duplicate remains untouched, but most failure cases claimed as complete are missing.

Required tests

[ ] Empty approved batch is rejected.

[ ] Empty staged batch is rejected.

[ ] Unapproved Receipt ID is rejected.

[ ] Receipt no longer present in the duplicate report is rejected.

[ ] Source Receipt changed after staging is rejected.

[ ] Existing quarantine row is safely updated before deletion.

[ ] Missing reconciliation plan rejects financially linked Receipt.

[ ] Quarantine write-count mismatch rolls back.

[ ] Receipt delete-count mismatch rolls back.

[ ] Missing source Receipt rolls back.

[ ] Two concurrent executions produce only one successful result.

[ ] Re-execution of an executed batch is non-destructive.

[ ] Abandoned staging rows are not included in another batch.

Reopen Review-34 task 5.8 until these are present.

---

7. Make the reversal endpoint truthful

Current problem

The reversal endpoint returns HTTP 202 stating that reversal review was accepted. The service only writes an idempotency record; it does not:

Verify that the transaction exists.

Verify tenant or branch ownership.

Create a review request.

Write an audit record.

Assign the request for manual handling.

Notify an operator.

The contract draft also contains both a successful 201 reversal example and a statement that reversal execution is deferred.

Required decision

Choose one of the following.

Option A — Fully disable reversal for the halfway release

[ ] Return a stable unavailable/deferred response.

[ ] Remove the 202 accepted for review wording.

[ ] Remove the completed reversal success example.

[ ] Remove reversal execution from generated-client capability claims.

[ ] Keep the route out of operator-facing UI.

Option B — Implement a real review-request workflow

[ ] Validate transaction existence and tenant scope.

[ ] Validate that the transaction is eligible for review.

[ ] Persist a ReversalReviewRequest.

[ ] Store the reason, requester, timestamp and source transaction.

[ ] Write an audit record.

[ ] Add status and assignment fields.

[ ] Return the review-request ID.

[ ] Provide an operational queue/list endpoint.

[ ] Make idempotency cover the actual durable request.

Acceptance criterion

The HTTP response must correspond to something that was actually persisted and can be acted upon.

---

B. Migration and evidence blockers

8. Compare the full Prisma migration history

Current problem

The protected restore test currently compares only:

Migration name.

Checksum.

The Review-34 checklist claims it also verifies finished_at, rolled_back_at and applied-step count.

The committed reconciliation report also contains only names and checksums.

Required work

[ ] Read the full relevant _prisma_migrations metadata:

migration_name.

checksum.

finished_at.

rolled_back_at.

applied_steps_count.

Relevant log or failure state.

[ ] Compare the restored history before any repair or resolve command.

[ ] Reject rolled-back or incomplete migrations.

[ ] Reject duplicate migration names.

[ ] Reject database migrations absent from the repository.

[ ] Reject committed migrations absent from the restored database after deployment.

[ ] Emit the full comparison in the machine-readable report.

[ ] Reopen Review-34 task 8.5.

Acceptance criterion

The protected restore proves the actual migration ledger, not only matching filenames and checksums.

---

9. Add historical-data and behavioural probes to the protected restore

Current problem

The protected restore inventories selected functions, triggers and indexes. It does not adequately prove that historical business records remain valid after restoration.

The current object report also does not include newer authentication and schema objects.

Required work

Verify the restored database contains and correctly relates historical:

[ ] Receipts.

[ ] EARN ledger entries.

[ ] REDEEM ledger entries.

[ ] CreditLots.

[ ] Redemptions.

[ ] RedemptionAllocations.

[ ] AllocationRestorations.

[ ] Adjustments.

[ ] Approvals.

[ ] OutboxEvents.

[ ] SmsMessages.

[ ] IdempotencyRecords.

[ ] AuditLogs.

Add schema/object probes for:

[ ] Adjustment.ledgerEntryId being non-nullable.

[ ] DeviceAttestation table.

[ ] Device/nonce unique indexes.

[ ] Device attestation metadata fields.

[ ] Device encrypted-secret column.

[ ] Required composite foreign keys.

[ ] Critical financial constraints.

[ ] Critical triggers and whether they are enabled/deferred.

Add behavioural probes that confirm invalid operations fail:

[ ] Invalid Adjustment-to-ledger linkage.

[ ] Adjustment evidence mutation.

[ ] Invalid CreditLot source.

[ ] Invalid ledger type/direction.

[ ] Invalid allocation restoration.

[ ] Cross-tenant financial linkage.

[ ] Duplicate attestation nonce.

Reopen Review-34 task 8.7.

---

10. Generate release evidence inside the workflow that uploads it

Current problem

The protected restore writes fresh reports under /tmp/opencode, but CI uploads committed files from docs/release-evidence/repo-review-34.

The protected restore test is skipped when shared-dump environment variables are absent.

This means a workflow can upload old committed reports even when that workflow did not run the protected restore.

Required work

Create a separate protected release workflow that:

[ ] Requires secure shared-backup inputs.

[ ] Fails if the backup inputs are unavailable.

[ ] Never silently skips the protected test.

[ ] Runs against the exact release SHA.

[ ] Generates reports into a clean workflow artefact directory.

[ ] Records:

Release SHA.

Workflow run ID.

Backup source identifier.

Backup timestamp.

Schema dump hash.

Data dump hash.

Test timestamp.

Database image/version.

[ ] Uploads only reports generated during that run.

[ ] Does not treat committed JSON snapshots as execution proof.

[ ] Keeps sensitive database contents out of public artefacts.

[ ] Links the workflow artefact from the release issue.

Acceptance criterion

Every uploaded restore report can be traced to one workflow run, one backup and one immutable release commit.

---

11. Correct migration-tracker contradictions

Current problem

The tracker says the Adjustment NOT NULL migration was “Not run”, while the reconciliation report lists it among restored and committed migrations.

Required work

For every migration, state separately whether it was:

[ ] Committed in the repository.

[ ] Applied to a disposable fresh database.

[ ] Applied to an isolated shared-backup restore.

[ ] Applied to the linked shared environment.

[ ] Applied to production.

Also record:

[ ] Verification date.

[ ] Exact commit SHA.

[ ] Workflow or command evidence.

[ ] Database target identifier.

[ ] Pending deployment state where applicable.

Acceptance criterion

No tracker entry may say “not run” while release evidence claims the migration was applied, unless the different environments are explicitly distinguished.

---

C. Release and CI blockers

12. Run all release gates on one final immutable SHA

Current problem

The release-evidence README identifies 9e04f0c as the candidate, while the current head is 69cd4c4. It also states exact-head CI remains pending.

Required work

After all code corrections:

[ ] Select one final release-candidate SHA.

[ ] Stop adding unrelated commits to that candidate.

[ ] Run all mandatory checks against that exact SHA.

[ ] Regenerate OpenAPI and the API client from that SHA.

[ ] Generate restore evidence from that SHA.

[ ] Generate quarantine evidence from that SHA.

[ ] Generate security-test evidence from that SHA.

[ ] Update the release README to that SHA.

[ ] Update Issue #1 to that SHA.

[ ] Reject mixed evidence from earlier commits.

Mandatory CI jobs

[ ] Install dependencies.

[ ] Prisma Client generation.

[ ] Format check.

[ ] Source lint.

[ ] Test lint.

[ ] Type-check.

[ ] Production build.

[ ] Production entry-point verification.

[ ] Prisma schema validation.

[ ] Architecture validation.

[ ] Unit tests.

[ ] OpenAPI export.

[ ] OpenAPI lint.

[ ] Breaking-change diff.

[ ] Generated-client build/type-check.

[ ] Generated-file clean-diff checks.

[ ] Validation-scope check.

[ ] GitNexus.

[ ] E2E tests.

[ ] Full integration suite.

[ ] Synthetic restore test.

[ ] Receipt-quarantine SQL tests.

[ ] Auth replay/device-revocation tests.

[ ] Protected shared-backup workflow.

Acceptance criterion

Every required job and artefact references the same commit SHA.

---

13. Replace the ineffective validation-scope checker

Current problem

The validation script creates its list of critical files from files already assigned to validation groups, then checks whether those same files belong to a group. By construction, the check nearly always passes.

It also misses important release files.

Required work

[ ] Define an independent list of release-critical file patterns.

[ ] Map each pattern to required validators.

[ ] Fail when a critical file has no validation mapping.

[ ] Include:

prisma/schema.prisma.

Every migration SQL file.

Workflow files.

package.json.

OpenAPI base and generated files.

Generated client.

Release-evidence files.

All Review-34 OpenSpec files.

Operational SQL runbooks.

Auth/security implementation.

Financial services and tests.

[ ] Verify that the named script actually runs in CI.

[ ] Add a self-test showing that an intentionally uncovered file causes failure.

Acceptance criterion

Adding a new critical file outside known validation scope must fail CI automatically.

---

14. Complete exact-head remote CI evidence

Required work

[ ] Obtain the visible workflow run for the final candidate.

[ ] Record the workflow run ID.

[ ] Record every required job ID and result.

[ ] Confirm no mandatory job is continue-on-error.

[ ] Confirm no required job was skipped.

[ ] Store relevant artefacts.

[ ] Add the evidence to Issue #1.

[ ] Keep Issue #1 open until the final run is green.

Issue #1 is currently correctly reopened.

---

D. Production security and messaging blockers

15. Remove legacy device-secret fallback before production

Current problem

New and rotated devices use a dedicated encrypted attestation secret. Devices without that secret still fall back to fingerprintHash as the HMAC key.

Required work

[ ] Inventory all active devices with null attestationSecretCiphertext.

[ ] Provision or rotate a dedicated high-entropy secret for every active device.

[ ] Securely deliver the new secret to the device.

[ ] Revoke active sessions during secret rotation where appropriate.

[ ] Verify old attestations fail after rotation.

[ ] Reject fingerprint fallback when NODE_ENV=production.

[ ] Add a deployment preflight that fails when any active device lacks a dedicated secret.

[ ] Document recovery when a device loses its secret.

Acceptance criterion

No production device uses a fingerprint or public identifier as an authentication secret.

---

16. Complete real SMS production verification

Current state

The real provider integration and production fake-provider guard exist, but the controlled production smoke test remains outstanding.

Required work

[ ] Confirm production uses SMS_PROVIDER_MODE=real.

[ ] Confirm all provider credentials are supplied through secrets.

[ ] Confirm the fake-provider override is absent or false.

[ ] Add a deployment-policy check preventing fake mode in production.

[ ] Send one controlled production SMS.

[ ] Record the OutboxEvent ID.

[ ] Record the SmsMessage ID.

[ ] Record provider request/result metadata without exposing credentials.

[ ] Confirm the financial transaction remains committed if SMS delivery fails.

[ ] Confirm provider timeout is retryable.

[ ] Confirm invalid credentials are classified appropriately.

[ ] Confirm malformed payloads are terminal.

[ ] Verify the outbox/event ID is used for provider idempotency where supported.

[ ] Document provider outage handling.

[ ] Document credential rotation.

[ ] Document manual replay/dead-letter handling.

Acceptance criterion

At least one controlled production delivery proves the deployed worker is using the real provider and updating delivery evidence correctly.

---

E. Deployment and operational blockers

17. Complete the production deployment checklist

The release package currently says production checklist completion is pending.

Required checklist

Database

[ ] Final production backup taken.

[ ] Backup restoration tested.

[ ] Migration status checked before deploy.

[ ] Migration checksums reconciled.

[ ] Pending migrations identified.

[ ] prisma migrate deploy used.

[ ] No db push used against production.

[ ] Post-deploy migration status confirmed.

[ ] Critical triggers, functions, indexes and constraints probed.

[ ] Historical financial records sampled after deployment.

Application

[ ] API image or deployment tied to the release SHA.

[ ] Worker image tied to the same SHA.

[ ] API and worker use compatible schema versions.

[ ] Health checks pass.

[ ] Redis connection verified.

[ ] Outbox publisher running.

[ ] BullMQ worker running.

[ ] Production entry points verified.

Security

[ ] Strong session and CSRF secrets.

[ ] All active devices use dedicated attestation secrets.

[ ] CORS allowlist reviewed.

[ ] Supabase service-role key restricted.

[ ] Swagger disabled unless intentionally protected.

[ ] Production logs do not expose secrets or full authentication material.

Messaging

[ ] Real provider mode confirmed.

[ ] Smoke test completed.

[ ] Dead-letter monitoring configured.

[ ] Retry monitoring configured.

[ ] Alerting configured for sustained delivery failures.

Operations

[ ] Support owner identified.

[ ] On-call contact documented.

[ ] Quarantine operation restricted to authorised operators.

[ ] Approval expiry worker monitored.

[ ] Outbox backlog alert threshold established.

[ ] Session/device revocation procedure documented.

---

18. Complete and test rollback procedures

Required work

[ ] Define application rollback separately from database rollback.

[ ] Prefer forward database repair rather than destructive migration reversal.

[ ] Document when rollback is prohibited because new financial evidence has been committed.

[ ] Document restoration from the pre-deploy backup.

[ ] Test restoration in an isolated database.

[ ] Verify the restored application version can read the restored schema.

[ ] Preserve outbox and SMS delivery evidence during recovery.

[ ] Preserve idempotency records.

[ ] Verify financial transactions are not duplicated during replay.

[ ] Record recovery time and responsible operator.

Acceptance criterion

The team can recover from a failed deployment without mutating or duplicating committed financial evidence.

---

F. Smaller release-hardening items

These are lower severity, but they should be fixed before final sign-off or explicitly accepted as documented release risk.

19. Preserve zero remaining balance in adjustment SMS payloads

The balance-adjustment payload builder omits remainingBalanceKobo when the value is 0n, because it uses a truthiness check.

[ ] Check against undefined, not truthiness.

[ ] Add a zero-balance test.

[ ] Confirm the SMS renders NGN 0.00.

---

20. Add referential integrity for issuedSessionId

DeviceAttestation.issuedSessionId is indexed but is not constrained to an actual Session.

[ ] Add an optional Prisma relation and foreign key, or

[ ] Explicitly document why the value is intentionally denormalized.

[ ] Decide delete behaviour when a Session is removed.

[ ] Add a test preventing dangling references if the FK is adopted.

---

21. Decide whether coverage thresholds are part of the release gate

Coverage thresholds exist, but CI runs regular tests rather than the coverage command.

Choose one:

[ ] Run test:cov in CI and enforce the thresholds, or

[ ] Remove the impression that the thresholds are release-enforced.

[ ] At minimum, enforce coverage on financial and authentication modules if this remains a production gate.

---

Required corrections to Review-34 task status

The following tasks should be reopened because their completed state exceeds the actual implementation or evidence:

[ ] 4.2 — All approval dependency rows locked.

[ ] 4.6 — System attribution for every deadline-driven expiry.

[ ] 5.4 — Actual Receipt rows locked during quarantine.

[ ] 5.8 — Full quarantine failure/concurrency test coverage.

[ ] 7.4 — Existing malformed SMS rows terminal on first attempt.

[ ] 8.5 — Full Prisma migration metadata comparison.

[ ] 8.7 — Historical financial and behavioural restore probes.

[ ] 8.8 — Workflow-generated, current-run release artefacts.

[ ] 9.8 — Effective independent validation-scope checking.

The currently open tasks for real SMS evidence, exact-head CI and final release packaging must remain open.

---

Recommended completion order

Phase 1 — Runtime correctness

1. Fix system attribution for request-discovered expiry.

2. Terminalize malformed existing SMS rows.

3. Lock Card, Customer, Device, CreditLots and allocations during approval execution.

4. Lock source Receipt rows during quarantine.

5. Make quarantine batch selection explicit.

6. Add the missing quarantine tests.

7. Make reversal deferral truthful.

Phase 2 — Evidence integrity

8. Expand migration metadata comparison.

9. Add historical-data and behavioural restore probes.

10. Generate evidence within a protected workflow.

11. Correct the migration tracker.

12. Replace the validation-scope checker.

13. Reconcile Review-34 task states.

Phase 3 — Production readiness

14. Provision dedicated secrets for all legacy devices.

15. Fix the zero-balance SMS edge case.

16. Select the final immutable candidate SHA.

17. Run complete exact-head CI.

18. Run the protected restore workflow.

19. Complete the real SMS smoke test.

20. Complete deployment and rollback rehearsals.

21. Update Issue #1 and the final release package.

22. Approve the production gate.

---

Final unlock criteria

The halfway production gate can be opened only when:

[ ] Approval execution locks and revalidates every mutable dependency.

[ ] Automatic expiry is always system-owned.

[ ] Malformed persisted SMS payloads are terminal immediately.

[ ] Quarantine locks source Receipts and uses an explicit immutable batch.

[ ] Quarantine failure and concurrency tests are complete.

[ ] Reversal is either truthfully disabled or backed by a real review workflow.

[ ] Protected restore verifies full migration metadata.

[ ] Historical financial data and database behaviour are probed.

[ ] Release artefacts are freshly generated by the workflow that uploads them.

[ ] Migration documentation agrees with the actual environment state.

[ ] Validation scope genuinely fails on uncovered critical files.

[ ] All active production devices use dedicated attestation secrets.

[ ] Exact-head CI is green.

[ ] The real SMS provider smoke test passes.

[ ] Deployment and rollback checklists are complete.

[ ] All evidence references one immutable release SHA.

[ ] Issue #1 contains the final evidence and can be closed.

Until then:

> Continued development: Go
> Halfway production deployment: No-go
