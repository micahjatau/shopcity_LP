## Why

The Sprint 4 final-gate plan still leaves several release-blocking gaps: approval-path fraud work must be emitted for pending earn/redemption flows, each `fraud.evaluate` event must increment occurrence history at most once, duplicate-receipt evidence must survive both the normal pre-check path and the database uniqueness race, all six behavioral fraud rules must be implemented deterministically, historical reporting must reconstruct lot/redemption/approval/SMS state at `asOf`, customer performance must count confirmed financial activity only, same-tenant report rebuilds must stay isolated under concurrency, offline/online duplicate races must still produce exactly one financial effect, contracts must match runtime behavior, and the final SHA must pass the full validation gate set.

## What Changes

- Emit fraud evaluation evidence for pending-approval earn and redemption flows.
- Make `fraud.evaluate` processing terminal and replay-safe so one logical occurrence increments at most once.
- Preserve duplicate-receipt evidence through both the pre-check path and the database uniqueness race.
- Keep all six Sprint 4 behavioral fraud rules in one deterministic shared runtime with matching tests.
- Rebuild historical reports from authoritative as-of evidence for lot, redemption, approval, and SMS state.
- Keep customer performance counts confirmed-only and reversal-aware.
- Preserve tenant-wide reporting isolation so same-tenant rebuilds cannot corrupt or duplicate read models.
- Keep offline/online same-receipt and offline-concurrency duplicate races at exactly one financial effect.
- Sync OpenAPI/client/Bruno/OpenSpec artifacts to runtime behavior and record the final validation evidence.

## Capabilities

### New Capabilities

- `fraud-final-gate-closure`: approval-path fraud evaluation, exactly-once fraud occurrence processing, duplicate-evidence durability, shared behavioral runtime parity, and branch-day window normalization.
- `reporting-final-gate-closure`: historical as-of snapshots for lot/redemption/approval/SMS state, confirmed-only customer activity, tenant-wide materialization isolation, immutable duplicate-attempt reporting, and durable refresh handling.
- `offline-final-gate-regression`: server-authoritative offline decisions, offline/online duplicate-race coverage, and exactly-one financial effect across boundary cases.
- `release-evidence-alignment`: OpenAPI/client/Bruno/OpenSpec consistency plus final migration, test, lint, typecheck, architecture, and build validation evidence.

### Modified Capabilities

- `outbox-recovery-resilience`: recovery eligibility and terminal handling now include durable report refresh work and exactly-once fraud processing.
- `reporting-contract-closure`: historical read models must align with runtime output and immutable evidence.
- `release-evidence-alignment`: documentation, contract artifacts, and tracker records must match the validated final gate.

## Impact

The highest-risk change surfaces are branch-day fraud normalization and report materialization, followed by outbox recovery and offline duplicate-race handling. Expected blast radius is concentrated in `src/jobs/`, `src/modules/reports/`, `src/modules/fraud/`, `src/modules/offline-sync/`, OpenAPI/client/Bruno generation, and the OpenSpec/docs evidence trail. No ledger semantics change is intended; schema changes are not expected unless historical reconstruction proves they are required, in which case they should be treated as a separate review.
