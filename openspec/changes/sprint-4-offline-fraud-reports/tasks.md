## 1. Scope and evidence

- [ ] 1.1 Freeze the Sprint 4 hardening scope from review 41 and align it with the existing sprint-4 offline/fraud/report change.
- [ ] 1.2 Record the affected evidence paths for offline sync, fraud evaluation, and reporting correctness.

## 2. Offline replay integrity

- [ ] 2.1 Keep the canonical offline sync attempt immutable when a same-key request hash mismatch is detected.
- [ ] 2.2 Persist conflict evidence separately from the canonical success row.
- [ ] 2.3 Add a regression test for success → changed conflict → original replay returning the original success response and transaction linkage.

## 3. Fraud evidence and dispatch

- [ ] 3.1 Add append-only duplicate-attempt evidence for receipt uniqueness violations.
- [ ] 3.2 Use that evidence to create FR-DUP-001 and populate cashier `duplicateAttempts`.
- [ ] 3.3 Add a durable `fraud.evaluate` outbox path and stop relying on SMS recovery as the fraud dispatch primitive.
- [ ] 3.4 Add tests for duplicate-attempt evidence and durable fraud evaluation.

## 4. Reporting correctness

- [ ] 4.1 Derive confirmed purchase/transaction activity from authoritative financial state.
- [ ] 4.2 Exclude expired lots from active balance and liability ageing calculations.
- [ ] 4.3 Update reporting materialization so cashier summaries do not infer duplicates from committed rows.
- [ ] 4.4 Expose the missing cashier, redemption, SMS, and audit report endpoints.

## 5. Refresh and concurrency

- [ ] 5.1 Make manual report refresh durable instead of a detached in-process promise.
- [ ] 5.2 Add same-tenant materialization concurrency protection and regression coverage.
- [ ] 5.3 Extend CSV export coverage to any newly exposed report views.

## 6. Validation

- [ ] 6.1 Run the targeted offline, fraud, and reporting integration suites.
- [ ] 6.2 Update OpenAPI and supporting artifacts if the report surface changes.