# Tasks

## 1. Freeze the reference baseline

- [x] 1.1 Record current branch, candidate SHA, working-tree status, excluded existing changes, deployment lookup result, environment, and browser revision in `evidence.md`. The deployed frontend SHA and immutable deployment URL remain explicitly unavailable.
- [x] 1.2 Freeze the approved prototype references, including commit `410ecd75`, mapped Landing exports, prototype HTML/CSS source commits, exact route/state mapping, and matching viewport requirement in `evidence.md`. Production screenshot pairs remain unavailable and are not fabricated.
- [x] 1.3 Create the route/state/viewport conformance matrix for shared shell, Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, and Sync Queue in `evidence.md`, including unavailable direct references and derived Sync Queue coverage.

Phase 1 is documentation-only. The baseline is frozen with explicit blockers; no application code, prototype asset, snapshot, or existing dirty-tree change was modified.

## 2. Rebuild the shared operational navbar

- [x] 2.1 Inspect prototype topbars and `global.css`; convert the approved 64px geometry into the shared `AppTopbar` presentation.
- [x] 2.2 Remove session-ready, user-email/role, and device-pending diagnostic paragraphs from rendered navbar presentation.
- [x] 2.3 Restructure `GlobalShellSearch` so the category pill sits beside the input; preserve category authorization: Cashier (Customers/Cards), Supervisor/Admin (Customers/Cards/Cashiers).
- [x] 2.4 Add the approved notification-bell and avatar presentation boundaries without claiming issue #45 functionality that is not implemented.
- [x] 2.5 Verify all six Cashier pages, Supervisor, and Admin shell consumers retain identical navbar/sidebar geometry except permitted active/contextual content.
- [x] 2.6 Run focused shell, search, keyboard/focus, responsive, reduced-motion, masking, and RBAC tests.

## 3. Reconstruct Overview and approve the shell/content grid

- [x] 3.1 Translate `overview-dashboard.html` and `Landing-2.png` into prototype-derived React hierarchy and stable landmarks.
- [x] 3.2 Preserve bounded activity data, role-authorized quick actions, loading/empty/error states, and existing API contracts.
- [ ] 3.3 Compare React and prototype at 1440x923 and record every intentional difference. **Blocked:** no attributable production capture or immutable deployed frontend exists for the required same-viewport pair.
- [ ] 3.4 Do not proceed to dependent route reconstruction until Overview structure and geometry meet the evidence gate. **Blocked by 3.3; dependent route reconstruction stops here.**

## 4. Reconstruct Find Customer

- [x] 4.1 Translate prototype heading, centered search panel, search/scan actions, recent results, and customer-selection regions.
- [x] 4.2 Attach existing name/phone/card discovery and verification controllers without changing scope, masking, stale-response, or error behavior.
- [ ] 4.3 Verify keyboard navigation, focus return, loading, empty, error, result selection, mobile/tablet geometry, and prototype comparison evidence. **Partially verified:** focused keyboard, state, responsive, route, and accessibility checks pass; same-viewport prototype comparison remains blocked by the unavailable attributable production reference recorded in Phase 1/3 evidence.

## 5. Reconstruct Capture Purchase and Redeem Credit

- [x] 5.1 Replace legacy presentation wrappers that prevent prototype-faithful persistent flow panels while retaining workflow controllers and handlers.
- [x] 5.2 Implement Capture Purchase stage composition: Find, confirm customer, receipt details, review, and result using the committed prototype geometry.
- [x] 5.3 Implement Redeem Credit stage composition: Find, basket subtotal, redemption amount, confirmation, and result using its intentional width/content differences.
- [x] 5.4 Share lookup, field, notice/status, stage-heading, transition, and review-summary presentation patterns without flattening route-specific hierarchy.
- [x] 5.5 Verify financial safeguards, authoritative outcomes, accessibility, responsive states, and prototype comparison evidence. **Approved deviation recorded:** focused transaction, draft-persistence, accessibility, workflow lookup, offline lookup, and contract submission checks pass; the retained 684x893 Capture Purchase image is superseded because it omits required accessible review/status/context/card-serial content. The current 684x934 hierarchy is approved; attributable deployed 1440x923 comparison evidence remains pending.

