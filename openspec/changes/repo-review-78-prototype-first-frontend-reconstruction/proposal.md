# Change: Prototype-first frontend reconstruction after Review 78

## Why

`docs/repo_review_78.md` confirms that the frontend styling infrastructure has improved, but the production React pages still retain legacy composition instead of reproducing the approved HTML prototypes. Passing CSS, snapshot, and CI checks is therefore insufficient evidence of visual convergence.

The next phase must treat the committed prototypes as the presentation specification: preserve their visible DOM hierarchy, content regions, element order, form structure, button placement, card grouping, table composition, and dialog composition, while retaining authoritative production behavior underneath.

## What changes

- Establish a deployment/reference baseline for the revision, route, state, viewport, prototype source, and screenshot evidence.
- Reconstruct the shared operational navbar from the prototype topbar, including inline role-aware search categories, notification and avatar presentation, and removal of diagnostic session/device copy.
- Reconstruct Overview from `overview-dashboard.html` and its mapped Figma export before proceeding to other routes.
- Reconstruct Find Customer, Capture Purchase, Redeem Credit, and Transactions as prototype-faithful React presentation compositions around existing controllers.
- Assemble Sync Queue from the approved shared shell, toolbar, table, badges, buttons, and detail-dialog components rather than claiming a verbatim Figma adaptation.
- Add route/state/viewport, accessibility, responsive, functional, and prototype-comparison evidence for each slice.

## Scope boundaries

In scope: `apps/web` presentation JSX, shared shell/search components, Cashier route composition, prototype comparison evidence, conformance tests, accessibility checks, and related documentation.

Out of scope: backend financial calculations, ledger/history semantics, authentication/session authority, RBAC policy, API contracts, database schema, offline reconciliation semantics, queue processing semantics, and unrelated working-tree changes.

## Acceptance criteria

- The navbar is one shared component across operational routes, retains the working sidebar/drawer/RBAC, places the category pill beside the search input, and renders no session/device diagnostic copy in its presentation.
- Cashier search categories are Customers and Cards; Supervisor/Admin additionally have Cashiers, with authorization and masking preserved.
- Overview's heading, quick actions, activity metrics, recent-transactions table, and spacing match the approved prototype structure at the approved desktop viewport.
- Each subsequent route uses prototype-derived DOM hierarchy and stable `data-od-id` landmarks while preserving existing controller behavior and truthful loading, empty, error, success, and disabled states.
- Capture Purchase and Redeem use persistent guided flow panels with prototype-derived stage composition, shared lookup/form/status patterns, and intentional width differences.
- Transactions provides prototype-derived filters, table/footer, and two-column detail dialog while retaining bounded-history behavior.
- Sync Queue is explicitly documented as a derived composition.
- Every route has comparison evidence, responsive and keyboard/accessibility checks, approved deviations, and a documented reason for any production-required divergence.
- Existing backend, authorization, financial, generated-client, and offline safeguards remain unchanged and continue to pass their relevant tests.

## Delivery strategy

Implement and approve in slices: reference baseline, navbar, Overview, Find Customer, Capture/Redeem, Transactions, Sync Queue, then final visual and functional certification. Do not rebaseline screenshots or mark a route complete solely because existing tests pass.

## Impact

Primary surface: `apps/web` presentation components, styles, route tests, visual evidence, and OpenSpec documentation. GitNexus proposal analysis for `AppTopbar` found LOW risk, 3 impacted upstream symbols, 2 affected processes, and 1 affected module; shell and route-level visual changes still require broader browser evidence because CSS and DOM cascade effects exceed call-graph counts.
