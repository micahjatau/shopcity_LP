# Implementation tasks

## 1. Baseline and contract freeze

- [ ] 1.1 Record the current branch, candidate SHA, dirty-tree inventory, latest CI status, and existing Review 76 evidence without staging or overwriting unrelated changes.
- [ ] 1.2 Inventory the prototype HTML, `figmaExport/` assets, Landing reference images, source bounds, font assumptions, and existing reference manifest; identify which references are direct, derived, crop-blocked, or unsupported.
- [x] 1.3 Run GitNexus impact analysis for the shell layout owner, page-heading owner, canonical card owner, `CashierWorkflowRoute`, `useCashierLookupController`, `VerifiedCardLookupStep`, transaction table/detail components, and Sync Queue route before implementation edits; record HIGH/CRITICAL findings and callers. The workflow-route test target was unindexed (`UNKNOWN`, zero indexed upstream symbols); direct browser/Jest coverage is retained.
- [x] 1.4 Document the shared visual contract using existing token/component owners. Include title/description typography, card, field, button, search, status, table, and dialog properties plus responsive exceptions.
- [x] 1.5 Add browser/computed-style assertions proving that canonical shared values are emitted consistently on all six Cashier routes, including focus, error, loading, reduced-motion, and dialog states. The bounded route/viewport conformance matrix passed.
- [x] 1.6 Add a contract regression fixture demonstrating that changing the canonical primary-button owner affects all six pages and that route CSS cannot create a competing appearance owner.

## 2. Align the application shell

- [x] 2.1 Measure the current shell against the prototype and implement the shared desktop geometry: 244px expanded sidebar, 76px collapsed sidebar, 64px topbar, 16/24/40px content padding, 1120px content maximum, 44px navigation-link minimum, 300px overview search maximum, and 16px major-card radius.
- [x] 2.2 Encode shell dimensions through existing tokens/classes/components rather than route-local inline styles or duplicated embedded CSS.
- [x] 2.3 Preserve and verify current mobile drawer behavior, scroll locking, focus entry/return, Escape handling, collapsed state, reduced motion, target sizes, and no horizontal overflow; document deviations from the legacy prototype sidebar.
- [x] 2.4 Normalize the shared page-heading block and navigation rhythm so all six routes share content alignment, title/description spacing, and action-row geometry while retaining active-route semantics.
- [ ] 2.5 Reserve approved navbar positions for search, notification, and avatar surfaces without claiming the deferred profile/notification contract from issue #45.
- [x] 2.6 Run shell role coverage for Cashier, Supervisor, and Admin, including search authorization, result masking, session/device status, keyboard navigation, stale responses, loading/empty/error states, and responsive viewports. The bounded route/viewport conformance matrix passed for the configured role route fixtures.

## 3. Adapt Overview as the layout baseline

- [x] 3.1 Recompose Overview around the shared page heading, welcome/description region, cashier quick actions, four equal metric cards, and Recent Transactions section.
- [x] 3.2 Align heading/action placement, page width, card dimensions, equal heights, inter-section spacing, table geometry, and View-all action to the prototype reference.
- [x] 3.3 Implement desktop, tablet, and mobile metric-card rearrangement without changing bounded activity data, masking, or transaction semantics.
- [x] 3.4 Add stable Overview fixtures and route assertions for required landmarks, no overflow, keyboard/focus behavior, reduced motion, and supported empty/loading/error states.
- [x] 3.5 Capture the first approved shell-and-Overview comparison as the spatial baseline for the remaining routes.

## 4. Adapt Find Customer and reusable discovery presentation

- [x] 4.1 Implement the compact approximately 712px search panel with aligned name/phone/card input, Search, and Scan controls using the shared search component.
- [x] 4.2 Implement responsive stacking and preserve icon alignment, field height, target size, focus/error treatment, and stable layout during loading.
- [x] 4.3 Align discovered-customer result cards, empty results, failed search, offline, and stale-response states without implying authoritative card verification.
- [x] 4.4 Preserve exact card lookup, Cashier-safe masking, tenant/branch scope, authorization, 404/error contract, keyboard selection, Escape, focus restoration, and deep-link handoff.
- [x] 4.5 Add desktop/tablet/mobile/reduced-motion route evidence and verify that layout does not depend on search success.

## 5. Adapt Capture Purchase

- [x] 5.1 Recompose Capture Purchase around an approximately 860px stable flow panel and shared step indicator.
- [x] 5.2 Align Find customer, Confirm customer, Receipt details, Review/confirm, Back, Continue, and success-state geometry to the prototype references.
- [x] 5.3 Keep the outer panel alignment and dimensions stable as inner workflow stages change; preserve accessible stage announcements and focus targets.
- [x] 5.4 Preserve receipt validation, integer-kobo/money grammar, idempotency, approval, offline, error, retry, card verification, and financial gating behavior.
- [x] 5.5 Add paired workflow tests for lookup-to-confirmation-to-review-to-success and regression tests for protected transitions, without changing controller/API authority.