## 6. Reconstruct Transactions and derive Sync Queue

- [x] 6.1 Translate Transactions into heading → filters → table → footer and the prototype-derived two-column transaction detail dialog.
- [x] 6.2 Preserve bounded-history behavior and truthful empty presentation for unsupported production fields.
- [x] 6.3 Assemble Sync Queue from approved shared metrics/status, toolbar, table, badges, buttons, and detail-dialog components.
- [x] 6.4 Document Sync Queue as a derived composition and verify loading, empty, retry/error, keyboard, responsive, and accessibility states.

The existing screenshot baselines remain a separate regression signal; changed phase-6 geometry is recorded in `evidence.md` rather than concealed by snapshot updates.

## 7. Certify and hand off

- [ ] 7.1 Run route/state/viewport prototype comparisons; keep React snapshots as a separate signal and record approved deviations.
- [ ] 7.2 Run frontend lint, typecheck, Jest/accessibility, ownership, conformance, build, Semgrep, and affected Playwright checks.
- [ ] 7.3 Verify no backend, API, auth/RBAC, database, financial, offline, or queue semantics changed; inspect Git diff and status for unrelated modifications.
- [ ] 7.4 Run GitNexus `detect_changes()` and record the final affected-symbol/process scope.
- [ ] 7.5 Publish final evidence with candidate SHA, environment, screenshots/reports, residual risks, and slice rollback path.

## 8. Reconcile Register Customer reference evidence

- [x] 8.1 Capture the retained and current Register Customer route at the same role, state, viewport, browser, locale, and timezone; record the `1440x3140` versus `1440x3244` discrepancy and inspect the diff. Evidence: `evidence.md` Register Customer reference reconciliation decision (2026-09-21).
- [x] 8.2 Verify whether the additional current content is required by accessibility, truthful production state, or authorization/RBAC; run GitNexus impact before any source edit and stop on HIGH/CRITICAL scope without explicit approval. Evidence: current supervisor customer workspace hierarchy is retained; no source edit was required.
- [x] 8.3 If the current hierarchy is authoritative, update only the directly paired Register Customer reference artifacts with provenance and an approved-deviation record; otherwise create a separately reviewed presentation task. Do not change registration behavior or silently rebaseline. Evidence: only `prototype-route-register-customer-linux.png` was updated; no registration source, assertion, or landmark artifact changed.
- [x] 8.4 Rerun prototype-landmarks, full conformance, affected Playwright, OpenSpec, and final evidence checks; record remaining deployment and dirty-tree blockers. Prototype-landmarks, full route/viewport conformance, affected workflow screenshots, and OpenSpec validation pass; the repository-native command requires a clean port 3100, while the equivalent CI test completed 69 passed and 3 skipped with the existing server.
- [x] 8.6 Replace only the owner-approved stale Capture Purchase landmark/full-page route and Sync Queue reference artifacts, preserving route/state/viewport metadata and documenting provenance, dimensions, rationale, and approved deviations in `evidence.md`.
- [x] 8.7 Correct the verified mobile Overview empty-state overflow with a mobile-only layout rule; preserve desktop geometry, semantic assertions, and production behavior.
- [x] 8.8 With explicit authorization, replace the stale Redeem landmark reference (`720x898` → `720x1068`) and its directly paired full-page route reference (`1440x1287` → `1440x1457`); preserve route/state/viewport provenance, semantic assertions, and all workflow/controller/financial/offline/queue semantics. The approved deviation and exact evidence are recorded in `evidence.md`.

### Redeem reference update status (2026-09-21)

