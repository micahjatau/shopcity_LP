# Review 76 frontend design convergence evidence

## Baseline and branch contract

Task 1.1 baseline captured on 2026-09-21:

- Working branch: `workflow-states-implementation`.
- Current HEAD: `5402eede15a7344a04834d825969001f41f09d72`.
- Remote `workflow-states-implementation`: `ea0891805c90911019d942cf78b0762cefd37e2a` (local branch is ahead by the two local OpenSpec commits).
- Remote `fix/prototype-topbar-customer-lookup`: `eee2b6b57da23212988f3675dc6f5d85f8118965`.
- Latest successful CI on this branch: run `35562764130`, `style(web): format conformance checks`.
- The prior failed static check was superseded by that successful formatting run.

The working tree was already dirty and was preserved. The captured inventory contains 7 modified files:

- `AGENTS.md`
- `CLAUDE.md`
- `apps/web/app/(shell)/admin/page.tsx`
- `apps/web/app/(shell)/supervisor/page.tsx`
- `apps/web/next.config.mjs`
- `apps/web/test-results/.last-run.json`
- `apps/web/tsconfig.tsbuildinfo`

It also contains 41 untracked entries: screenshots, generated/test artifacts, `docs/repo_review_70.md` through `docs/repo_review_76.md`, `docs/.repo_review_76.md.swp`, `docs/development/opendesign-live-preview.md`, frontend utility/config files, and `openspec/changes/development-preview-framing/`. None were staged or altered for this baseline task.

## GitNexus impact analysis

Task 1.2 impact was run upstream against the indexed repository:

| Target                       | Result      | Impact                                                                          |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `AppShellContent`            | LOW, exact  | 1 direct caller, 1 process (`ShellLayout`), 1 module                            |
| `GlobalShellSearch`          | LOW, exact  | 0 indexed upstream callers/processes                                            |
| `useCashierLookupController` | HIGH, exact | 1 direct caller, 4 impacted symbols, 3 processes (Cashier Earn, Lookup, Redeem) |
| `VerifiedCardLookupStep`     | HIGH, exact | 1 direct caller, 4 impacted symbols, 3 processes (Cashier Earn, Lookup, Redeem) |
| `CashierWorkflowRoute`       | HIGH, exact | 3 direct callers, 3 processes (Cashier Earn, Lookup, Redeem)                    |
| `canonicalSelectorFamilies`  | UNKNOWN     | Target not found in the index; direct static ownership tests are required       |

The HIGH findings affect the three Cashier workflow routes and require staged implementation plus full regression gates. No implementation edits were made during this impact-analysis task.

## Branch comparison and accepted boundary

Task 1.3 compared the current branch with `origin/fix/prototype-topbar-customer-lookup` (`eee2b6b57da23212988f3675dc6f5d85f8118965`). The branch comparison found the following:

| Area                         | Current design-system branch                                                                                                       | Prototype/topbar branch                                                                                    | Decision/source of truth                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Shell styling                | Centralized `shell-*` implementation in shared CSS with conformance coverage                                                       | Reintroduces large embedded `<style>` blocks in `app-shell.tsx` and `app-topbar.tsx`                       | Preserve current centralized ownership; port behavior without embedded styles                                       |
| Navbar/profile/notifications | Functional role-aware global search, avatar, mobile menu, and truthful session diagnostics; no profile route or notification panel | Adds Bell notification panel, profile link, `/profile`, and contextual Cashier customer route              | Adopt supported role-aware behavior after CSS/accessibility review; preserve current shell CSS authority            |
| Global search                | Existing Customers/Cards search, debounce, keyboard/Escape, stale-response protection, and conformance tests                       | Adds/updates prototype-styled dropdown and related search tests                                            | Preserve current tested lifecycle and adopt only supported visual/profile behavior                                  |
| Customer discovery           | Existing directory/search contract and separate exact card verification                                                            | Adds name/phone discovery in the lookup controller and safe “discovery does not verify a card” messaging   | Adopt the explicit two-step discovery/verification model; card authority remains authoritative                      |
| Earn/Redeem lookup           | Shared `VerifiedCardLookupStep` and paired computed-style evidence                                                                 | Adds discovery matches but changes classes/markup and removes or alters current workflow screenshots/tests | Port discovery state into the current shared component without regressing current variants or protected transitions |
| Backend/customer contract    | Current branch has no new backend contract in the convergence work                                                                 | Changes `CustomersService` phone normalization and adds a service test for local Nigerian numbers          | Do not cherry-pick this backend change in Phase 1; treat it as a separate contract proposal                         |
| Generated contracts          | Existing generated client/API artifacts remain the current source                                                                  | No generated client change was found in the prototype branch history                                       | No regeneration is required for the frontend-only reconciliation until a backend contract is separately approved    |
| Tests                        | Route matrix, responsive/reduced-motion, accessibility, ownership, and workflow outcome coverage                                   | Adds profile/global-search tests and changes workflow/snapshot coverage                                    | Preserve current gates and port additive behavior tests; do not accept deletion of current conformance coverage     |

