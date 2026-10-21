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
- [x] 3.6 Extend the existing cashier-today contract with scoped customer name and purchase amount projections; regenerate OpenAPI/client artifacts and test the six-column Recent Transactions table with supported and missing values.
- [x] 3.7 Apply the Supervisor Overview's typography, spacing, card, action, search, table, and responsive styling to Cashier Overview without changing cashier content or data scope.
- [x] 3.8 Match the Cashier Overview search field to the Supervisor customer-table search control while preserving live local filtering.

## 4. Adapt Find Customer and reusable discovery presentation

- [x] 4.1 Implement the compact approximately 712px search panel with aligned name/phone/card input, Search, and Scan controls using the shared search component.
- [x] 4.2 Implement responsive stacking and preserve icon alignment, field height, target size, focus/error treatment, and stable layout during loading.
- [x] 4.3 Align discovered-customer result cards, empty results, failed search, offline, and stale-response states without implying authoritative card verification.
- [x] 4.4 Preserve exact card lookup, Cashier-safe masking, tenant/branch scope, authorization, 404/error contract, keyboard selection, Escape, focus restoration, and deep-link handoff.
- [x] 4.5 Add desktop/tablet/mobile/reduced-motion route evidence and verify that layout does not depend on search success.
- [x] 4.6 Merge the search and recent-results card surfaces into one route-scoped discovery card without changing lookup behavior or other workflow consumers.
- [x] 4.7 Load up to ten latest cashier-visible customer records into a table with name, masked phone, card status, available balance, and a profile action; keep customer IDs internal for profile routing rather than displaying them.
- [x] 4.8 Match topbar customer-search behavior with debounced table results and add local-phone normalization against stored E.164 numbers without exposing unmasked phone data.
- [x] 4.9 Authorize the existing Cashier profile route as a Find Customer alias without adding a sidebar item; add Capture Purchase and Redeem Credit actions that preserve exact-card verification and existing financial safeguards.
- [x] 4.10 Test recent-list loading, live name/international/local-phone search, profile routing, empty/error states, and protected Earn/Redeem verification.
- [x] 4.11 Move the recent-customer heading above search, remove static guidance and the idle prompt, match Overview search/button/header styling, and expand the table to full content width without a Customer ID column.
- [x] 4.12 Color-code card-status and available-balance values with semantic states for active, pending, inactive, positive, zero, negative, and unavailable values.
- [x] 4.13 Reuse the Supervisor profile presentation for Cashier profiles while verifying cashier summary identity, masking phone data, using only authorized customer/ledger APIs, and omitting Supervisor-only controls.
- [x] 4.14 Add Cashier profile tests for same-page structure, unavailable-data honesty, no profile-projection request, read-only controls, and exact-card workflow handoff.
- [x] 4.15 Add a cashier-scoped customer filter to cashier-today and render the latest three rows in the shared Supervisor transaction table on the Cashier profile.
- [x] 4.16 Refine Cashier profile cards, concise virtual-card presentation, single transaction outcome badge, Consent-tab omission, and branch-scoped wallet-ledger authorization.
- [x] 4.17 Replace monthly transaction placeholder with authoritative monthly earned-credit total and verify card number rendering.
- [x] 4.18 Remove the Cashier Redemptions tab because Wallet Ledger captures both earn and redemption entries; revert profile typography changes and enlarge virtual-card text.
- [x] 4.19 Populate Cashier Overview activity and calculated metrics, remove the Cashier credit-expiry card, and expose only cashier-safe masked email, card number, and birthday-month details.

## 5. Adapt Capture Purchase

- [x] 5.1 Recompose Capture Purchase around an approximately 860px stable flow panel and shared step indicator.
- [x] 5.2 Align Find customer, Confirm customer, Receipt details, Review/confirm, Back, Continue, and success-state geometry to the prototype references.
- [x] 5.3 Keep the outer panel alignment and dimensions stable as inner workflow stages change; preserve accessible stage announcements and focus targets.
- [x] 5.4 Preserve receipt validation, integer-kobo/money grammar, idempotency, approval, offline, error, retry, card verification, and financial gating behavior.
- [x] 5.5 Add paired workflow tests for lookup-to-confirmation-to-review-to-success and regression tests for protected transitions, without changing controller/API authority.
- [x] 5.6 Keep the existing shared confirmation presentation for Redeem; for Capture Purchase step 2 only, remove the `Step 2` kicker and earn-eligibility row, show cashier-safe details and wallet balance, use the profile virtual-card artwork, and keep Back/Proceed transitions unchanged.
- [x] 5.7 Match the Find customer recent-captures heading typography to Confirm customer, color-code capture amounts by outcome, and use clear empty-search wording without changing lookup behavior.
- [x] 5.8 Redesign only Capture Purchase's Confirm customer card with responsive customer-first hierarchy, semantic details/status/balance, unchanged card artwork, read-back note, and accessible footer actions; verify six target viewport widths and exact masked-phone display.
- [x] 5.9 Match Capture Purchase Step 1 to Figma node `408:513` with scoped search/list geometry, copy, icons, and controls while preserving API-backed activity, privacy, card verification, and shared Lookup/Redeem presentation. Verified with targeted Jest and Playwright coverage, computed geometry checks, mobile overflow, and unchanged Redeem lookup defaults.
- [x] 5.10 Map documented Earn 400 responses to actionable messages, surface unknown error codes for support, and verify server rejections are not queued as offline earns. Verified by six targeted 400-response cases in the transaction-form suite.
- [x] 5.11 Update only Capture Purchase Step 2 to Figma node `412:2478`, including the dynamic light card preview and accessible card-serial copy action; preserve cashier-safe data, Earn workflow transitions, and Lookup/Redeem presentation. Verified at six POS/mobile viewport widths, with serial-copy coverage, relevant Jest suites, typecheck, design-system check, and strict OpenSpec validation.
- [x] 5.12 Replace the Step 2 placeholder artwork with the existing customer-profile virtual-card presentation and external status text; preserve dynamic cashier-safe identity and Earn-only scope. Verified with targeted Cashier/profile Jest specs, six-viewport Playwright coverage, the Earn/Redeem workflow Playwright test, typecheck, lint, design-system checks, and strict OpenSpec validation.
- [x] 5.13 Show Step 4 Balance before from the verified current wallet balance and calculate Estimated new balance as current balance plus expected earn; retain integer-kobo safety, advisory labeling, and Earn-only scope. Verified with `transaction-forms.spec.tsx` (22 tests) and authoritative workflow assertions for the ₦55.00 balance before, ₦0.20 estimate, and ₦55.20 projection without submitting an Earn.
- [x] 5.14 Match the confirmed Earn result card to Figma nodes `413:4294` and `413:4348`, using backend-confirmed values, authenticated cashier context, existing workflow actions, and an accessible copy affordance. Display the server-policy rate (TRD default 200 bps / 2%) and use authoritative `purchaseAmountKobo` for receipt and eligible amounts because the API has no separate item-level eligible amount. Verified with transaction-form Jest and the focused success-result Playwright test.
- [x] 5.15 Mark the final Review step complete only after a confirmed Earn response; preserve pending/error semantics and verify Earn-only scope. Verified with confirmed-stepper browser coverage and pending-state transaction-form coverage.

