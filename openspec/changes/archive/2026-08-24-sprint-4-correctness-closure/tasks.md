## 1. Scope and evidence

- [x] 1.1 Freeze the review 42 closure scope against the current Sprint 4 fraud/report/offline paths.
- [x] 1.2 Record the affected fraud runtime, outbox, reporting, refresh, and evidence paths in the implementation notes.

## 2. Fraud closure

- [x] 2.1 Enqueue fraud evaluation for pending-approval earn and redemption flows.
- [x] 2.2 Make fraud evaluation completion terminal and replay-safe in the worker path.
- [x] 2.3 Persist duplicate-attempt evidence in a committed path that survives the rejected capture.
- [x] 2.4 Collapse production and regression fraud evaluation onto one shared runtime.
- [x] 2.5 Normalize behavioral fraud dedupe/window keys to the actual branch-day boundary.
- [x] 2.6 Add regression coverage for approval-path fraud, replay safety, duplicate evidence, and behavioral windowing.

## 3. Reporting closure

- [x] 3.1 Derive report totals from authoritative as-of evidence instead of mutable current state where needed.
- [x] 3.2 Keep customer performance counts confirmed-only and reversal-aware.
- [x] 3.3 Apply a single tenant-wide lock for tenant and branch materialization.
- [x] 3.4 Make report refresh durable instead of detached in-process scheduling.
- [x] 3.5 Add regression coverage for historical rebuilds, refresh durability, and duplicate-attempt reporting.

## 4. Offline acceptance

- [x] 4.1 Preserve server-authoritative offline earn-only outcomes.
- [x] 4.2 Cover duplicate-receipt race behavior at the offline/online boundary.
- [x] 4.3 Preserve evidence for offline sync attempts and invalid actor/expiry rejections.

## 5. Validation and evidence closure

- [x] 5.1 Run the targeted fraud, reporting, offline, and integration suites.
- [x] 5.2 Update OpenSpec artifacts, docs, and tracker evidence to match the final implementation scope.