The prototype branch is therefore a behavior/reference source for role-aware profile, notification, customer discovery, and selected-route handling—not a stylesheet source of truth. The current branch remains authoritative for centralized CSS ownership, shared card/lookup geometry, reduced motion, and conformance gates.

## Phase 2 frontend reconciliation

Phase 2 ported the safe customer-discovery behavior into the current shared lookup controller and route view without importing the prototype branch's embedded styles or backend phone-normalization change:

- Name/phone queries use the existing customer directory client and render safe discovery matches.
- Exact card queries continue using authoritative card verification; directory matches never unlock Earn or Redeem.
- Card 404 fallback discovery, request-generation guards, offline messaging, stale-result clearing, and truthful error states are covered.
- Find Customer discovery results intentionally do not expose financial workflow links until an active card is verified.
- The prototype profile/notification panel and `/profile` route were not imported because Phase 1 identified their route/authorization contract as a separate product/API boundary; the existing role-aware search, avatar, mobile menu, and session diagnostics remain authoritative.
- Task 2.1 is satisfied for the supported current behavior. The future profile/notification foundation and `/profile` contract are tracked as GitHub issue https://github.com/micahjatau/shopcity_LP/issues/45; no embedded prototype styles or unsupported authorization contract were imported.

Validation:

```text
web:typecheck: passed
workflow-routes.spec.ts: 24 passed, 0 failed, 0 skipped
focused discovery/error/paired lookup tests: 3 passed
```

Task 1.4 accepted backend/API/RBAC boundary:

- No backend, generated API, financial, authentication, queue, or authorization implementation is changed by this phase.
- Existing customer directory and exact card lookup contracts remain authoritative; frontend discovery cannot grant card, balance, approval, role, tenant, or branch authority.
- The prototype branch's Nigerian phone normalization is a backend query-contract change. If required for adoption, create a separate follow-on OpenSpec proposal (suggested id: `customer-directory-phone-normalization`) with tenant/branch scope, masking, query semantics, migration/rollback, and service/integration tests. Do not alter `src/modules/customers/` in this change.
- If `/profile` or contextual customer routes require new RBAC/API permissions rather than existing route protection, create a separate authorization proposal; do not widen permissions here.
- No separate backend proposal was implemented during this task because Phase 1 is documentation-only and the required contract boundary is now explicit.

## Phase 2 frontend reconciliation

Phase 2 ported the safe customer-discovery behavior into the current shared lookup controller and route view without importing the prototype branch's embedded styles or backend phone-normalization change:

- Name/phone queries use the existing customer directory client and render safe discovery matches.
- Exact card queries continue using authoritative card verification; directory matches never unlock Earn or Redeem.
- Card 404 fallback discovery, request-generation guards, offline messaging, stale-result clearing, and truthful error states are covered.
- Find Customer discovery results intentionally do not expose financial workflow links until an active card is verified.
- The prototype profile/notification panel and `/profile` route are deferred to GitHub issue https://github.com/micahjatau/shopcity_LP/issues/45; the existing role-aware search, avatar, mobile menu, and session diagnostics remain authoritative.
- Task 2.1 is complete for the supported current behavior; no embedded prototype styles or unsupported authorization contract were imported.

Validation:

```text
web:typecheck: passed
workflow-routes.spec.ts: 24 passed, 0 failed, 0 skipped
focused discovery/error/paired lookup tests: 3 passed
```

