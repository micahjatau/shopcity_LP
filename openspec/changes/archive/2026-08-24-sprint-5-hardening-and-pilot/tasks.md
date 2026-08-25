## 1. Scope, baseline, and proposal controls

- [x] 1.1 Record the starting SHA and explicitly classify Sprint 4 as engineering-closed with certification carry-forward only.
- [x] 1.2 Keep proposal-time GitNexus findings updated in `docs/development/gitnexus-impact-tracker.md` as Sprint 5 scope changes.
- [x] 1.3 Validate these planning artifacts with `npm run openspec:validate` before implementation starts.
- [x] 1.4 Split any newly discovered Sprint 2–4 correctness defect into a separate change unless it is strictly required to make Sprint 5 safe.

## 2. Immutable expiry evidence foundation

- [x] 2.1 Add failing schema/integration coverage for one-lot/one-expiry evidence, one-expiry/one-ledger-entry evidence, and expiry immutability.
- [x] 2.2 Add additive schema support for `EXPIRY` ledger entries and immutable lot-linked expiry evidence.
- [x] 2.3 Update lot-balance invariants so remaining credit reflects allocations, restorations, and expiry evidence without permitting negative balances.
- [x] 2.4 Introduce a tenant-owned non-human `SYSTEM` actor for background financial writes while preserving current API role restrictions.
- [x] 2.5 Regenerate Prisma client and pass fresh plus representative upgrade migration coverage.

## 3. Replay-safe expiry execution

- [x] 3.1 Add failing service/integration cases for full expiry, partial-consumption remainder expiry, fully consumed lots, future lots, repeat sweeps, and concurrent sweeps.
- [x] 3.2 Lock due lots deterministically inside a database transaction and debit only the authoritative remaining amount.
- [x] 3.3 Write expiry ledger entry, expiry evidence, lot mutation, and audit evidence atomically.
- [x] 3.4 Prove expiry-versus-redemption races cannot over-debit or leave invalid lot balances.
- [x] 3.5 Keep retry/no-op behavior anchored to database uniqueness rather than queue uniqueness.

## 4. Worker-driven reminder flow

- [x] 4.1 Add deterministic worker tests for start, stop, active sweep handling, and clock/config injection.
- [x] 4.2 Add replay-safe reminder persistence, preferably one immutable reminder record per tenant/customer/reminder date.
- [x] 4.3 Aggregate all qualifying lots into one authoritative 30-day reminder per customer/day using remaining balance and `expiresAt`.
- [x] 4.4 Persist reminder intent, outbox event, and queued SMS state transactionally.
- [x] 4.5 Register expiry and reminder sweeps in `src/worker.ts` with shutdown-safe behavior.
- [x] 4.6 Prove repeated sweeps do not duplicate reminder delivery work and SMS/provider failure does not alter financial truth.

## 5. Reporting, contracts, and customer-safe surfaces

- [x] 5.1 Add historical reporting regressions proving pre-expiry and post-expiry liability are reconstructed correctly from evidence.
- [x] 5.2 Extend report lot math with expiry evidence rather than current mutable balances.
- [x] 5.3 Attribute expired-credit totals to the correct reporting dates/periods.
- [x] 5.4 Add `EXPIRY` transaction semantics to public ledger/OpenAPI/client contracts where required.
- [x] 5.5 Add and verify the expiry reminder SMS template without coupling financial commit success to SMS outcome.
- [x] 5.6 Re-run OpenAPI lint/diff, client generation/typecheck, and deterministic generated-artifact checks.

## 6. Pilot observability and reconciliation

- [x] 6.1 Add release/observability environment validation and production log redaction metadata.
- [ ] 6.2 Initialize Sentry only when configured and keep it non-blocking for financial writes.
- [x] 6.3 Implement admin-only pilot operations summary and reconciliation/staleness queries.
- [x] 6.4 Add operations/health regression coverage for stale outbox, failed SMS, offline rejection, fraud backlog, report staleness, and reconciliation mismatch signals.

## 7. Production packaging and security gates

- [x] 7.1 Build one reproducible multi-stage container image that can run both API and worker entrypoints.
- [x] 7.2 Add Docker build verification to CI and expose immutable release metadata to runtime surfaces.
- [x] 7.3 Add security workflows for Gitleaks, CodeQL, Trivy, and approved ZAP staging checks.
- [x] 7.4 Document remediation policy and security incident handling for pilot operations.

## 8. Performance and recovery evidence

- [x] 8.1 Build a k6 suite for card lookup, earn, redeem, report isolation, and mixed pilot traffic using synthetic credentials/data only.
- [x] 8.2 Define and record pilot baseline thresholds plus post-load financial reconciliation checks.
- [x] 8.3 Add backup, restore, and restored-database verification scripts with invariant checks for migrations, triggers/functions, lot math, report rebuilds, and recoverable outbox work.
- [ ] 8.4 Document provider-managed backup expectations and record an observed restore drill with acceptable RPO/RTO.

## 9. Runbooks, training, and pilot operations

- [x] 9.1 Expand deployment, rollback, incident, SMS failure, and database-restore guidance into executable runbooks.
- [x] 9.2 Add duplicate-credit, lost-card, security-incident, and outbox-backlog runbooks that rely on APIs/evidence rather than direct ledger mutation.
- [x] 9.3 Produce cashier, supervisor, and owner/admin pilot training guides.
- [x] 9.4 Add pilot day-0, daily review, and monitoring cadence documents tied to real signals and request IDs.

## 10. Machine-verifiable readiness and final certification

- [x] 10.1 Add a structured Sprint 5 evidence schema plus verifier tests and implementation.
- [x] 10.2 Publish a production-readiness checklist that separates engineering complete, staging certified, production approved, and pilot started.
- [ ] 10.3 Freeze one release candidate SHA/image digest and rerun required local, CI, staging, security, performance, and restore gates on that artifact.
- [ ] 10.4 Record final evidence, sign-off, and any Sprint 4 certification carry-forward updates on the same identified release candidate.
- [ ] 10.5 Run the readiness verifier against the real evidence and close the Sprint 5 change only when all mandatory gates pass.

## Remaining external certification work

- Populate `docs/release-evidence/sprint-5-pilot/readiness.example.json` with the real release SHA and image digest.
- Replace example restore evidence with an observed restore drill record and accepted RPO/RTO.
- Attach real staging, security, performance, training, and sign-off evidence for the chosen release candidate.
- Enable or explicitly defer Sentry with a documented production decision before final pilot approval.
