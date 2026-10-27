# Tasks

## 1. Freeze baseline and evidence contract

- [x] 1.1 Record branch, candidate SHA, dirty-tree inventory, excluded changes, deployment URL/SHA, route, role, state, browser, viewport, and prototype reference.
- [x] 1.2 Record the functioning `shopcity-lp` preview separately from the alternate `web` preview; do not treat the alternate `/login` HTTP 500 / `FUNCTION_INVOCATION_FAILED` result as visual parity evidence.
- [x] 1.3 Create the route/state/viewport matrix for login, Overview, Find Customer, Capture Purchase, Redeem Credit, Register Customer, Transactions, and Sync Queue using the committed prototype/reference inventory and exact 1440x923 desktop context.
- [x] 1.4 Define structural, geometry, behavior, accessibility, responsive, and RBAC evidence requirements; distinguish unavailable evidence from passing evidence. Use deterministic intercepted API responses for prototype comparisons and never execute prototype financial scripts against live accounts.
- [x] 1.5 Freeze the per-screen DOM/page-content contract and stable `data-od-id` landmarks before route-specific visual adjustments.

## 2. Correct low-risk presentation semantics

- [x] 2.1 Make `LoginForm` role cards truthful without changing backend-returned role authority.
- [x] 2.2 Correct Overview loaded-zero/unavailable rendering, redemption terminology, and bounded-feed wording. Evidence: `apps/web/tests/cashier-lookup.spec.tsx` covers loaded-empty `0`, unavailable `—`, `Redemptions`, and the bounded today-feed destination.
- [x] 2.3 Verify shell geometry remains shared across Cashier, Supervisor, and Admin routes: 244px expanded sidebar, 76px collapsed rail, 64px topbar, 1120px content maximum, and 300px shared-search maximum; reject route-local width overrides used only to fit screenshots. Evidence: shared `apps/web/styles/tokens.css` and `apps/web/styles/shell-components.css` contracts remain centralized; `apps/web/tests/app-shell.spec.tsx` covers one shell and collapse behavior.
- [x] 2.4 Verify shared search categories and shell boundaries: Cashier sees Customers/Cards, Supervisor/Admin additionally see Cashiers; notification/avatar surfaces remain presentation-only until issue #45 is actually contracted. Evidence: `apps/web/tests/global-shell-search.spec.tsx` covers Cashier, Supervisor, and Admin categories; `apps/web/tests/app-shell.spec.tsx` covers the disabled notification surface.

## 3. Certify lookup and financial workflows

- [x] 3.1 Verify Find Customer DOM order and content regions: page heading, centered search panel, lookup controls, Search/Scan actions, state region, discovery cards, and verified-card handoff; cover initial, loading, directory-match, verified-card, empty, offline, and error states. Retain exact card scope, masking, tenant/branch boundaries, stale-response protection, keyboard selection, Escape/focus restoration, and deep-link handoff.
- [x] 3.2 Verify Capture Purchase DOM order and stage content: persistent flow panel, Find, Confirm, Receipt details, Review, and outcome; cover confirmed, pending, failed, and uncertain states. Preserve receipt number, kobo-safe amount, authoritative context, draft/idempotency recovery, and do not add unsupported prototype-only fields such as Till.
- [x] 3.3 Verify Redeem DOM order and distinct content: Find, basket subtotal, available credit, redemption amount, remaining payable amount, confirmation, and outcome; cover pending and connectivity-loss states. Ensure pending approval never resembles a completed debit and connectivity loss never enables offline redemption.
- [x] 3.4 Preserve controller ownership, card verification gates, idempotency/draft recovery, kobo-safe money handling, and no offline redemption.

## 4. Reconcile supporting workspaces

- [x] 4.1 Run exact upstream impact for `CustomerWorkspace`; it is CRITICAL (6 direct dependants, 5 processes), so no `CustomerWorkspace` edit was made. The exact controller impact is also recorded before its isolated retry-semantics edit.
- [x] 4.2 Add focused `/supervisor/customers/new` and `/admin/customers/new` registration composition around `useCustomerRegistrationController`, with only supported full-name, phone, email, and initial-card fields; no birthday or marketing-consent fields or authorization changes.
- [x] 4.3 Preserve one registration idempotency key in the controller until a create succeeds; focused test covers an uncertain response followed by retry.
- [x] 4.4 Register Customer now has heading, supported information form, review, result, and focused route landmarks; search/detail/card-management remains in `CustomerWorkspace`.
- [x] 4.5 Verified `TransactionDashboard` preserves heading/refresh → filters/toolbar → bounded table → footer/pagination → two-column detail dialog, with existing density, responsive CSS, and bounded-history wording/tests unchanged.
- [x] 4.6 Verified `CashierSyncPage` remains a derived composition with metrics/status, toolbar, queue table, badges/actions, detail dialog, mobile CSS, IndexedDB/device binding, per-record reconciliation, and retry/error behavior unchanged; no screenshot rebaseline or prototype-parity claim was added.

## 5. Validate and hand off

- [ ] 5.1 Run frontend lint, typecheck, Jest, accessibility, critical/conformance Playwright, design-system ownership, build, and Semgrep checks. Evidence: the focused final-blocker login/transaction Jest run passed 2 suites/14 tests, web typecheck passed, design-system ownership passed 13 tests, and token drift passed. The previously recorded full certification still has unresolved visual/conformance blockers; no claim of a full-gate pass is made. Login retains an intentional unavailable-Owner visual deviation.
- [ ] 5.2 Run prototype comparisons at 1440x923 plus responsive viewports; record every intentional deviation and unavailable deployment/browser limitation. Use the committed prototype directory and existing Landing-1 through Landing-18 reference inventory, not newly generated React screenshots as the source of truth. Evidence: customer-search matches 640x108 and the focused Redeem outcome Playwright scenario passes at the stored 1120x1979 reference without screenshot updates; fresh authenticated side-by-side browser evidence remains unavailable, and login retains the documented safety deviation.
- [x] 5.3 Confirm backend, API, auth/RBAC, financial, offline, and queue semantics are unchanged. Evidence: final changed paths contain no backend/API/prisma/queue implementation files; root/web Jest, accessibility, critical, offline, and sync coverage passed.
- [x] 5.4 Run GitNexus `detect_changes()` and inspect the final diff/status for unrelated modifications. Evidence: the corrupted index was repaired by `gitnexus clean --force` followed by `npm run gitnexus:analyze` (13,392 nodes, 21,593 edges, 300 flows). The final direct command `./node_modules/.bin/gitnexus detect_changes --repo shopcity_LP --scope unstaged --limit 25` completed and reported 26 files, 26 symbols, 30 processes, and CRITICAL aggregate risk due the accumulated dirty tree. Final status and no-staged-files checks passed; the aggregate result is not change-only attribution.
- [x] 5.5 Validate the OpenSpec change and publish residual risks and rollback guidance. Evidence: strict validation of `review-78b-prototype-parity-closure` passed; residual risks and slice-by-slice rollback guidance are in evidence.md.