Task 7.8 is complete under explicit authorization. Only `prototype-redeem-flow-linux.png` and its directly paired `prototype-route-redeem-credit-linux.png` reference artifacts were updated for this slice. The authoritative state is `/cashier/redeem?card=CARD-001`, `CASHIER`, after `Continue to redemption`, captured at viewport `1440x923` with the `redeem-flow` landmark; the current landmark is `720x1068` and the current full-page route is `1440x1457`. The retained `720x898` and `1440x1287` images are superseded stale structural references. No source, tests, assertions, controllers, API/auth/RBAC, financial, offline, or queue semantics changed. The attributable deployed SHA/1440x923 production comparison remains unavailable and is not claimed.

### Phase 7 certification status (2026-09-21)

Tasks 7.1–7.5 remain intentionally incomplete. Evidence was recorded in `evidence.md` with candidate SHA `3ca692b91bdccc52be557bfc61977f876246057c`, exact command results, artifact paths, approved deviations, residual risks, and rollback. Prototype parity is unavailable without an attributable immutable deployment/production capture. Focused Semgrep and ownership checks now pass; the transaction-list `1196x417` and Overview recent-transactions `1088x242` geometry checks pass in source, while Sync Queue retains `expected 375x1988, received 375x1918` because its retained image conflicts with the unmodified DOM-order assertion. The affected prototype-landmarks run also retains the unrelated `shell-notifications` white-space assertion failure. The full Semgrep scan was not certified because the runner timed out, and GitNexus reports critical scope from the inherited dirty tree. No screenshot baselines were rebaselined.

### Current Sync Queue certification blocker (2026-09-21)

Tasks 7.1 and 7.2 remain unchecked for the Sync Queue slice. Focused Playwright and conformance both reproduce the retained mobile mismatch (**expected 375x1988, received 375x1918; 74,353 differing pixels, ratio 0.10**). The expected image places Queue records after the detail panels, but the approved derived DOM composition and unchanged geometry assertion require `.cashier-sync-queue` to precede `.cashier-sync-priority` on mobile. No source/layout workaround, test edit, or snapshot rebaseline is approved because it would violate the prototype-first DOM/accessibility contract. Unit/offline queue, Jest accessibility, browser accessibility, and style ownership checks pass; exact commands and artifact paths are recorded in `evidence.md`.

### Find Customer retained-baseline follow-up (2026-09-21)

- The retained `prototype-customer-search` artifact was inspected before editing: expected `640x108` (`apps/web/test-results/workflow-routes-workflow-r-7f198-e-the-1440px-route-geometry/prototype-customer-search-expected.png`), pre-fix actual `646x106` (`.../prototype-customer-search-actual.png`), and the preserved diff (`.../prototype-customer-search-diff.png`).
- The approved presentation-only correction restored the committed prototype panel width (`640px`) and hint spacing (`10px`) in `apps/web/styles/cashier-routes.css`. The Find Customer locator now captures `640x108`; no JSX, controller, assertion, or snapshot changed.
- The focused prototype-landmarks run now passes the Find Customer landmark and proceeds to the next retained blocker: Capture Purchase `prototype-capture-flow` expected `684x893`, received `684x934`. This is outside the approved Find Customer CSS-only scope and remains unmodified.
- Find Customer checks passed: `npx jest apps/web/tests/cashier-lookup.spec.tsx --config apps/web/jest.web.config.cjs --runInBand` (9 tests); `npx jest apps/web/tests/a11y.spec.tsx --config apps/web/jest.a11y.config.cjs --runInBand` (3 tests); focused lookup success/discovery/geometry Playwright checks (3 passed); focused authoritative-error/offline lookup Playwright checks (2 passed).
- Ownership/type checks passed: `npm --prefix apps/web run design-system:test`, `npm --prefix apps/web run design-system:check`, and `npm --prefix apps/web run typecheck`. The shell notification computed-style check remains `display: grid`, `white-space: nowrap`; the contract-flow login-shell assertion passed (1 test).

### Capture Purchase retained-baseline blocker (2026-09-21)

