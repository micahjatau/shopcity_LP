## Why

Sprint 4 is close, but the remaining gaps are correctness and evidence gaps: fraud evaluation still needs durable replay-safe processing, duplicate receipt evidence must survive uniqueness races, historical reporting must reconstruct as-of snapshots from authoritative financial state, and offline acceptance still needs the full conflict matrix plus contract alignment.

## What Changes

- Add durable fraud evaluation work for qualifying earn/redemption flows and make fraud processing terminal after success.
- Persist duplicate-attempt and other operational fraud evidence without weakening receipt uniqueness or confirmed ledger history.
- Add deterministic behavioral fraud rule evaluation from authoritative source rows.
- Rebuild reporting from historical snapshot evidence so as-of materialization and customer performance counts remain authoritative.
- Complete offline earn conflict handling, replay behavior, and evidence persistence.
- Keep OpenAPI, generated client, Bruno journeys, and OpenSpec artifacts aligned with runtime behavior.

## Impact

Affected areas include `src/modules/fraud/`, `src/jobs/outbox-worker.runtime.ts`, `src/modules/reports/`, offline sync modules and tests, Prisma schema/migrations, OpenAPI/client artifacts, and the Sprint 4 documentation/evidence tracker.

This change is a closure and hardening pass, not a financial redesign.
