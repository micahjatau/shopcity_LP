# Pilot Performance Baseline

## Scope

Use synthetic users, cards, receipts, and branches only. Never use production customer credentials or live receipt identifiers in k6 evidence.

## Core thresholds

- Card lookup p95: <= 500 ms
- Earn p95: <= 1200 ms
- Redeem p95: <= 1200 ms
- HTTP failure rate: < 1%
- Synthetic scenario failure rate: < 1%
- Post-load reconciliation mismatches: 0

## Required scenarios

1. Card lookup steady-state
2. Earn checkout steady-state
3. Redeem checkout steady-state
4. Report isolation alongside checkout traffic
5. Post-load pilot operations summary reconciliation check

## Evidence commands

- `k6 run scripts/performance/k6-pilot.js`
- `node scripts/performance/validate-k6-summary.mjs --summary tmp/k6-pilot-summary.json`
- `npx jest test/financial-state-invariants.int-spec.ts --config ./test/jest-int.json --runInBand`

## Notes

- Record release SHA and image digest alongside the k6 summary.
- Treat any reconciliation mismatch as a failed performance run even if latency thresholds pass.
- Capture any approved threshold exception explicitly in the release evidence.
