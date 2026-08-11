## 1. Fraud closure

- [x] Add durable fraud evaluation work for qualifying earn and redemption flows.
- [x] Make fraud worker processing terminal and replay-safe.
- [x] Persist duplicate-attempt evidence when receipt uniqueness rejects a duplicate.
- [x] Implement deterministic behavioral fraud rule evaluation from authoritative rows.
- [x] Add integration coverage for fraud replay, duplicate races, and approval-required transactions.

## 2. Historical reporting correctness

- [x] Reconstruct reporting snapshots from as-of authoritative source evidence.
- [x] Ensure customer performance counts confirmed financial activity only.
- [x] Protect same-tenant report materialization from concurrency corruption or duplication.
- [x] Add unit and integration regression coverage for historical rebuilds.

## 3. Offline acceptance

- [x] Complete the offline earn conflict matrix and replay behavior.
- [x] Keep offline records earn-only and server-authoritative.
- [x] Persist offline sync attempts as evidence.
- [x] Add duplicate-receipt race coverage for offline/online boundaries.

## 4. Contracts and validation

- [x] Align OpenAPI, generated client, Bruno journeys, and OpenSpec artifacts.
- [x] Update reporting documentation and migration tracker evidence.
- [x] Run build, lint, typecheck, unit, integration, and E2E validation on the final SHA.
