## 1. Migration And Scope Baseline

- [x] 1.1 Run GitNexus impact analysis for the auth, approval, SMS, ledger, migration, quarantine, and contract symbols before editing implementation code.
- [x] 1.2 Decide and record the halfway scope for receiptless Reversal/manual Adjustment: implement immutable branch provenance now or formally defer the capabilities.
- [x] 1.3 Decide and record automatic approval-expiry attribution: null system actor or dedicated SYSTEM actor.
- [x] 1.4 Verify whether the current device fingerprint/HMAC material is high entropy; if not, design a dedicated per-device secret with rotation and revocation.

## 2. Device Session Security

- [x] 2.1 Update session loading to include linked device and device branch for guarded requests and refresh/session rotation.
- [x] 2.2 Reject guarded requests when the linked device is missing, non-ACTIVE, cross-tenant, attached to an inactive branch, or incompatible with the user branch.
- [x] 2.3 Reject refresh/session rotation under the same device and branch ineligibility conditions without issuing replacement sessions.
- [x] 2.4 Revoke all active sessions for a device when that device becomes blocked or otherwise ineligible.
- [x] 2.5 Add audit records for device-driven session revocation, including device, tenant, reason, actor/source, and timestamp.
- [x] 2.6 Add tests for protected request rejection, refresh rejection, branch deactivation, device branch move, refresh/block race, and reactivation not restoring revoked sessions.

## 3. Device Attestation Replay Protection

- [x] 3.1 Add persistent attestation nonce storage with tenant ID, device ID, nonce hash, attestation timestamp, accepted timestamp, expiry timestamp, and issued session ID where applicable.
- [x] 3.2 Add unique device/nonce protection and an expiry index plus deterministic cleanup.
- [x] 3.3 Consume the attestation nonce in the same transaction that creates the session and map unique conflicts to a stable replay error.
- [x] 3.4 Enforce timestamp window, future clock-skew allowance, signature validation, and device-secret rotation/revocation behaviour.
- [x] 3.5 Add tests for first-use success, replay failure, concurrent replay, same nonce on different devices, expired timestamp, invalid signature, and rotated secret invalidation.

## 4. Approval Aggregate Safety

- [x] 4.1 Refactor approval decisions to resolve only scoped approval ID before locking.
- [x] 4.2 Lock Approval, Receipt, Redemption where applicable, card/customer/device rows, and relevant ledger/allocation rows required for execution.
- [x] 4.3 Re-read the complete aggregate after lock acquisition and re-run all eligibility checks against post-lock state.
- [x] 4.4 Execute approval decisions using only post-lock values while retaining conditional update-count checks.
- [x] 4.5 Make approval expiry update expected related Receipt/Redemption rows with source-state predicates and fail the transaction on missing or stale related rows.
- [x] 4.6 Attribute deadline-driven expiry to SYSTEM/null actor and store detector identity separately in audit metadata.
- [x] 4.7 Add concurrency and rollback tests for stale pre-lock state, missing Receipt, transitioned Redemption, concurrent decision/expiry, system attribution, and expiry replay.

## 5. Receipt Quarantine Safety

- [x] 5.1 Add durable quarantine batch metadata with incident/reference ID, actor/timestamp fields, approval reason, status, and notes.
- [x] 5.2 Scope quarantine report, approval, staging, execution, and status queries to one batch ID.
- [x] 5.3 Preserve the exact reviewed duplicate report with the approved batch and reject IDs not present in that report.
- [x] 5.4 Lock staged Receipt rows during execution and revalidate duplicate status before quarantine/deletion.
- [x] 5.5 Verify Receipt dependencies and require approved reconciliation plans for financially linked rows.
- [x] 5.6 Insert or update quarantine snapshots before deletion and require quarantine write count and Receipt delete count to match expectations.
- [x] 5.7 Mark completed batches executed, close active stage rows, prevent destructive repeat execution, and document restoration/recovery.
- [x] 5.8 Add tests for empty batch, unapproved ID, stale staged ID, existing quarantine row, missing reconciliation plan, partial count rollback, and concurrent execution.

## 6. Financial Read Models And Adjustment Invariants

- [ ] 6.1 If receiptless capabilities are enabled, add immutable tenant-safe branch provenance and backfill receipt-linked ledger rows from Receipt branch.
- [ ] 6.2 Define explicit provenance or rejection handling for historical receiptless entries whose branch cannot be established.
- [ ] 6.3 Update customer-ledger lists, transaction detail, and approval lists to include authorized receiptless entries without cross-branch exposure.
- [ ] 6.4 If receiptless capabilities are deferred, disable application execution paths and remove unsupported production capability claims from API/UI-facing contracts.
- [ ] 6.5 Align the Prisma Adjustment model with committed-only ledger linkage or implement a formal draft lifecycle decision.
- [ ] 6.6 Add the forward migration, regenerate Prisma Client, update fixtures/services, and retain database triggers as defence in depth.
- [ ] 6.7 Add Adjustment regression tests for unsupported ledger kinds, cross-customer, cross-tenant, wrong direction, wrong amount, wrong effective date, missing ledger, invalid historical preflight variants, and valid credit/debit variants.

