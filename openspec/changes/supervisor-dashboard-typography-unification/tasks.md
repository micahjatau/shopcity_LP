## 0. Baseline and scope

- [x] 0.1 Recorded `workflow-states-implementation` (four commits ahead of origin) with pre-existing tracked and untracked work; preserve it and do not commit/reset.
- [x] 0.2 Confirmed Supervisor route roots are `.supervisor-page`, `.supervisor-reports-page`, and the existing page-specific customer-profile root; presentation is owned by the Supervisor route stylesheets.
- [x] 0.3 GitNexus reports `AppShellContent` LOW (3 impacted symbols). `Button` lookup is ambiguous and includes a CRITICAL 80-dependent candidate; no shared Button/AppShell logic changes planned.

## 1. Apply the shared type hierarchy

- [x] 1.1 Use the customer-profile rem typography tokens for Supervisor route titles, sections, body/value text, labels, and metadata.
- [x] 1.2 Override conflicting prototype type and compact one-off metadata sizes with scoped profile tokens without changing geometry or colors.
- [x] 1.3 Keep report styles and the already-styled customer profile isolated to their route roots.
- [x] 1.4 Assert computed typography across Supervisor routes and confirm Admin/Cashier presentation stays outside the scoped rules.

## 2. Verify

- [x] 2.1 Run token generation/check and design-system tests.
- [x] 2.2 Run focused Supervisor route tests and Playwright visual/overflow checks at desktop, tablet, and mobile widths.
- [x] 2.3 Verify representative Admin/Cashier route typography and shared workspace defaults are unchanged.
- [x] 2.4 Run web typecheck, lint, formatting, `git diff --check`, and strict OpenSpec validation.
- [x] 2.5 Review the scoped diff, preserve unrelated dirty/untracked work, and leave all work uncommitted.