## 6. Adapt Redeem Credit

- [x] 6.1 Implement the intentional approximately 720px Redeem flow-panel variant using the shared Capture Purchase visual system.
- [x] 6.2 Align lookup, basket subtotal, redemption amount, confirmation summary, remaining balance, and result presentation.
- [x] 6.3 Implement the two-column desktop credit summary and one-column smaller-viewport behavior with accessible reading order.
- [x] 6.4 Preserve available-credit checks, integer-kobo money handling, approval requirements, idempotency, offline/error states, and authoritative verified-card gating.
- [x] 6.5 Add paired style/workflow evidence proving shared lookup geometry and no regression across all Redeem transitions.
- [x] 6.6 Refine shared Earn/Redeem lookup copy and placeholder, style the 22px bold lookup heading, size the left-aligned Capture Purchase progress bar to 712px by 44px with 16px gaps/padding and a 16px radius, keep stage labels single-line, animate transitions, and style Search with the sidebar gradient/icon.
- [x] 6.7 Match Redeem Find customer and journey bar to Capture Purchase; remove the redundant customer-confirmation stage after exact card verification and make basket subtotal the next stage. Redeem now reuses `VerifiedCardLookupStep` with `captureLayout` and the Capture progress-step variant, then opens basket subtotal directly after active-card verification.
- [x] 6.8 Recompose Redeem basket, redemption amount, confirmation, and success/approval states to the supplied Figma frames with responsive, accessible layout and server-confirmed values only. Redeem-local card preview, policy breakdown, review/submit, backend-driven success/pending receipt, and responsive styles are covered by five route snapshots and focused browser/Jest tests.
- [x] 6.9 Preserve existing policy limits, integer-kobo handling, idempotency, approval, offline/error, and exact-card gating. Do not simulate Figma's OTP/demo/resend behavior without a backend OTP contract; record the intentional deviation and add regression tests. The current API has no OTP issuance/verification/resend contract; the UI uses an explicit authoritative review-and-confirm step and leaves pending approvals visibly pending.

## 7. Adapt Transactions and detail dialog

- [x] 7.1 Recompose Transactions with title/supporting copy, refresh action, receipt/ID search, status/operation filters, bounded table, result count, and activity-scope messaging.
- [x] 7.2 Align table headings, rows, dividers, status controls, empty/loading/error states, and narrow-viewport horizontal scrolling without application-wide overflow.
- [x] 7.3 Implement the approximately 600px detail dialog and two-column internal composition where supported, with backdrop, close, focus trap, Escape, and focus return.
- [x] 7.4 Render only supported customer, receipt, amount, credit, status, and evidence/history fields; explicitly omit or label unavailable data instead of inventing it.
- [x] 7.5 Add responsive, accessibility, masking, bounded-list, and truthful-data tests for list and detail states.
- [x] 7.6 Refine the Cashier Transactions table and detail dialog to Figma file `7ijCPWMSg7W3PIK1wewgaN` nodes `411:958` and `411:1943`. Use only the existing cashier-authorized report and transaction-detail fields; keep unsupported staff filtering, eligibility amounts, cashback-rate claims, receipt imagery, and fabricated audit events out of the UI. Completed with the existing cashier-scoped report/detail APIs and documented in `evidence.md`.
- [x] 7.7 Add focused table/dialog regression coverage for field mapping, filters, responsive geometry, modal keyboard/focus behavior, and truthful unsupported-data copy; review snapshots against both Figma frames before updating them. Focused Jest and Playwright coverage passed; desktop snapshots were reviewed and intentionally updated.

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
- [ ] 11.6 Apply the sidebar-aligned gradient to all Cashier primary buttons and links through one Cashier-scoped style owner; preserve neutral secondary/disabled states and verify computed styles across Cashier routes without changing Admin/Supervisor presentation.
