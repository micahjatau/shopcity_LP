## Why

Sprint 4 is functionally ready to hand off, but the TRD still leaves Sprint 5 work unfinished before ShopCity can run a safe pilot. The remaining gap is no longer feature breadth; it is operational trust. The platform still needs server-authoritative credit expiry, replay-safe reminder delivery, pilot-grade observability, reproducible production packaging, security certification, measured performance evidence, restore verification, operator runbooks, and one signed release decision tied to a single tested artifact.

Without this change, the system can issue and redeem credit but cannot yet prove that expiring balances are handled correctly, that operators can detect and respond to incidents quickly, or that recovery/security/performance risks are within the MVP acceptance envelope defined by `docs/TRD.md`.

## What Changes

- Add immutable expiry evidence and a non-human system actor for background financial writes.
- Implement replay-safe expiry sweeps and 30-day aggregated expiry reminders.
- Extend reporting, public contracts, and SMS flows so expiry is historically accurate and externally visible where appropriate.
- Add pilot observability, reconciliation signals, release metadata, and a reproducible production image.
- Add security, load, backup/restore, and production-readiness certification workflows.
- Publish runbooks, training, and pilot operating checklists tied to the implemented runtime behavior.

## Out of Scope

- New customer-facing product scope beyond expiry/reminder support already implied by the TRD.
- POS integration, offline redemption, customer self-service, digital card channels, or multi-branch product expansion.
- Redesigning Sprint 2–4 ledger, redemption, offline-sync, fraud, or reporting architecture unless a Sprint 5 regression exposes a concrete correctness defect.
- Replacing the modular monolith with microservices or introducing a second financial authority outside the append-only ledger.

## Capabilities

### New Capabilities

- `credit-expiry-execution`: due credit lots expire exactly once with immutable ledger evidence and no negative-balance drift under concurrency.
- `credit-expiry-reminders`: one replay-safe reminder per customer/day aggregates all qualifying lots in the 30-day window.
- `pilot-operations-summary`: admin-only operational visibility across outbox, SMS, offline-sync, fraud, reports, and financial reconciliation.
- `production-artifact-certification`: one reproducible container image, release metadata trail, and machine-verifiable readiness gate.
- `restore-and-recovery-verification`: scripted backup, restore, and restored-database invariant validation with measured RPO/RTO evidence.
- `pilot-runbooks-and-training`: role-specific guidance for cashiers, supervisors, owners, and operators using implemented APIs and controls.

### Modified Capabilities

- `financial-workflow-contracts`: ledger and transaction views now include expiry semantics where the contract exposes transaction type/state.
- `reporting-contract-closure`: historical reporting must reconstruct liability and expired-credit state from authoritative lot/allocation/restoration/expiry evidence.
- `outbox-recovery-resilience`: reminder and operational event delivery extends shared worker recovery behavior while preserving terminal-handling rules.
- `production-entrypoint-verification`: release packaging now covers both API and worker entrypoints from the same build artifact.

## Impact

Proposal-time GitNexus analysis was recorded in `docs/development/gitnexus-impact-tracker.md`.

- `ReportMaterializerService`: MEDIUM risk, 14 impacted symbols, 8 direct dependants. Expiry-aware historical reporting can change liability totals and pilot reconciliation signals.
- `OutboxWorkerRuntime`: MEDIUM risk, 8 impacted symbols, 6 direct dependants. Reminder and recovery flows share worker bootstrap and delivery semantics.
- `LoyaltyService`: MEDIUM risk, 20 impacted symbols, 12 direct dependants. Expiry integration touches central financial orchestration and lot math.
- `bootstrap` (`src/worker.ts`): LOW risk, 2 impacted symbols, 2 direct dependants. Worker lifecycle changes are localized but operationally important.
- `PrismaService` / schema surface: UNKNOWN. GitNexus did not resolve the Prisma symbol by name, so schema and migration work must be treated as high-integrity surfaces with targeted integration coverage.

No proposal-time HIGH or CRITICAL indexed findings were returned for the planned Sprint 5 scope, but schema and expiry math remain release-sensitive surfaces.

## Rollout / Verification

Implementation and certification for this change must prove all of the following on a single identified release candidate artifact:

- expiry execution, reminder replay safety, and expiry-versus-redemption concurrency regression coverage;
- OpenAPI/client regeneration and deterministic generated artifacts;
- production image build plus worker/API entrypoint verification;
- green security gates for Gitleaks, CodeQL, Trivy, and approved ZAP staging checks;
- k6 evidence for checkout, lookup, redeem, report-isolation, and mixed pilot scenarios;
- backup/restore drill evidence with acceptable RPO/RTO and restored invariant checks;
- operator runbooks, training completion, and signed production-readiness evidence;
- `npm run openspec:validate` after artifact creation and after any planning-scope edits.

## Open Questions

1. Should reminder dedupe be captured with a dedicated immutable reminder table, or can an existing outbox/event invariant be safely extended without obscuring auditability?
2. Should expiry sweeps execute strictly from the worker process, or should there also be an admin-triggered dry-run/diagnostic hook for pilot operations?
3. Which pilot reconciliation signals belong in the first admin operations summary response versus a follow-up reporting or export surface?
4. Does the final production evidence live in-repo on an evidence-only commit, or as external release artifacts tied to the tested application SHA/image digest?