- GitNexus upstream impact for `CashierWorkflowRoute` was rerun before considering the next slice: **HIGH**, 3 direct callers/processes (`CashierEarnPage`, `CashierLookupPage`, `CashierRedeemPage`), 1 Workflows module. No source edit was approved or made.
- The retained expected landmark is `apps/web/tests/workflow-routes.spec.ts-snapshots/prototype-capture-flow-linux.png` (`684x893`). The current captured locator is `684x934` (Playwright failure: `prototype-capture-flow` expected `684x893`, received `684x934`); the inspected current capture includes `Review before submit`, `Context ready`, `Lookup context applied`, card serial `CARD-001`, and the Step 3 receipt region. The retained expected image begins at `Step 3 — Receipt details` and omits those accessible context/status/card-serial regions.
- This is a structural baseline conflict, not a safe CSS spacing correction. Hiding or compressing the current review/status/context/card-serial content to force `893px` would violate the approved workflow DOM/accessibility/financial review hierarchy. The blocker remains documented; no CSS, component, controller, API, auth/RBAC, financial, offline, queue, test, or snapshot change was made.
- Capture Purchase checks passed: `npx jest apps/web/tests/transaction-forms.spec.tsx apps/web/tests/draft-persistence.spec.tsx --config apps/web/jest.web.config.cjs --runInBand`; `npx jest apps/web/tests/a11y.spec.tsx --config apps/web/jest.a11y.config.cjs --runInBand`; Playwright `covers cashier earn, redeem, customers and sync routes` (1 passed); `disables Earn submission while the authoritative request is pending` (1 passed); and `keeps Capture Purchase and Redeem lookup states visually paired` (1 passed). Ownership checks and `git diff --check` passed.
- **Decision recorded (2026-09-21): Option 1 approved.** The current accessible 684x934 Capture Purchase hierarchy is authoritative for this slice; the retained 684x893 image is superseded reference evidence and must not drive content hiding or a CSS height hack. Updating the approved prototype/reference requires normal provenance and review. Snapshot/assertion changes remain disallowed. The attributable deployed 1440x923 comparison gate remains pending.

## 9. Audit-driven reconstruction completion (implementation-ready)

These tasks incorporate the prototype and JSX audits. They are intentionally separate from the historical slice notes above and must not be marked complete from existing snapshot or functional-test results alone.

### 9.1 Freeze and compare the shared shell

- [ ] Record the exact candidate SHA, dirty-tree exclusions, route/state/role/browser/locale/timezone, and prototype source for the comparison run.
- [ ] Compare `overview-dashboard.html` and `find-customer.html` with `AppShell`, `AppShellContent`, `AppTopbar`, and shell CSS. Make the full remaining-column outer-padding plus independently centered inner-content-width model explicit; remove the old capped wrapper where it shrinks route content or topbar width.
- [ ] Compare topbar hierarchy and computed geometry at 1440x923, 1024, 920, 768, 767, 620, 390, and 375px. Correct sidebar collapse, topbar width/height, content widths, and overflow without changing shell auth/session/RBAC/offline behavior.
- [ ] Correct search/category composition to a readable adjacent pill. Verify Cashier Customers/Cards and Supervisor/Admin Customers/Cards/Cashiers authorization, masking, keyboard/focus behavior, mobile layout, System Online state, and Admin card handoff to `/admin/cards`.

### 9.2 Route-by-route JSX/HTML reconstruction

