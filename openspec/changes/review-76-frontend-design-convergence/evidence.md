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

Task 1.4 accepted backend/API/RBAC boundary:

- No backend, generated API, financial, authentication, queue, or authorization implementation is changed by this phase.
- Existing customer directory and exact card lookup contracts remain authoritative; frontend discovery cannot grant card, balance, approval, role, tenant, or branch authority.
- The prototype branch's Nigerian phone normalization is a backend query-contract change. If required for adoption, create a separate follow-on OpenSpec proposal (suggested id: `customer-directory-phone-normalization`) with tenant/branch scope, masking, query semantics, migration/rollback, and service/integration tests. Do not alter `src/modules/customers/` in this change.
- If `/profile` or contextual customer routes require new RBAC/API permissions rather than existing route protection, create a separate authorization proposal; do not widen permissions here.
- No separate backend proposal was implemented during this task because Phase 1 is documentation-only and the required contract boundary is now explicit.
