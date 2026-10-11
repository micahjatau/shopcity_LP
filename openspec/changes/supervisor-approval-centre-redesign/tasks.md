# Tasks

- [x] Add a Supervisor-only approvals presentation variant without changing Admin defaults or API behavior.
- [x] Implement the Figma-aligned header, category tabs, compact queue controls, two-panel layout, queue rows, detail/decision states, and responsive/focus styling.
- [x] Add focused tests for category classification/page-local counts, row selection, controls, decision submission, and empty/decided states.
- [x] Run typecheck, focused Jest, lint/format checks, relevant browser verification at target widths, and GitNexus change detection.
- [x] Review generated diff and record API category/count limitations and placeholder copy in the handoff.

## Selected-state update

- [x] Auto-select pending requests and select the next pending item after a successful decision.
- [x] Add the revised evidence grid, missing-field fallbacks, submitted-reason callout, required textarea, and customer link.
- [x] Apply selected-row tint, fixed equal-height cards, internal detail scrolling, and three decision/customer actions.
- [x] Extend focused tests and rerun typecheck, lint, Semgrep, unit/browser tests, OpenSpec validation, and GitNexus change detection.
- [x] Review final diff and report unavailable API fields and design conflicts.
- [x] Limit Supervisor categories to High-value transaction and Late receipt claim; exclude Manual adjustment and OTP override.
- [x] Define late receipt claims as submitted more than seven days after receipt occurrence in the TRD and OpenSpec.
- [x] Persist >7-day earn claims as pending `LATE_RECEIPT_CLAIM` approvals without a financial effect before decision.
- [x] Extend the approvals API with typed category filtering before cursor pagination and exact scoped per-category counts.
- [x] Regenerate OpenAPI and web client artifacts, then wire Supervisor tabs/counts to server responses.
- [x] Add backend unit, HTTP/contract, and integration coverage for late claims, category filtering/counts, and authorization scope.

## Cashier occurrence timestamp

- [x] Require a valid Occurred at value in the Earn form and prevent empty/invalid timestamps from reaching review or submission.
- [x] Add focused form tests for the required field and empty-value guard.

## Category-specific list columns and dropdowns

- [x] Include receipt occurrence time in approval list response and generated API contract.
- [x] Show Name and Amount for high-value approvals; show Name and Receipt Age for late claims.
- [x] Match status/page-size dropdown menus to the Cards table menu with accessible keyboard behavior.
- [x] Add/extend focused API, menu, and category-column tests.