## 7. SMS Payload And Delivery Truthfulness

- [ ] 7.1 Define discriminated versioned payload schemas for earn-confirmed, redemption-confirmed, transaction-reversed, and balance-adjusted templates.
- [ ] 7.2 Add template-specific payload builders and replace direct raw payload construction for active SMS outbox intents.
- [ ] 7.3 Validate required IDs, phone number, amount strings, non-negative integer format, relationships, remaining balance, and expiry date where included.
- [ ] 7.4 Classify every SmsPayloadError as terminal, dead-letter malformed payloads on first processing attempt, skip provider calls, and store stable failure details.
- [ ] 7.5 Add tests for missing earn amount, invalid numeric amount, missing transaction ID, missing redemption balance, incomplete reversal/adjustment payloads, no provider call, and no repeated retry.
- [ ] 7.6 Add production SMS deployment-policy checks for real provider mode, required secrets, and absent/false fake-provider override.
- [ ] 7.7 Record controlled production smoke-test evidence, idempotency-key usage, retryable/terminal provider classifications, outage handling, and credential-rotation runbook updates.

## 8. Migration Verification And Documentation Evidence

- [ ] 8.1 Rename the current restore test to identify it as a synthetic upgrade-path test.
- [ ] 8.2 Add protected shared-backup restore verification requiring actual schema/data dump paths and failing without fallback fixtures.
- [ ] 8.3 Restore the real backup into isolated PostgreSQL, preserve original `_prisma_migrations`, and run `prisma migrate status` before changing anything.
- [ ] 8.4 Apply only genuinely pending migrations with `prisma migrate deploy`.
- [ ] 8.5 Compare restored migration rows to repository migrations by name, SHA-256 checksum, finished_at, rolled_back_at, and applied-step count before any repair command.
- [ ] 8.6 Detect extra database migrations and committed migrations absent from the database after deployment.
- [ ] 8.7 Add SQL object inventory and behavioural probes for required functions, triggers, constraints, indexes, and historical financial rows.
- [ ] 8.8 Emit machine-readable migration reconciliation and object/probe reports as release artifacts.
- [ ] 8.9 Update `docs/database/migration-tracker.md` and review task states to distinguish synthetic and actual shared-backup evidence.

## 9. API Contracts, Validation Coverage, And CI

- [ ] 9.1 Align documented public error examples with runtime envelopes for 400, 401, 403, 404, 409, 422, 429, and 503.
- [ ] 9.2 Document stable device-revoked and attestation-replayed errors.
- [ ] 9.3 Document type-specific receiptless transaction responses or explicit receiptless capability deferral.
- [ ] 9.4 Regenerate OpenAPI and generated API client artifacts, run Spectral, run breaking-change diff, type-check the generated client, and add clean-diff checks.
- [ ] 9.5 Replace manually enumerated test linting with robust glob or ESLint flat-config coverage for new tests.
- [ ] 9.6 Expand formatting/validation coverage for docs, OpenSpec artifacts, API contracts, SQL runbooks, and generated artifacts.
- [ ] 9.7 Add SQL linting or parse/execution tests for operational SQL.
- [ ] 9.8 Add a CI validation-scope check that reports tracked release-critical files outside validation.

## 10. Final Release Gate Evidence

- [ ] 10.1 Run mandatory exact-head CI gates for install, Prisma generation, format, lint, test lint, type-check, build, entrypoint verification, Prisma validation, architecture, unit, OpenAPI, client, GitNexus, E2E, integration, synthetic migration, shared restore, quarantine, and auth security tests.
- [ ] 10.2 Ensure mandatory release jobs are not allowed to pass with `continue-on-error`.
- [ ] 10.3 Store migration reconciliation and database-object inventory as workflow artifacts.
- [ ] 10.4 Reconcile Issue #1 by reopening it with remaining release evidence or opening a dedicated halfway production readiness issue.
- [ ] 10.5 Assemble the final release-evidence package with final SHA, review record, workflow URL/run ID, job results, shared backup source/timestamp, restore records, migration/object reports, financial probes, quarantine dry run, device security tests, real SMS smoke evidence, deployment checklist, rollback/restore procedure, updated tracker, and issue state.
- [ ] 10.6 Keep halfway production deployment marked no-go until every final gate criterion is attached to the same immutable release-candidate SHA.
