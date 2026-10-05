# Phase 1 implementation evidence

## Scope

Phase 1 implementation is limited to the shared shell seam and browser contract fixture. No workflow controller, financial, API, authorization, or Sync Queue implementation was changed.

Changed implementation/test/documentation files:

- `apps/web/styles/shell-components.css`
- `apps/web/tests/fixtures/design-system-conformance.ts`
- `apps/web/tests/workflow-routes.spec.ts`
- `apps/web/scripts/check-cashier-style-ownership.spec.mjs`
- `apps/web/docs/design-system/cashier-visual-contract.md`

Pre-existing dirty-tree files remain separate and were not reset, staged, or modified by this phase.

## Impact and scope checks

- GitNexus impact was run before editing the workflow-route test seam with file disambiguation:
  `npm run proposal:impact -- --file apps/web/tests/workflow-routes.spec.ts "workflow route coverage"`
- The direct repo-local lookup was also run as:
  `node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/tests/workflow-routes.spec.ts 'workflow route coverage'`
  GitNexus returned `Target 'workflow route coverage' not found`, risk `UNKNOWN`, and zero indexed upstream symbols. The test suite is therefore covered by direct browser/Jest checks rather than a symbol-level graph result.
- Fresh GitNexus change detection:

  ```text
  node scripts/gitnexus.cjs detect_changes -r shopcity_LP --scope all
  Changes: 9 files, 9 symbols
  Affected processes: 0
  Risk level: low
  Changed symbols: AGENTS.md, CLAUDE.md, Admin, Supervisor, and next.config.mjs symbols
  ```

  The current aggregate includes only the pre-existing tracked documentation, Admin, Supervisor, and configuration symbols; the Phase 1 CSS/test files are not represented as indexed symbols. This is evidence that no indexed financial or authorization process is affected, not proof that the unindexed CSS/test files were absent from the diff. The scoped file list and `git diff` remain authoritative for Phase 1 changes.

## Implemented

- Applied the existing `--sc-prototype-contentMaxWidth` token to the shared `.shell-main` container.
- Kept the shared desktop shell search at 300px maximum and the mobile search at 230px.
- Extended the contract fixture with documented scopes for shell topbar, navigation links, page headers, cards, single-line controls, pill buttons, statuses, and search controls.
- Changed contract assertions to check every matching canonical instance rather than only the first match. Legitimately absent owners remain optional because route states do not all render every component.
- Added mobile global-search coverage for the 390px width, result rendering, Escape, and focus restoration.
- Added the 600px transaction-detail dialog geometry assertion.

## Verification

Passed:

- `node apps/web/scripts/check-cashier-style-ownership.mjs`
- `npm run web:typecheck`
- `node --test apps/web/scripts/check-cashier-style-ownership.spec.mjs` — 9 passed
- `./node_modules/.bin/jest --config apps/web/jest.web.config.cjs apps/web/tests/app-shell.spec.tsx --runInBand` — passed
- `npx prettier --check apps/web/styles/shell-components.css apps/web/tests/fixtures/design-system-conformance.ts apps/web/tests/workflow-routes.spec.ts apps/web/scripts/check-cashier-style-ownership.spec.mjs apps/web/docs/design-system/cashier-visual-contract.md`
- `git diff --check -- apps/web/styles/shell-components.css apps/web/tests/fixtures/design-system-conformance.ts apps/web/tests/workflow-routes.spec.ts`
- `cd apps/web && timeout 180s ./node_modules/.bin/playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts --grep "executes the route and viewport conformance matrix" --workers=1 --max-failures=1 --timeout=30000` — passed, 1 test in 55.4s
- `npx --yes @fission-ai/openspec validate align-cashier-layouts-to-prototype --strict` — passed (`Change 'align-cashier-layouts-to-prototype' is valid`)
- `node scripts/gitnexus.cjs detect_changes -r shopcity_LP --scope all` — passed, 11 files/11 symbols, 0 affected processes, low risk. The new CSS, fixture, documentation, and test seams are not fully represented as indexed symbols.

Failed or blocked checks:

- `./node_modules/.bin/jest --config apps/web/jest.web.config.cjs apps/web/tests/app-shell.spec.tsx apps/web/tests/shell-navigation.spec.tsx --runInBand` — `app-shell.spec.tsx` passed; `shell-navigation.spec.tsx` had four pre-existing missing-route-fixture failures. This is not attributed to the Phase 1 CSS/contract changes.
- The focused Playwright gate and the full route/viewport conformance matrix both passed after restarting the stale server.

