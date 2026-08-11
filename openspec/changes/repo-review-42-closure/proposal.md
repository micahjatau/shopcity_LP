## Why

Review 42 shows Sprint 4 is still blocked by several correctness issues: duplicate-receipt fraud evidence is rolled back with the throwing transaction, ordinary high-value earn/redemption flows no longer produce fraud.evaluate work, fraud.evaluate can be replayed forever by recovery, reporting reads purchase values from the wrong source, and report materialization is not truly watermark-bounded. These are acceptance blockers, not polish.

## What Changes

- Persist duplicate-attempt fraud evidence in a committed path that survives the receipt-blocking exception.
- Emit fraud.evaluate for the normal high-value earn/redemption cases and give fraud events a terminal lifecycle so recovery does not replay them indefinitely.
- Correct reporting materialization to use authoritative receipt amounts for purchase value, keep credit-issued math reversal-aware, and constrain snapshots by asOf/watermark.
- Extend offline/report/fraud regression coverage for duplicate attempts, fraud recovery, watermark cutoff, and reversal-aware reporting.

## Capabilities

### New Capabilities

- `fraud-evidence-commitment`
- `fraud-evaluate-lifecycle`
- `reporting-watermark-integrity`
- `reporting-reversal-accuracy`
- `sprint-4-closure-evidence`

### Modified Capabilities

- `fraud-detection`
- `fraud-review`
- `reporting`
- `report-export`
- `outbox-recovery-resilience`

## Impact

Affected areas include `src/modules/fraud/`, `src/modules/reports/`, `src/jobs/`, Prisma schema/migrations if the fraud outbox lifecycle needs a terminal state, and the offline/fraud/report integration suites. Report totals and fraud occurrence counts may change after the correctness fixes, so the proposal should be treated as a closure pass with explicit regression evidence.
