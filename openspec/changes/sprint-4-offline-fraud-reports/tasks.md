## 1. Sprint 4 contracts and policy

- [ ] 1.1 Freeze the Sprint 4 scope in OpenSpec and align it with the repo's TRD and sprint plan.
- [ ] 1.2 Capture offline sync, fraud, reporting, and export policy/configuration boundaries.

## 2. Offline synchronization foundation

- [ ] 2.1 Define the offline earn batch contract and per-record conflict outcomes.
- [ ] 2.2 Reuse the canonical earn path for offline records.
- [ ] 2.3 Add offline sync persistence and replay-safe idempotency.
- [ ] 2.4 Cover concurrency and mixed-batch behavior in tests.

## 3. Fraud evidence and review

- [ ] 3.1 Add fraud flag persistence and deterministic rule evaluation.
- [ ] 3.2 Generalize asynchronous fraud evaluation in the outbox/worker path.
- [ ] 3.3 Add supervisor/admin review APIs with branch and tenant scope enforcement.

## 4. Reporting read models

- [ ] 4.1 Freeze report metric definitions before implementation.
- [ ] 4.2 Add derived reporting tables and materialization rules.
- [ ] 4.3 Implement report endpoints and source-vs-read-model reconciliation tests.

## 5. Exports and contract integration

- [ ] 5.1 Add CSV export and refresh flows with audit logging and masking.
- [ ] 5.2 Update OpenAPI, generated client, and Bruno journeys.
- [ ] 5.3 Validate the final Sprint 4 acceptance suite on one immutable SHA.