Browser gate remediation:

- Root cause was a stale repo-local Next server on port 3100. PID `973093` matched `/root/github-repos/micahjatau/shopcity_LP/apps/web`, consumed approximately 111% CPU, and returned no HTTP response. Graceful termination exceeded the bounded wait; one force termination was used only after the exact cwd, command, and port ownership were reconfirmed.
- Port 3100 was released and the diagnostic `.last-run.json` state was restored to its pre-diagnostic deleted state.
- The focused Playwright command then passed without snapshot updates:

  ```text
  cd apps/web && timeout 60s ./node_modules/.bin/playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts --grep "repairs sidebar geometry" --workers=1 --max-failures=1 --timeout=30000
  1 passed (19.3s)
  ```

- The `PLAYWRIGHT_SKIP_WEBSERVER=1` diagnostic against the stale process is not acceptance evidence; it failed at navigation with `ERR_CONNECTION_RESET`, confirming the server—not the browser or fixture—was unhealthy.

## Open tasks

The focused shell/drawer browser gate and full route/viewport matrix now pass. The ownership checker, visual-contract documentation, primary-button ownership regression fixture, formatting, typecheck, OpenSpec validation, and GitNexus scope check pass. The focused Jest shell-navigation run has four pre-existing route-fixture failures for missing navigation page files; `app-shell.spec.tsx` passes. Figma comparison, staging, and final handoff tasks remain open. The aggregate GitNexus result is low risk with zero affected processes, but its file list includes unrelated pre-existing dirty-tree changes and is not a clean isolated candidate diff.

## Phase 2 shell and Overview composition

Phase 2 aligns the shared shell and Overview baseline without changing workflow, financial, API, authorization, offline, or Sync Queue behavior:

- `cashier-overview` now uses the existing 1120px content token rather than the narrower 1088px route override.
- Overview metric cards retain the canonical `ShopCityCard` metric owner; route CSS now supplies only composition and removes duplicate card surface, border, radius, and padding declarations.
- Prototype landmark IDs were added to the four metric cards for deterministic reference coverage.
- The Overview composition test covers 1440px, 1024px, and 390px viewports, equal usable metric-card heights, heading/action landmarks, View-all navigation, reduced motion, and document overflow.
- The existing Overview screenshot was intentionally regenerated after the approved 1120px shell-width change. The updated 1120px-by-826px capture was inspected; no unrelated snapshot was updated.

Phase 2 verification:

```text
node apps/web/scripts/check-cashier-style-ownership.mjs: passed for 16 source files
npm run web:typecheck: passed
cd apps/web && npx jest --config ./jest.web.config.cjs tests/workflow-routes.spec.ts --runInBand: passed
npx prettier --check apps/web/styles/cashier-routes.css apps/web/components/workflows/cashier-overview-lookup.tsx apps/web/tests/workflow-routes.spec.ts: passed
cd apps/web && timeout 180s ./node_modules/.bin/playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts --grep "overview" --workers=1 --max-failures=1 --timeout=30000: 5 passed (23.8s)
npx --yes @fission-ai/openspec validate align-cashier-layouts-to-prototype --strict: passed
node scripts/gitnexus.cjs detect_changes -r shopcity_LP --scope all: medium risk, 13 files, 31 symbols, 4 affected execution flows
```

GitNexus reports four CashierPage execution flows through the changed `CashierOverviewLookup` component. This is the expected Overview read-model surface; no financial mutation, authorization, or Sync Queue process was reported. The aggregate also includes pre-existing Admin/Supervisor/configuration and GitNexus documentation changes in the dirty worktree.

The Phase 2 shell and Overview slice remains bounded by the intentionally deferred profile/notification contract (`tasks.md` 2.5); all later route, visual-comparison, staging, and final-handoff tasks remain open.

### Phase 3 Find Customer

- Find Customer composition remains in `CashierWorkflowRoute`; `useCashierLookupController` and `VerifiedCardLookupStep` were not changed. The search and recent-customer panels now use the prototype 712px maximum, desktop `minmax(0, 1fr) 160px 160px` controls, tablet 140px action columns through 920px, and one-column stacking through 620px. Mobile result rows stack without horizontal overflow.
- The existing Scan affordance remains focus-only because no scanner callback or authoritative scanner behavior is available; no scanner/API authority was invented.
- Bounded lookup route coverage passed with a fresh Next server on port 3100:

  ```text
  aligns Find Customer geometry and keyboard focus across viewports: 1 passed (7.6s)
  discovers customers by name without unlocking financial workflows: 1 passed (3.1s)
  shows an authoritative lookup error state: 1 passed (2.0s)
  shows an explicit offline lookup failure without claiming resolution: 1 passed (2.2s)
  covers lookup success, context handoff, keyboard, and narrow layout: 1 passed (1.5s)
  ```