## 6. Adapt Redeem Credit

- [x] 6.1 Implement the intentional approximately 720px Redeem flow-panel variant using the shared Capture Purchase visual system.
- [x] 6.2 Align lookup, basket subtotal, redemption amount, confirmation summary, remaining balance, and result presentation.
- [x] 6.3 Implement the two-column desktop credit summary and one-column smaller-viewport behavior with accessible reading order.
- [x] 6.4 Preserve available-credit checks, integer-kobo money handling, approval requirements, idempotency, offline/error states, and authoritative verified-card gating.
- [x] 6.5 Add paired style/workflow evidence proving shared lookup geometry and no regression across all Redeem transitions.

## 7. Adapt Transactions and detail dialog

- [x] 7.1 Recompose Transactions with title/supporting copy, refresh action, receipt/ID search, status/operation filters, bounded table, result count, and activity-scope messaging.
- [x] 7.2 Align table headings, rows, dividers, status controls, empty/loading/error states, and narrow-viewport horizontal scrolling without application-wide overflow.
- [x] 7.3 Implement the approximately 600px detail dialog and two-column internal composition where supported, with backdrop, close, focus trap, Escape, and focus return.
- [x] 7.4 Render only supported customer, receipt, amount, credit, status, and evidence/history fields; explicitly omit or label unavailable data instead of inventing it.
- [x] 7.5 Add responsive, accessibility, masking, bounded-list, and truthful-data tests for list and detail states.

## 8. Compose Sync Queue

- [x] 8.1 Define the derived Sync Queue layout using Transactions table/status language and document why it has no direct approved Figma reference.
- [x] 8.2 Add waiting, syncing, needs-attention, and synced status presentation plus search/status filtering using canonical status and table components.
- [x] 8.3 Make cashier attention the primary hierarchy: receipt/card/amount/status/action table, with technical record details in a secondary panel, dialog, or disclosure.
- [x] 8.4 Preserve queue storage, batching, retry, confirmation safeguards, offline semantics, server-result interpretation, and truthful state labels.
- [x] 8.5 Add responsive table/disclosure, keyboard/focus, empty/loading/error, and no-overflow tests.

## 9. Deterministic visual comparison and responsive acceptance

- [ ] 9.1 Implement or complete the Figma-to-React runner with deterministic viewport, font, data, route, and state setup; fail closed for unknown source bounds or font identity.
- [ ] 9.2 Extend the reference manifest for the shell and six routes, mapping required states and approved desktop/tablet/mobile viewports to assets or explicitly derived references.
- [ ] 9.3 Produce separate structure, geometry, computed-style, interaction/accessibility, responsive, React-snapshot, and Figma-pixel reports.
- [ ] 9.4 Apply the 1% differing-pixel target only to valid aligned font-matched Figma references; retain the existing React snapshot threshold as a separate signal.
- [x] 9.5 Record intentional deviations, unsupported states, crop/font blockers, tolerance values, candidate SHA, source references, screenshots, and report paths; never update baselines blindly.
- [ ] 9.6 Run the full six-route desktop/tablet/mobile and reduced-motion matrix at 1024px and 390px, plus approved shell role consumers.

## 10. Isolated staging certification

- [ ] 10.1 Provision or select an operator-approved disposable staging tenant/branch, role accounts, cards, device, deployment lineage, and secret configuration; document handling without committing secrets.
- [ ] 10.2 Run customer name/phone search and exact card verification with role authorization, masking, branch scope, deep-link, keyboard, and error assertions.
- [ ] 10.3 Run Capture Purchase through successful, approval, offline/error, retry, and financial-gating paths without production mutation.
- [ ] 10.4 Run Redeem through successful, approval, offline/error, retry, balance, and financial-gating paths without production mutation.
- [ ] 10.5 Reconcile and clean up all disposable fixtures; record candidate SHA, environment, deployed backend/frontend SHAs, fixture reconciliation, reports/screenshots, residual risks, and rollback path.
- [x] 10.6 If staging credentials, deployment lineage, or reconciliation are unavailable, fail closed and record the infrastructure blocker rather than substituting local or fabricated evidence.

## 11. Final verification and handoff

- [ ] 11.1 Run ownership checker, formatting, lint, backend/frontend typecheck, Jest/unit, accessibility, route conformance, visual comparison, build, integration, and Semgrep/security gates.
- [ ] 11.2 Run affected Playwright workflows for shell, all six routes, role consumers, responsive states, keyboard/focus, reduced motion, and protected workflow outcomes.
- [ ] 11.3 Run GitNexus `detect_changes()` and inspect the affected symbols/processes against the expected layout-only surface; refresh the index if required.
- [ ] 11.4 Validate this OpenSpec change and map every acceptance criterion to passing evidence, accepted deviation, or explicit environmental blocker.
- [ ] 11.5 Publish final evidence with candidate revision, reference/source lineage, visual reports, staging results, accepted deviations, residual risks, and rollback/branch-reconciliation instructions.
