## Why

`docs/repo_review_44.md` upgrades Sprint 4 to 94/100 and explicitly recommends moving to Sprint 5, but it also leaves four cleanup items open before Sprint 4 can be called fully certified:

1. prove `report.refresh` recovery excludes already completed and dead-lettered events;
2. strengthen concurrent same-receipt tests so the losing request returns a recognized duplicate/conflict outcome, not just “no double-credit” database counts;
3. replace `_pending final commit and CI run_` with one immutable release SHA;
4. push that exact SHA and record a green GitHub Actions run for the required gates.

At this point the remaining work is not a new implementation cycle. It is acceptance-evidence tightening and release-certification closure for the current Sprint 4 head.

## What Changes

- Add explicit recovery exclusion regression coverage for `report.refresh` events that are already terminal (`processedAt` set or `deadLetteredAt` set).
- Strengthen online↔offline and offline↔offline same-receipt race tests to assert the losing path is an expected duplicate/conflict/retry-safe outcome.
- Update Sprint 4 release evidence and OpenSpec trackers so they cite one certified commit SHA instead of a placeholder.
- Record the GitHub Actions run URL and green status for Static Checks, Integration Tests, End-to-End Tests, and GitNexus on that exact SHA.

## Out of Scope

- New Sprint 5 functionality.
- Reopening historical reporting, SMS reconstruction, offline replay ownership, fraud, or report materialization design that Review 44 already considers closed.
- Schema changes or migrations unless a hidden defect is discovered while adding the explicit recovery exclusion test.
- Broad refactors of the earn/offline/outbox paths unrelated to the remaining four certification gaps.

## Capabilities

### New Capabilities

- `report-refresh-terminal-recovery-evidence`: terminal `report.refresh` events are explicitly proven in tests to stay out of recovery.
- `receipt-race-loser-outcome-evidence`: same-receipt concurrency tests prove both exactly-one financial effect and deterministic loser classification.
- `sprint-4-release-certification`: Sprint 4 evidence names one immutable SHA and one green GitHub CI run.

### Modified Capabilities

- `release-evidence-review-43-closure`: advances from local validation plus pending placeholders to immutable release certification.
- `offline-review-43-closure`: expands receipt-race evidence from count-only invariants to domain-level loser outcomes.

## Impact

Proposal-time GitNexus impact analysis was recorded in `docs/development/gitnexus-impact-tracker.md`.

- `OutboxWorkerRuntime`: MEDIUM risk, 8 impacted symbols, 6 direct dependants. Recovery filtering changes or test-backed assumptions affect worker bootstrap and background recovery paths.
- `OfflineSyncService`: LOW risk, 5 impacted symbols, 3 direct dependants. Same-receipt loser-outcome tightening is localized but must preserve canonical offline replay semantics.
- `LoyaltyService`: MEDIUM risk, 20 impacted symbols, 12 direct dependants. Concurrent online/offline receipt outcome assertions still touch the shared earn path and duplicate/conflict mapping.

No HIGH or CRITICAL proposal-time findings were returned for the Review 44 remaining-gap scope.

## Rollout / Verification

The closure implementation must validate on a single immutable SHA:

- focused unit/integration coverage for `report.refresh` terminal exclusion and same-receipt loser outcomes;
- `npm run openspec:validate` after artifact creation and again after any proposal-scope edits;
- update `docs/sprint-4-final-gate-evidence.md` with the final SHA, validation date, local command set, and GitHub Actions URL;
- verify GitHub Actions are green for Static Checks, Integration Tests, End-to-End Tests, and GitNexus on the same SHA named in the evidence doc.

## Open Questions

1. Should dead-letter exclusion be proven in the existing `test/outbox-worker-recovery.int-spec.ts` flow, or in a smaller worker/runtime-level regression that directly inspects recovery eligibility?
2. Which exact duplicate/conflict outcome is the canonical loser result for each race shape today: duplicate receipt, replayed canonical success, or retry-safe processing response?
3. Should Sprint 4 be archived immediately after CI certification, or should the branch keep the Review 44 change open until Sprint 5 kickoff artifacts exist?