- The compatible Overview/lookup unit suite passed: `Test Suites: 1 passed, 7 tests passed`.
- Typecheck, Cashier style ownership, Prettier, and `git diff --check` passed for the Phase 3 changes. Existing controller coverage remains the authority for stale-response, branch/tenant scope, masking, and deep-link semantics; no API, financial, authorization, offline queue, or Sync Queue implementation changed.
- The combined lookup Playwright grep was not used as acceptance evidence because it timed out; the five relevant lookup scenarios passed independently as listed above. This remains a bounded verification residual, not a claimed combined-suite pass.
- Direct protected-file inspection confirms no diff in `use-cashier-lookup-controller.ts` or `verified-card-lookup-step.tsx`. The Phase 3 implementation now uses canonical `.sc-discovery-*` appearance owners in `cashier-design-system.css`; `cashier-routes.css` retains only Find Customer composition, sizing, spacing, and responsive rules. The route component adds only those shared presentation classes; lookup behavior is unchanged.
- After the ownership correction, the focused Jest suite passed again: `Test Suites: 1 passed, Tests: 7 passed`. Typecheck, ownership, Prettier, diff check, and strict OpenSpec validation also passed.

### Phase 4 Capture Purchase

- Capture Purchase now keeps card lookup, customer confirmation, receipt details/review, and the earn success state inside one shared `CashierFlowPanel` with the existing approximately 860px owner. Redeem composition remains unchanged except for the shared route branch continuing to use its existing panel.
- The four-step indicator, stage headings, accessible lookup/status labels, focus targets, and existing `EarnTransactionForm` callbacks remain intact. No earn controller, card verification, generated API, integer-kobo validation, receipt-week/idempotency, CSRF, approval, offline queue, retry/error, router-refresh, or financial-gating behavior changed.
- Added bounded route geometry assertions for the stable Capture Purchase landmark, 860px maximum panel width, and no document overflow. Existing authoritative Earn/Redeem outcome coverage remains active.
- Focused Jest passed: `transaction-forms.spec.tsx` and `cashier-lookup.spec.tsx`; `Test Suites: 2 passed, Tests: 15 passed`.
- Focused Playwright passed with a healthy existing server (`PLAYWRIGHT_SKIP_WEBSERVER=1`): `covers authoritative Earn and Redeem outcomes` — 1 passed (7.2s). The pre-existing earn/redeem outcome snapshots were intentionally regenerated after inspecting the approved 1120px shell/860px panel geometry; no unrelated snapshot was updated.
- Typecheck, Cashier style ownership, Prettier, and `git diff --check` passed. Strict OpenSpec validation remains passing.
- GitNexus impact before editing reported `CashierWorkflowRoute` HIGH (4 direct callers, 3 affected processes: Lookup, Redeem, Earn). `CashierFlowPanel` was unindexed (`UNKNOWN`); direct route and Jest/Playwright regression coverage was retained. No protected workflow implementation changed outside the route composition seam.

### Phase 5 Redeem Credit

- Redeem confirmation and basket stages now use the shared `CashierFlowPanel` with `flow="redeem"`, preserving the canonical approximately 720px owner. Existing redeem form hooks, step values, lookup authority, balance limits, integer-kobo grammar, approval, offline restrictions, idempotency, retry/error, CSRF/session, branch/tenant scope, and financial authorization remain unchanged.
- Added paired route assertions for the redeem-flow landmark, 720px maximum width, mobile no-overflow behavior, and the existing authoritative Earn/Redeem transition path. Remaining-balance presentation remains display-only through the existing form/controller.
- Focused Jest passed: `transaction-forms.spec.tsx` and `draft-persistence.spec.tsx`; `Test Suites: 2 passed, Tests: 10 passed`.
- Focused Playwright passed with a healthy existing server (`PLAYWRIGHT_SKIP_WEBSERVER=1`): `covers authoritative Earn and Redeem outcomes` — 1 passed (7.7s).
- Typecheck, Cashier style ownership, Prettier, `git diff --check`, and strict OpenSpec validation passed. GitNexus impact for `CashierWorkflowRoute` remains HIGH (4 direct callers, 3 affected Cashier processes); no protected redeem controller/form or API implementation changed.

