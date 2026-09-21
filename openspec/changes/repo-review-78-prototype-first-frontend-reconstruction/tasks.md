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
- [x] 7.6 Replace only the owner-approved stale Capture Purchase landmark/full-page route and Sync Queue reference artifacts, preserving route/state/viewport metadata and documenting provenance, dimensions, rationale, and approved deviations in `evidence.md`.
- [x] 7.7 Correct the verified mobile Overview empty-state overflow with a mobile-only layout rule; preserve desktop geometry, semantic assertions, and production behavior.
- [x] 7.8 With explicit authorization, replace the stale Redeem landmark reference (`720x898` → `720x1068`) and its directly paired full-page route reference (`1440x1287` → `1440x1457`); preserve route/state/viewport provenance, semantic assertions, and all workflow/controller/financial/offline/queue semantics. The approved deviation and exact evidence are recorded in `evidence.md`.

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
