## Why

`docs/repo_review_43.md` keeps Sprint 4 at 84/100 and declares a NO-GO for Sprint 5. The review confirms meaningful progress from the previous closure work, but it identifies remaining P1 blockers that can still make historical reports inconsistent, SMS lifecycle history unreconstructable, offline replay records incorrect under contention, and final release evidence non-authoritative.

The current reviewed baseline is `b766d05d43ec10f558b3ca9103ae21975b5a6de6`. This change captures the exact remaining closure work from Review 43 so implementation can proceed without another broad review cycle.

## What Changes

- Fix historical redemption reporting so every report builder uses lifecycle state at `asOf`, not mutable current `Redemption.status`.
- Select and use `Redemption.rejectedAt`; reconstruct redemption state entirely from timestamps (`requestedAt`, `confirmedAt`, `rejectedAt`, `reversedAt`) rather than current status.
- Fix SMS historical reconstruction to choose the latest lifecycle transition timestamp at or before `asOf` instead of fixed status priority.
- Preserve SMS failure evidence on later successful retry so an earlier failed watermark can still be reported.
- Fix offline replay ownership so follower requests never persist canonical `OfflineSyncAttempt` results after waiting for an owner request.
- Extend receipt-boundary concurrency evidence for offline→online, true online↔offline races, and offline↔offline races with different `localId`/idempotency keys but the same canonical receipt.
- Add real report-refresh integration evidence for durable `PENDING` recovery, worker processing, materialization output, terminal `COMPLETED`, and stale `PUBLISHED` recovery.
- Reconcile OpenSpec trackers and Sprint 4 release evidence so completion claims match executable proof on one final SHA.

## Out of Scope

- Sprint 5 features.
- Offline redemption; offline sync remains earn-only.
- Ledger mutation, confirmed financial history repair, or weakening append-only financial constraints.
- A full append-only `SmsDeliveryAttempt` schema unless the minimal failed-at preservation approach cannot satisfy the Sprint 4 reporting requirement.
- Renaming fraud dedupe keys solely for local-date label cosmetics; Review 43 notes this is non-blocking.

## Capabilities

### New Capabilities

- `reporting-review-43-closure`: consistent historical redemption and SMS snapshots across all materialized report builders.
- `offline-review-43-closure`: owner-only offline sync attempt finalization and complete receipt-boundary concurrency evidence.
- `release-evidence-review-43-closure`: final tracker reconciliation, report-refresh integration proof, and immutable green release SHA evidence.

### Modified Capabilities

- `reporting-final-gate-closure`: narrows the prior claimed completion to require timestamp-only lifecycle reconstruction and cross-report consistency.
- `offline-final-gate-regression`: expands from exact replay contention to all same-receipt online/offline race boundaries.
- `release-evidence-alignment`: requires the evidence document and OpenSpec tasks to reflect the actual final SHA and CI run.

## Impact

Proposal-time GitNexus impact analysis was recorded in `docs/development/gitnexus-impact-tracker.md`.

- `ReportMaterializerService`: MEDIUM risk, 14 impacted symbols, 8 direct dependants. Reporting totals, report materialization, and worker bootstrap paths can be affected.
- `OfflineSyncService.processRecord`: LOW risk, 3 impacted symbols, 1 direct dependant. The change is localized but protects canonical offline sync attempt state.
- `mapSmsDispatchResult`: HIGH risk, 4 impacted symbols, 1 direct dependant. This worker result mapper affects SMS retry/terminal state and historical reporting evidence. Treat implementation as high-risk and require focused worker tests plus integration-level reporting checks.

No database migration is expected for `Redemption.rejectedAt` because the column already exists. SMS failure preservation can likely be achieved without schema change by no longer clearing `failedAt` on later `SENT`/`DELIVERED`/`SUPPRESSED` updates; if implementation proves that multiple historical failure attempts must be queryable, stop and create a separate migration proposal for append-only SMS delivery attempts.

## Rollout / Verification

The final implementation MUST pass locally and in GitHub CI on one immutable SHA:

- targeted unit tests for report snapshots, materializer behavior, outbox worker SMS updates, and offline replay ownership;
- targeted integration tests for offline receipt-boundary races, report materialization history, and report-refresh outbox lifecycle;
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run architecture:check`;
- `npm run test -- --runInBand`, `npm run test:coverage:critical`, `npm run test:integration`, and `npm run test:e2e`;
- `npm run openapi:lint`, `npm run openapi:diff`, `npm run client:generate`, `npm run client:typecheck`;
- `npm run openspec:validate`, `npm run verify:release-artifacts`, `npm run validate:scope`;
- Bruno journeys if the runtime app is started for final release validation.

## Open Questions

1. Is preserving only the most recent `failedAt` sufficient for Sprint 4 SMS state-at-watermark, or do stakeholders require complete per-attempt SMS history before Sprint 5?
2. Should `docs/sprint-4-final-gate-evidence.md` be amended in-place after implementation, or should a new Review 43 evidence document be created to avoid obscuring prior claims?
3. Should older Sprint 4 trackers be reconciled by marking superseded tasks explicitly, or archived once this closure change is complete?