### Phase 6 Transactions

- Transactions retains the existing bounded cashier report, exact receipt/transaction-ID filtering, status/operation/credit filters, refresh behavior, stale detail-generation guard, masking/omission boundaries, and dialog lifecycle. The detail table now uses a responsive two-column internal grid and explicitly labels unsupported evidence as `Not provided`; no generated API or financial data contract changed.
- Existing route composition already provides the Transactions heading/supporting copy, refresh action, bounded result count/scope notice, table headings, loading/error/empty states, 600px dialog, Escape/focus trap/focus return, and narrow table overflow behavior. The Phase 6 implementation diff is limited to the detail presentation class and truthful evidence row.
- `npm run web:typecheck`, Prettier check, `git diff --check`, and strict OpenSpec validation passed.
- The web Jest `testMatch` now includes `transaction-dashboard.spec.tsx`, and the focused command passed: `Test Suites: 1 passed, Tests: 2 passed`.
- Residual risk: the existing dirty-tree GitNexus aggregate remains unrelated context; no controller, generated client, API, authorization, or financial logic was changed.

### Phase 7 Sync Queue

- Sync Queue is documented as a derived composition, not direct Figma parity. Its primary hierarchy is the cashier-visible queue table (receipt/card/amount/state/action); selected local metadata and backend response details remain secondary panels/disclosure content.
- Added canonical status buckets (`Waiting`, `Syncing`, `Needs attention`, `Synced`) while retaining raw approval/confirmed/rejected/retry badges and underlying sync states. Existing search/status filtering, queue storage, batch submission, per-record mapping, CLEAR confirmation, confirmed-only deletion, retry requeue, integer-kobo rendering, masking, and truthful errors remain unchanged.
- Added responsive Sync Queue layout, table overflow containment, keyboard focus treatment for selected-row controls, and visual ordering assertions placing the queue table ahead of technical panels.
- Focused offline Jest passed: `offline-earn-queue.spec.tsx` and `offline-queue.spec.tsx`; `Test Suites: 2 passed, Tests: 2 passed`.
- Targeted Sync Queue Playwright passed at the narrow viewport: `keeps Sync Queue controls usable on a narrow viewport` — 1 passed (3.8s). The intentionally updated mobile empty-state snapshot was inspected after the expected table-first composition change; no unrelated snapshot was changed.
- Typecheck, Cashier style ownership, Prettier, diff check, and strict OpenSpec validation passed. GitNexus impact was LOW for `CashierSyncPage` (exact, no upstream processes) and LOW for `SyncQueueIndicator` (3 direct dependants, no indexed processes). Fresh `detect_changes --scope all` reports critical aggregate risk from the accumulated dirty tree (18 files, 16 symbols, 27 flows); the focused new flow is CashierSyncPage.
- Review remediation addressed three truthful-state/storage issues: populated tables now use a horizontal scroll wrapper rather than queue clipping; syncing records are persisted as `syncing` before batch submission; and update/delete failures are surfaced without claiming success, with unavailable batches marked retry-required when local persistence succeeds. Offline Jest remained green (`2 suites, 2 tests`), targeted Sync Queue Playwright remained green (`1 passed`), and typecheck, formatting, diff-check, and OpenSpec validation passed after remediation.

### Phase 10 staging certification

- Staging certification was fail-closed. At inspection, branch `workflow-states-implementation`, candidate `ba5416c260346351eb1067f579eebe50c2005df3`, and 12 dirty-tree entries were recorded without staging or modifying unrelated files.
- Required staging/backend variables were unavailable: `STAGING_URL`, `STAGING_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SMOKE_ENVIRONMENT` were unset. Vercel CLI authentication was present, but that does not establish an approved staging deployment, backend lineage, disposable tenant/branch, role accounts, cards, device, or reconciliation authority.
- Tasks 10.1-10.5 remain open. Task 10.6 is complete: no staging smoke, production mutation, fixture creation, or fabricated deployment evidence was attempted.

### Visual acceptance reconnaissance

