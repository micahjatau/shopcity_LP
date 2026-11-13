## 1. Specification

- [x] 1.1 Capture the seven shared routes, visual-only scope, and Admin behavior constraints.
- [x] 1.2 Run and record GitNexus impact for all planned Admin route surfaces.

## 2. Implementation

- [x] 2.1 Audit paired Admin/Supervisor route chrome and record exact shared styles to reuse.
- [x] 2.2 Align Admin Overview header, metrics, chart surfaces, activity, and responsive treatment while retaining Admin data/freshness behavior.
- [x] 2.3 Align Admin Transactions page chrome and table/control surfaces while retaining transaction detail and compensating reversal behavior.
- [x] 2.4 Align Admin Approvals and Fraud presentation while retaining Admin filters, decisions, and scope.
- [x] 2.5 Align Admin Cards page chrome and workspace presentation while retaining management actions.
- [x] 2.6 Verify Admin Reports presentation parity while retaining the Admin audience and report scope.
- [x] 2.7 Add focused role-behavior and visual parity regression coverage.
- [x] 2.8 Use the Supervisor customer directory presentation for Admin Customers, with Admin-specific register/profile destinations.
- [x] 2.9 Use the Supervisor profile presentation for Admin customer profiles while preserving Admin profile edits, status confirmation, and linked-card management.
- [x] 2.10 Use the Supervisor approval split-pane presentation for Admin Approvals while retaining Admin query parameters, filters, decision reasons/notes, and authorization.
- [x] 2.11 Replicate the Supervisor issued-card directory and assignment dialog in Admin Cards with Admin-specific return and customer-profile destinations.
- [x] 2.12 Route Admin “View card” links to the Admin customer profile's Virtual Card tab and preserve verified replacement/status management there.
- [x] 2.13 Compact the shared Supervisor/Admin Manage customer card dialog; put its close icon at the top-right and align status-appropriate actions directly beneath the header without changing verification or lifecycle behavior.

## 3. Verification

- [x] 3.1 Run focused Admin/Supervisor Jest suites, web typecheck, isolated lint, Prettier, and strict OpenSpec validation.
- [x] 3.2 Run paired Playwright checks at desktop and narrow viewport for representative routes/states; verify Admin-specific actions remain.
- [x] 3.3 Run `git diff --check` and document any unverified visual state or residual deviation. Playwright verifies the Admin directory and profile layouts, Admin registration/profile/card routes, Admin status confirmation, and all Admin common routes plus the profile at 1440px, 768px, and 375px.
- [x] 3.4 Verify the Admin approvals presentation, request scope, reason/note actions, and responsive split-pane at desktop, tablet, and mobile widths. Jest verifies Admin query parameters, filters, decision preset reasons, optional notes, and no Supervisor-only metric requests or links. Playwright verifies shared header typography, the split-pane, two columns at 1440px, one column at 768px/375px, and no horizontal overflow.
- [x] 3.5 Verify Admin issued-card listing, Admin profile destinations, assignment dialog routing, and verified card lifecycle actions; compare desktop, tablet, and mobile behavior. Jest verifies Admin links, deep-linked assignment reset to `/admin/cards`, Admin profile Virtual Card selection, and existing verified lifecycle controls (95 focused tests passed). Playwright verifies the Admin issued-card table, Admin profile link/tab, shared header typography, and responsive layout/no horizontal overflow at 1440px, 768px, and 375px. Build, typecheck, lint on edited source, Prettier, strict OpenSpec validation, and `git diff --check` passed.
- [x] 3.6 Verify the compact Manage customer card dialog for Supervisor and Admin at desktop and mobile widths; confirm top-right close placement, action order/alignment, accessible close naming, and unchanged verified lifecycle controls. Focused Jest passed (29 tests); Playwright passed for Supervisor and Admin at 1440px and 390px, asserting compact width, top-right close geometry, aligned Block/Replace actions, and no horizontal overflow. Web typecheck/build and strict OpenSpec validation passed. `CustomerDetailsDialog` lint passed; `SupervisorCardManagement` retains three pre-existing `no-misused-promises` errors in untouched async handlers, reproduced against HEAD.
