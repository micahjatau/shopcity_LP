## 0. Baseline and scope

- [x] 0.1 Inventory all seven Supervisor routes and their shared workspace/panel consumers.
- [x] 0.2 Run proposal-time GitNexus impact for route and shared workspace symbols; record findings and HIGH/CRITICAL warnings.
- [x] 0.3 Preserve existing dirty/untracked changes and define role-isolated presentation boundaries.

## 1. Phase 1 — overview, approvals, fraud, and reports

- [x] 1.1 Add Supervisor-scoped typography/layout ownership using existing Cashier header, body, card, and semantic design tokens.
- [x] 1.2 Standardize `/supervisor` title/description hierarchy and clarify review-lane copy without changing route destinations or overview panels.
- [x] 1.3 Standardize `/supervisor/approvals` and `/supervisor/fraud` page headers and copy while preserving all decision/evidence controls and truth boundaries.
- [x] 1.4 Standardize `/supervisor/reports` page hierarchy/copy while preserving report/filter/freshness/export meanings.
- [x] 1.5 Add phase-focused route assertions; verify no business behavior changed.

## 2. Phase 2 — customers, cards, and transactions

- [x] 2.1 Standardize `/supervisor/customers` and `/supervisor/cards` title/body hierarchy and distinguish their route purposes.
- [x] 2.2 Standardize `/supervisor/transactions` title/body hierarchy and preserve compensating-reversal semantics.
- [x] 2.3 If shared workspace changes are needed, add an explicit Supervisor-only presentation variant; keep Admin/Cashier defaults intact.
- [x] 2.4 Regress Admin shared-workspace defaults and verify the Cashier customer-route redirect remains unchanged.

## 3. Phase 3 — full-route verification

- [x] 3.1 Verify all seven Supervisor routes use computed header typography matching `/cashier/lookup` and have a single H1 with subordinate headings/body.
- [x] 3.2 Verify all seven routes at 1440px, 768px, and 375px with no document-level horizontal overflow.
- [x] 3.3 Run focused Playwright workflows, web typecheck/lint, formatting, `git diff --check`, and strict OpenSpec validation.
- [x] 3.4 Review final diff and preserve every unrelated pre-existing modification/untracked file; do not commit or push unless explicitly requested.