- Existing visual evidence is correctly split into direct Figma parity (A), prototype/design-system conformance (B), and derived product conformance (C) in `docs/frontend/design-system/figma-comparison-report.md`.
- The reference manifest is available at `docs/frontend/prototype-reference-manifest.json` with reference SHA `410ecd75`; source bounds for named crop exports are intentionally null, so direct pixel parity remains blocked rather than inferred.
- Original Figma font identity/availability is unconfirmed, and full-page references are incomplete for every route/state/responsive viewport. These are explicit environmental/source blockers for tasks 9.1-9.6; no snapshots or baselines were changed during reconnaissance.
- Existing React/Playwright, prototype, token, accessibility, and computed-style evidence remains valid as B/C conformance evidence. The Sync Queue remains derived because it has no direct approved Figma page.
- Existing visual gallery verification passed without snapshot updates: `cd apps/web && PLAYWRIGHT_SKIP_WEBSERVER=1 timeout 180s ./node_modules/.bin/playwright test --config ./playwright.config.ts tests/visual-regression.spec.ts --workers=1 --max-failures=1 --timeout=30000` — 6 passed (18.6s).
- The bounded conformance command was attempted without snapshot updates. `keeps Capture Purchase and Redeem lookup states visually paired` passed, but the transaction-detail test failed on the existing `cashier-transactions-list.png` snapshot dimension mismatch (expected 1196px, received 1120px); no baseline was updated. A follow-up reduced grep run timed out after three passing tests, so task 9.6 remains open.
- Tasks 9.1-9.4 remain open because no executable Figma runner, crop source bounds, verified original fonts, or complete responsive references are available. Task 9.5 is complete through the manifest/report/blocker record; no direct Figma pixel percentage is claimed.
- Read-only existing visual gallery passed without snapshot updates: `PLAYWRIGHT_SKIP_WEBSERVER=1 timeout 180s ./node_modules/.bin/playwright test --config ./playwright.config.ts tests/visual-regression.spec.ts --workers=1 --max-failures=1 --timeout=30000` — 6 passed (13.7s).
- The bounded route conformance command ran 9 tests but stopped after the existing Transactions snapshot expected 1196px while the current approved 1120px shell produced 1120px; 1 test passed before the mismatch and 7 were not run. This is recorded as a baseline reconciliation blocker; no snapshot was updated blindly.

### Phase 10 staging certification readiness

- Readiness assessment was fail-closed and made no deployment or financial mutation attempt.
- Candidate context: branch `workflow-states-implementation`, candidate `ba5416c`, with 12 existing dirty-tree entries preserved.
- Required staging/runtime secrets were absent from the environment: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `CSRF_SECRET`, `SUPABASE_URL`, Supabase keys, and `VERCEL_TOKEN` were all unset. GitHub CLI authentication exists, but that does not provide staging deployment lineage, tenant/branch fixtures, role accounts, cards, or device credentials.
- Therefore tasks 10.1-10.5 remain open. Task 10.6 is satisfied as an explicit environmental blocker: staging credentials, deployment lineage, disposable fixtures, and reconciliation evidence are unavailable, so no local/mocked substitute is claimed as staging certification.

### Phase 2 review remediation

- Removed duplicate Overview heading typography declarations from `apps/web/styles/cashier-routes.css`; page-heading appearance remains owned by the canonical shared component styles.
- Removed the table-search outline reset and added a token-based `:focus-visible` outline using `--sc-color-semantic-focus`. The Overview route test now focuses `Search recent transactions` and asserts a visible `solid 2px` keyboard outline.
- Bounded Overview browser verification passed:

  ```text
  cd apps/web && timeout 180s ./node_modules/.bin/playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts --grep 'overview' --workers=1 --max-failures=1 --timeout=30000
  5 passed (24.3s)
  ```

- Ownership checker, web typecheck, Prettier, diff check, and strict OpenSpec validation passed.
- The workflow-route Jest pattern is incompatible with the web Jest testMatch because `workflow-routes.spec.ts` is a Playwright suite; that command correctly returned no tests found. The compatible Overview unit suite passed:

  ```text
  timeout 90s ./node_modules/.bin/jest --config apps/web/jest.web.config.cjs apps/web/tests/cashier-lookup.spec.tsx --runInBand
  Test Suites: 1 passed, 1 total
  Tests: 7 passed, 7 total
  ```

- Fresh GitNexus detection reports 13 files, 20 symbols, 4 affected Cashier read-only flows, and medium aggregate risk. The affected flows are `CashierPage → ReadCookie`, `CashierPage → ShopCityCard`, `CashierPage → Money`, and `CashierPage → CashierTableToolbar`; no financial mutation, authorization, or Sync Queue flow was reported.
- The existing approved Overview snapshot remains present; no new snapshot was intentionally updated by this remediation. Metric-accent parity and mobile-footer parity remain documented residual visual deviations for later visual refinement.