## Phase 3 property-scoped ownership

Tasks 3.1–3.4 completed without changing financial, backend, controller, or authentication behavior:

- Registry exceptions now carry explicit property allowlists instead of file-only reasons.
- Composition properties are enumerated; route exceptions default to composition-only declarations.
- Unknown selectors, missing allowlists, blank/unknown properties, undeclared competing owners, and canonical appearance leakage fail with source/selector/property diagnostics.
- Legacy print/login compatibility and named Cashier status/header variants are explicitly classified with their exact properties; route header and preview-badge appearance was moved to the canonical Cashier design-system owner.
- Production inventory covers 16 source files and all five audited stylesheets.

Validation:

```text
node --test apps/web/scripts/check-cashier-style-ownership.spec.mjs: 8 passed, 0 failed
node apps/web/scripts/check-cashier-style-ownership.mjs: passed for 16 source files
npx openspec validate review-76-frontend-design-convergence --strict: valid
```

Residual boundary: profile/notification and `/profile` remain deferred as GitHub issue #45; Phase 3 did not import or restyle that unsupported contract.

## Phase 4 card and route-style consolidation

Tasks 4.1–4.4 completed:

- `ShopCityCard` now exposes the explicit `standard`, `metric`, `table`, and `flow` variants; the canonical card base owns shared surface, border, radius, and variant layout.
- Transaction stage consumers migrated from the obsolete `.cashier-card` family to `.sc-card sc-card--flow`; `CashierFlowPanel` retains its canonical flow-panel owner without a duplicate card class.
- Sync Queue default card consumers now use the explicit `standard` variant, and print compatibility targets the canonical `.sc-card` family.
- The ownership registry and negative/positive fixtures now cover the complete canonical card selector family; no `.cashier-card` owner remains (card-preview selectors are a distinct route component).
- Existing route CSS ownership remains composition-only or explicitly classified by the property-scoped checker for forms, statuses, headers, tables, dialogs, and focus behavior; no controller, backend, financial, authentication, queue, or RBAC behavior changed.

Validation:

```text
node --test apps/web/scripts/check-cashier-style-ownership.spec.mjs: 8 passed
node apps/web/scripts/check-cashier-style-ownership.mjs: 16 source files passed
web:typecheck: passed
focused workflow routes: 7 passed, 0 failed, 0 skipped
```

## Phase 5 shell and workflow verification

Phase 5 added role-aware browser evidence without inventing the deferred profile contract:

- Cashier exposes Customers and Cards; Supervisor/Admin expose Customers, Cards, and Cashiers; profile/notification controls remain absent until issue #45 is implemented.
- Exact card search uses one explicit lookup and deep-links to `/cashier/lookup?card=CARD-001`; customer discovery remains separate from financial authority.
- Existing route matrix coverage verifies all six Cashier routes plus Supervisor/Admin shell consumers at desktop/tablet/mobile viewports, reduced motion, overflow, target dimensions, drawer focus, Escape/focus return, loading/empty/error, stale responses, keyboard selection, offline status, and protected Earn/Redeem transitions.
- Earn/Redeem paired lookup computed-style and workflow tests pass after the canonical card consolidation.

Validation:

```text
Focused role/category/card-deep-link test: 1 passed
Frontend visual/workflow suite: 58 passed
Browser accessibility suite: passed
web:typecheck: passed
```

## Phase 6 Figma-to-React evidence

Tasks 6.1–6.3 are complete. The committed reference inventory is governed by `docs/frontend/prototype-reference-manifest.json` at reference SHA `410ecd75`, with seven route/fixture mappings at 1440×923. Existing `prototype-acceptance.spec.ts` verifies reference presence and dimensions; `workflow-routes.spec.ts` and `visual-regression.spec.ts` remain separate React-rendered evidence.

Task 6.4 is blocked honestly: the Figma exports are crop/component assets, while current `prototype-*` images are full rendered-page captures. No crop/landmark mapping exists for a defensible pixel comparison, so no Figma pass claim or baseline update was made. The deterministic comparison contract and blocker are documented in `docs/frontend/design-system/figma-comparison-report.md`; implementation is tracked in GitHub issue #46.