- [ ] For `/cashier`, compare JSX hierarchy and landmarks against `overview-dashboard.html`; retain API-backed loading/empty/error data and role-authorized actions.
- [ ] For `/cashier/lookup`, compare against `find-customer.html`; preserve discovery-only behavior, active-card verification, masking, stale responses, keyboard navigation, and focus return.
- [ ] For `/cashier/earn` and `/cashier/redeem`, compare against their corresponding HTML stage order and responsive widths. Replace old layout wrappers only where they block parity; preserve controllers, approval/pending/status, integer-kobo, idempotency, draft recovery, and no-offline-redemption rules.
- [ ] For Transactions, compare heading/refresh → filters → table/footer → dialog; move presentation of existing refresh behavior to the heading/action region without changing bounded report scope or truthful unavailable fields.
- [ ] For Sync Queue, compare the derived composition and make metrics/status → unique toolbar → queue table → details/dialog the DOM and visual order. Remove compensating CSS order rules only with queue persistence, device binding, retry, sync, and confirmed-clear tests.
- [ ] Replace or justify each migration-era route/header/overview wrapper and record the exact before/after hierarchy and stable `data-od-id` landmarks. Do not hide accessibility/financial context to fit stale reference dimensions.

### 9.3 Comparison and behavior gates

- [ ] Capture same route/state/role/browser/viewport prototype and React evidence before any visual baseline/reference update. Keep React snapshots separate; do not update baselines before the comparison.
- [ ] Run focused route, controller, auth/RBAC, masking, financial/idempotency, offline, queue, keyboard/accessibility, responsive/no-overflow, and reduced-motion checks. Record intentional production deviations and unavailable deployment evidence.
- [ ] Perform the required second passthrough gap review across shell, search, every mapped route, breakpoint matrix, DOM/visual order, and wrapper ownership. Resolve or explicitly disposition all P1/P2 gaps; do not silently widen scope.
- [ ] Run final artifact validation: OpenSpec validation; evidence/provenance and screenshot-dimension checks; changed-path inventory; `git diff --check`; staged-file check; and GitNexus `detect_changes()` with inherited dirty-tree risk called out. No visual baseline update is permitted unless the comparison, stale-artifact decision, and direct pairing are recorded.

## 10. Artifact-repair implementation and certification gates (all intentionally unchecked)

These tasks are the current implementation contract. Historical checked entries above document prior slices and do not certify this reconstruction; do not mark these tasks complete from historical evidence.

- [ ] 10.1 Use the complete operational-route matrix plus focused `/supervisor/customers/new` and `/admin/customers/new` registration rows in `design.md`; fill any missing same route/state/role/browser/viewport capture metadata and record exact HTML or derived/out-of-scope disposition.
- [ ] 10.2 Implement and verify the numeric shell formula and ownership boundary: full remaining-column topbar, independently centered route slot, route widths 1120/1080/860/720/712, and no competing capped wrapper.
- [ ] 10.3 Preserve exactly one `BrowserStateBootstrap`, shell status row, and `OfflineIndicator` in `AppShell` before protected children; audit and action every wrapper against the allowlist.
- [ ] 10.4 Implement measurable search assertions: exact per-role category sets, adjacent readable category control at every matrix width, query/loading/empty/error assertions, no overflow, exact Admin card handoff `/admin/cards`, and visible exact `System Online` status in the documented online fixture.
- [ ] 10.5 Resolve the Find Customer reference contract using the 712px HTML authority; classify the historical 640px screenshot as superseded and obtain explicit approval before any production deviation or directly paired artifact update.
- [ ] 10.6 Verify route landmark and child order for all twelve matrix rows (10 operational routes plus 2 focused registration routes), including Transactions refresh placement and Sync Queue metrics/status → unique toolbar → queue table → details/dialog in DOM and visual reading order.
- [ ] 10.7 Keep prototype source, production captures, Playwright baselines, and parity evidence in their separate taxonomy; prohibit baseline updates until same route/state/role/browser/viewport comparison and provenance approval are recorded.
- [ ] 10.8 Perform the second passthrough review and classify every P1/P2 item as resolved, approved deviation, historical failure, or current blocker.
- [ ] 10.9 Run final artifact gates: exact strict OpenSpec validation, matrix/provenance review, screenshot dimensions, changed-path inventory, `git diff --check`, no staged files, and GitNexus detection with inherited dirty-tree scope distinguished.
