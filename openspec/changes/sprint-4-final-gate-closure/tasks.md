> Review 43 follow-up: historical reporting, SMS reconstruction, offline replay ownership, receipt-race evidence, and report-refresh integration items are superseded and finalized by `openspec/changes/sprint-4-review-43-closure/`. Keep this tracker as the pre-Review-43 closure record; do not use its checked reporting/offline items alone as final Sprint 4 evidence.

## 1. Scope and evidence

- [x] 1.1 Freeze the final-gate scope against the Sprint 4 plan and confirm the exact correctness gaps.
- [x] 1.2 Record the affected fraud, reporting, offline, outbox, contract, and evidence paths in the implementation notes.

## 2. Fraud closure

- [x] 2.1 Enqueue fraud evaluation for pending-approval earn and redemption flows.
- [x] 2.2 Make `fraud.evaluate` completion terminal and replay-safe so one logical occurrence increments at most once.
- [x] 2.3 Persist duplicate-attempt evidence in a committed path that survives both the pre-check path and the database uniqueness race.
- [x] 2.4 Collapse production and regression fraud evaluation onto one shared runtime.
- [x] 2.5 Implement all six Sprint 4 behavioral fraud rules in deterministic runtime code and tests.
- [x] 2.6 Normalize behavioral fraud dedupe/window keys to the actual branch-day boundary.
- [x] 2.7 Add regression coverage for approval-path fraud, replay safety, duplicate evidence, six-rule determinism, and branch-day windowing.

## 3. Reporting closure

- [x] 3.1 Add historical as-of snapshot reconstruction for lot, redemption, approval, and SMS state.
- [x] 3.2 Keep customer activity counts confirmed-only and reversal-aware.
- [x] 3.3 Apply one tenant-wide lock domain for tenant and branch materialization.
- [x] 3.4 Make report refresh durable instead of detached in-process scheduling.
- [x] 3.5 Add regression coverage for historical rebuilds, refresh durability, and immutable duplicate-attempt reporting.

## 4. Offline acceptance

- [x] 4.1 Preserve server-authoritative offline earn-only outcomes.
- [x] 4.2 Cover duplicate-receipt race behavior at the online/offline boundary.
- [x] 4.3 Preserve evidence for offline sync attempts and invalid actor/expiry/device/branch/card/staff rejections.

## 5. Contracts and release validation

- [x] 5.1 Verify OpenAPI, generated client, Bruno collections, and OpenSpec artifacts match runtime behavior.
- [x] 5.2 Run the targeted migration, unit, integration, HTTP/E2E, lint, typecheck, architecture, and build gates on the final SHA.
- [ ] 5.3 Capture the immutable release-candidate SHA and the commands used to verify it.
