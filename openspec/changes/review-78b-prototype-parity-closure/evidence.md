# Phase 1 baseline and login evidence

## Baseline freeze

Captured at `2026-09-23T08:11:47Z`, before any Phase 1 source edit.

- Branch: `workflow-states-implementation`
- Candidate SHA: `0b569770bb76e32cf166a1e44a8df8368afc26b2` (`0b569770bb76`)
- Working tree: dirty before this phase; no reset, stash, stage, or overwrite was performed.
- The baseline inventory below is the pre-phase inventory. The Phase 1 files added after this freeze are intentionally not part of the unrelated inventory.

### Pre-existing dirty-tree inventory

Tracked modifications:

- `AGENTS.md`
- `CLAUDE.md`
- `apps/web/app/(shell)/admin/page.tsx`
- `apps/web/app/(shell)/supervisor/page.tsx`
- `apps/web/jest.web.config.cjs`
- `apps/web/next.config.mjs`
- `apps/web/test-results/.last-run.json`
- `apps/web/tsconfig.tsbuildinfo`
- `docs/development/gitnexus-impact-tracker.md`
- `package-lock.json`

Untracked files/directories:

- Root reference captures: `Capture-Purchase.png`, `Find-Customer.png`, `Landing.png`, `Landing-1.png` through `Landing-18.png`, `Login.png`, `Overview.png`, `Redeem-Credit.png`, `Register-New-Customer.png`, `Screenshot-2026-09-19-072747.png`, `Transactions.png`
- `apps/web/components.json`
- `apps/web/docs/design-system/cashier-visual-contract.md`
- `apps/web/lib/utils.ts`
- `apps/web/postcss.config.mjs`
- `apps/web/scripts/next-config.spec.mjs`
- `apps/web/test-results/smoke/current-run.json`
- `docs/development/opendesign-live-preview.md`
- `docs/repo_review_70.md`
- `docs/repo_review_71.md`
- `docs/repo_review_72.md`
- `docs/repo_review_73.md`
- `docs/repo_review_74.md`
- `docs/repo_review_75.md`
- `docs/repo_review_76.md`
- `docs/repo_review_77.md`
- `docs/repo_review_78b.md`
- `openspec/changes/align-cashier-layouts-to-prototype/.openspec.yaml`
- `openspec/changes/align-cashier-layouts-to-prototype/design.md`
- `openspec/changes/align-cashier-layouts-to-prototype/evidence.md`
- `openspec/changes/align-cashier-layouts-to-prototype/proposal.md`
- `openspec/changes/align-cashier-layouts-to-prototype/specs/cashier-layout-alignment/spec.md`
- `openspec/changes/align-cashier-layouts-to-prototype/tasks.md`
- `openspec/changes/development-preview-framing/proposal.md`
- `openspec/changes/development-preview-framing/specs/preview-framing/spec.md`
- `openspec/changes/review-78b-prototype-parity-closure/.openspec.yaml`
- `openspec/changes/review-78b-prototype-parity-closure/design.md`
- `openspec/changes/review-78b-prototype-parity-closure/proposal.md`
- `openspec/changes/review-78b-prototype-parity-closure/specs/frontend-prototype-parity/spec.md`
- `openspec/changes/review-78b-prototype-parity-closure/tasks.md`

The inventory includes unrelated source, documentation, generated/cache, image, and OpenSpec work. It is preserved as-is and is not evidence of Phase 1 changes.

## Comparison inputs and route mapping

The committed prototype reference directory is `apps/web/public/prototype/`. Its relevant pages and production routes are:

| Prototype reference           | React route/component                                                | Comparison role                                                               |
| ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `login-page.html`             | `/login` → `LoginForm`                                               | Login grouping, fields, password toggle, CTA, and presentation-only role list |
| `overview-dashboard.html`     | `/cashier` → `CashierOverviewLookup`                                 | Overview hierarchy and bounded activity presentation                          |
| `find-customer.html`          | `/cashier/lookup` → `CashierWorkflowRoute`                           | Search, scan, discovery, and verified-card presentation                       |
| `capture-purchase.html`       | `/cashier/earn` → `CashierWorkflowRoute` + `EarnTransactionForm`     | Four-stage earn workflow and outcome presentation                             |
| `redeem-credit.html`          | `/cashier/redeem` → `CashierWorkflowRoute` + `RedeemTransactionForm` | Distinct redemption stages and outcomes                                       |
| `register-customer.html`      | Focused Supervisor/Admin registration route (planned mapping)        | Registration presentation; authorization remains production-owned             |
| `transactions-dashboard.html` | `/cashier/transactions` → `TransactionDashboard`                     | Bounded table and detail-dialog presentation                                  |
| No complete prototype page    | `/cashier/sync` → `CashierSyncPage`                                  | Derived production composition; not claimed as direct prototype parity        |

The comparison reference inventory is also the committed `Landing-1.png` through `Landing-18.png` set (plus the existing named captures). React screenshots are not prototype proof.

## Deployment/runtime distinction

The Review 78b source records two previews built from the same published implementation SHA (`0b569770bb76`):

- **Functioning comparison target:** Vercel project/preview identified as `shopcity-lp`. Review checks returned HTTP 200 for `/login`, `/cashier`, and several standalone prototype pages. `/cashier` still requires a staff session before operational content can be assessed. Use this target, or separately launched local servers, for visual comparison.
- **Failing alternate preview:** Vercel project/preview identified as `web`. Review checks repeatedly returned HTTP 500 / `FUNCTION_INVOCATION_FAILED` for `/login`; prototype requests were redirected through deployment protection. This is a deployment issue, not visual parity evidence, and must not be mixed with `shopcity-lp` results.
- Exact deployment URLs are not present in `docs/repo_review_78b.md`; project identity and candidate SHA are the recorded deployment anchors rather than invented URLs.

## Same-SHA comparison contract

A parity claim is valid only when both targets use the same candidate SHA (`0b569770bb76e32cf166a1e44a8df8368afc26b2`) and record the same:

1. route mapping, role, and deterministic data/state;
2. viewport, with the exact desktop target **1440 × 923 CSS pixels**;
3. browser and relevant reduced-motion/accessibility settings; and
4. prototype reference file and React implementation target.

The prototype is a static presentation reference. Deterministic intercepted responses may be used for prototype/React state comparison; prototype scripts must never be run against live customer accounts. Structural DOM/page-content evidence precedes geometry and screenshot evidence, and updated React snapshots cannot establish parity with the original prototype.

Tablet/mobile checks remain responsive-conformance checks where no approved original design exists, not pixel-exact desktop parity.

## Environment limitations

The Review 78b run could not clone the private worktree into its local runner, could not connect to the Opera browser connector, and therefore could not claim two fresh local servers, new browser screenshots, or an authenticated click-through. The reproducible local procedure remains:

```bash
cd apps/web && npm ci && npm run dev -- -p 3100
cd apps/web/public/prototype && python3 -m http.server 3101
```

Use `http://localhost:3101/<prototype-page>.html` against its mapped React route on `http://localhost:3100`; record unavailable local/browser evidence as unavailable rather than passing.

## Phase 1 impact and login correction

Before editing `LoginForm`, exact upstream GitNexus impact was run:

```text
node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/components/auth/login-form.tsx LoginForm
```

Result: `LOW` risk, exact target `LoginForm`, 1 direct upstream dependant, 0 affected processes, and 0 affected modules. The direct dependant is the login page. This remains a presentation seam; backend auth, session, RBAC, and role authority are out of scope.

Phase 1 login behavior preserves the prototype role-list grouping while making unsupported Owner unavailable and explicit. The role input remains presentation-only; `handleSubmit` continues to route from the backend-returned `data.user.role`, never from a selected client role. Focused tests cover Owner unavailability and backend-returned role authority alongside existing device-secret handling.

After editing, GitNexus `detect_changes --scope all` reported the aggregate dirty tree as `MEDIUM` (13 files, 11 symbols, 4 affected LoginPage flows: `ReadCookie`, `ArrayBufferToBase64Url`, `Input`, and `Button`). This is not a new backend/auth/session/RBAC dependency: the required pre-edit exact upstream result was LOW, and the detected flow list is the existing LoginForm/helper/component execution surface combined with unrelated dirty-tree modifications. No backend, auth, session, RBAC, financial, or queue file was changed by this phase.

## Checklist status

- [x] 1.1–1.5: baseline, deployment distinction, route/state/viewport contract, evidence requirements, and DOM/page-content comparison contract frozen.
- [x] 2.1: unsupported Owner presentation corrected without changing backend/auth/session/RBAC contracts.
- [x] Focused LoginForm tests updated for the presentation behavior.
- [x] 5.4: GitNexus change detection ran and final status/diff scope was inspected; its aggregate MEDIUM result is recorded above.
- [x] 2.2: Overview loaded-empty metrics render `0`, unavailable activity renders `—`, redemption count is labeled `Redemptions`, and the destination wording names today’s bounded feed.
- [x] 2.3: Shared shell geometry remains centralized at 244px/76px sidebar widths, 64px topbar, 1120px main maximum, and 300px shared-search maximum; existing role-route conformance checks cover Cashier, Supervisor, and Admin.
- [x] 2.4: Focused search tests cover Cashier Customers/Cards and Supervisor/Admin Customers/Cards/Cashiers; shell tests retain the disabled presentation-only notification surface.
- [x] Phase 2 focused validation: Jest overview/search/shell suites (24 tests), web TypeScript check, and strict OpenSpec change validation passed. Pre-existing dirty-tree changes remain untouched.
- [ ] 2.5–5.3 and 5.5: remaining route implementation and certification tasks remain open.

## Phase 3 workflow structure and accessibility evidence

The Phase 3 implementation remained bounded to frontend presentation/accessibility. `CashierWorkflowRoute` now exposes stable heading/stage landmarks for Find Customer, Capture Purchase, and Redeem; the lookup state is an explicit polite status region; Escape clears lookup/discovery state and restores focus to the search control; and the verified-card handoff is separately identifiable. Directory discovery remains actionless until exact active-card lookup succeeds. Existing controller behavior continues to own stale-response generation, exact card lookup, tenant/branch scope, masking, and deep-link context.

Capture Purchase retains the persistent flow panel and Find → Confirm → Receipt details → Review hierarchy, receipt number, `MoneyInput` kobo values, authoritative lookup context, and controller draft/idempotency/offline behavior. The outcome region is explicit. Confirmed and approval-pending outcomes now have different headings/visual treatment; error/uncertain text remains in the outcome status region. No prototype-only Till field was added.

Redeem retains its narrower `720px` flow panel and distinct basket → requested credit → confirmation hierarchy. Available credit remains authoritative lookup context, and the presentation now shows remaining payable amount (`basket − requested`) in the redemption summary and confirmation. Pending approval is explicitly headed as pending and states it is not a completed debit. No offline redemption queue or enablement exists; connectivity failure remains the existing error/recovery path.

Focused validation:

```text
cd apps/web && ../../node_modules/.bin/jest tests/cashier-lookup.spec.tsx tests/transaction-forms.spec.tsx --runInBand --config jest.web.config.cjs
# 2 suites, 22 tests passed
cd apps/web && ../../node_modules/.bin/tsc --noEmit --pretty false
# passed
cd apps/web && node --test ./scripts/check-cashier-style-ownership.spec.mjs ./scripts/token-validation.spec.mjs
# 13 tests passed
```

The focused ESLint command remains unavailable in this checkout because the installed `eslint-config-next` fails its Rushstack patch under ESLint 9.39.5; this is an environment/tooling residual, not a lint finding. Fresh prototype/browser screenshots and authenticated Playwright click-through remain unavailable per the baseline limitations. No generated artifacts or screenshot baselines were changed.

GitNexus `detect-changes -r shopcity_LP --scope all` returned aggregate **CRITICAL** for 25 dirty files / 18 symbols and 24 affected flows. This is the accumulated dirty-tree scope (including prior login, overview, shell, docs, and configuration work), not a Phase 3-only blast radius; the Phase 3 source symbols are the bounded workflow route/forms recorded above. No files were staged.

## Phase 4 registration, transactions, and sync evidence

Before Phase 4 source edits, exact upstream GitNexus impact with tests included was run and recorded in `docs/development/gitnexus-impact-tracker.md`. `CustomerWorkspace` returned **CRITICAL** (6 direct dependants, 5 affected processes); it was not edited. `useCustomerRegistrationController` returned **CRITICAL** (1 direct dependant, 5 affected processes, 7 impacted symbols); its only change preserves a single create idempotency key until the registration succeeds, so uncertain retries retain one logical request.

Focused registration composition is implemented in `CustomerRegistrationFlow` and mounted at `/supervisor/customers/new` and `/admin/customers/new`. The DOM landmarks are `register-page`, `register-flow`, `register-information`, `register-review`, and `register-result`. It intentionally contains supported profile/email/initial-card data only; birthday and marketing-consent prototype fields are not fabricated. Existing `CustomerWorkspace` remains the broader search/detail/card-management surface.

Transactions and Sync Queue were verified without source behavior changes. `TransactionDashboard` retains heading/refresh → filters/toolbar → bounded table → footer/pagination → two-column detail dialog, honest bounded report wording, density and responsive treatment. `CashierSyncPage` remains explicitly derived (no complete prototype HTML exists) and retains shared metrics/status, toolbar, table/badges/actions, detail dialog, mobile reading order, IndexedDB persistence, authenticated device binding, per-record reconciliation, and retry/error behavior. No screenshot baseline was changed.

Phase 4 focused test coverage is `apps/web/tests/customer-registration-flow.spec.tsx`; it verifies focused fields, excludes unsupported birthday/marketing controls, and asserts the same `Idempotency-Key` is used after an uncertain create response. Existing `transaction-dashboard.spec.tsx`, sync/offline queue tests, and design-system ownership checks remain the evidence for the verified unchanged supporting workspaces.

## Phase 5 certification run (2026-09-23)

The certification was run against the dirty worktree without reset, stash, stage, or overwrite. No application source, generated file, reference image, or screenshot baseline was changed by certification. The final tree remains unstaged and `git diff --check` is clean.

### Gate matrix and exact results

| Gate                           | Command                                                                                                                                    | Result                         | Evidence / blocker                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict OpenSpec validation     | `npm run openspec:validate`                                                                                                                | PASS                           | 23 changes passed, 0 failed.                                                                                                                                                                                                                                                                                      |
| Frontend lint                  | `npm --prefix apps/web run lint`                                                                                                           | PASS with 2 warnings           | No errors. Existing `react-hooks/exhaustive-deps` warnings remain in `apps/web/components/global-shell-search.tsx:24,58`.                                                                                                                                                                                         |
| Frontend typecheck             | `npm --prefix apps/web run typecheck`                                                                                                      | PASS                           | `tsc --noEmit` exited 0.                                                                                                                                                                                                                                                                                          |
| Frontend Jest                  | `npm --prefix apps/web run test`                                                                                                           | PASS                           | 18 suites / 83 tests passed; token drift and design-system tests passed.                                                                                                                                                                                                                                          |
| Frontend accessibility Jest    | `npm --prefix apps/web run a11y:test`                                                                                                      | PASS                           | 18 suites / 83 tests passed.                                                                                                                                                                                                                                                                                      |
| Root Jest                      | `npm test -- --runInBand`                                                                                                                  | PASS                           | 56 suites / 290 tests passed. Expected outbox/throttle warning logs were emitted by tests.                                                                                                                                                                                                                        |
| Browser accessibility          | `cd apps/web && PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test --config ./playwright.config.ts tests/browser-a11y.spec.ts`                | PASS                           | 3 tests passed, including shared shell, Cashier controls, and mobile drawer focus/escape. A temporary local server was used on port 3100.                                                                                                                                                                         |
| Critical Playwright            | `cd apps/web && PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test --config ./playwright.config.ts --grep @critical`                          | PASS                           | 4 critical tests passed.                                                                                                                                                                                                                                                                                          |
| Conformance Playwright         | `cd apps/web && PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts -g 'overview | visually paired                | prototype landmarks                                                                                                                                                                                                                                                                                               | transaction detail | Sync Queue controls'` | BLOCKED / FAIL | 8 tests passed; `prototype landmarks inside the 1440px route geometry` failed because `prototype-customer-search.png` expected 640x108 but received 640x126. The first concurrent invocation also hit port 3100 contention; the isolated rerun removed that environment issue. |
| Visual regression Playwright   | `npm --prefix apps/web run visual:test`                                                                                                    | FAIL                           | 66 passed, 3 failed: login surface (428 differing pixels, ratio 0.01), redeem review (expected 1658px height, received 1750px), and prototype customer-search (expected 108px, received 126px). No snapshots were updated.                                                                                        |
| Design-system ownership/tokens | `npm --prefix apps/web run design-system:test`; `npm --prefix apps/web run tokens:check`                                                   | PASS                           | 13 design/token tests passed; token outputs are in sync.                                                                                                                                                                                                                                                          |
| Web production build           | `npm --prefix apps/web run build`                                                                                                          | PASS with same 2 lint warnings | Next compiled successfully and generated 37 static pages. No source or baseline files changed.                                                                                                                                                                                                                    |
| Backend build                  | `npm run build`                                                                                                                            | PASS                           | Nest build exited 0.                                                                                                                                                                                                                                                                                              |
| Semgrep                        | `semgrep --config auto --error --exclude apps/web/.next --exclude apps/web/test-results --json apps/web`                                   | PASS with environment warnings | 0 findings across 161 tracked files / 398 rules. Semgrep emitted 196 non-blocking Pro-rule internal matching warnings because the available engine was non-Pro.                                                                                                                                                   |
| Prototype reference inventory  | `npm run verify:prototype-reference`; `npm run test:prototype-reference`                                                                   | PASS                           | Reference directory check passed (10 assets); 1 verification test passed.                                                                                                                                                                                                                                         |
| Manifest / 1440x923 contract   | `cd apps/web && PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test --config ./playwright.config.ts tests/prototype-acceptance.spec.ts`        | PASS                           | 1 test passed; all route manifest entries require 1440x923 and reference dimensions.                                                                                                                                                                                                                              |
| Prototype static serving       | `python3 -m http.server 3132 --directory apps/web/public/prototype` plus `curl` for all HTML pages                                         | PASS                           | All 8 prototype HTML pages returned HTTP 200. This verifies source serving only, not visual parity.                                                                                                                                                                                                               |
| GitNexus change detection      | `node scripts/gitnexus.cjs detect-changes -r shopcity_LP --scope all` and direct `gitnexus detect-changes --repo shopcity_LP --scope all`  | BLOCKED                        | Both attempts were killed with exit 137 (runner memory limit). A no-repository direct attempt correctly reported multiple indexed repositories; no successful current-run result is claimed. The previously recorded aggregate dirty-tree result remains CRITICAL and is not presented as a fresh Phase 5 result. |
| Diff/status hygiene            | `git diff --check`; `git diff --cached --name-status`; `git status --short --branch`                                                       | PASS                           | `git diff --check` exited 0; cached name-status was empty; no staged files.                                                                                                                                                                                                                                       |

### Prototype comparison and viewport evidence

The exact 1440×923 contract was verified structurally by `prototype-acceptance.spec.ts` and by the route-landmark Playwright test. Responsive conformance also passed for the overview, lookup, workflow pairing, and Sync Queue scenarios at the test's 1024/900, 390/844, 375/812, and 768/900 viewports. The route-landmark comparison is not fully passing because the customer-search crop is 18px taller than its stored baseline; the visual regression suite also reports the login and redeem baseline mismatches listed above. These are blockers, not silently accepted parity claims.

Fresh same-SHA side-by-side browser screenshots against both a local standalone prototype server and authenticated React routes are **not available as certification evidence**: the available browser connector was disconnected, and no authenticated deployment click-through was performed. The static prototype server was independently started and all eight HTML pages returned HTTP 200. Existing recorded deployment evidence remains separated: the `shopcity-lp` preview returned HTTP 200 for selected routes but `/cashier` still requires a staff session; the alternate `web` preview returned `/login` HTTP 500 / `FUNCTION_INVOCATION_FAILED` and is not parity evidence. No exact deployment URLs are invented.

### Backend and semantic scope review

Final changed paths are confined to the frontend, frontend tests/styles/configuration, design/reference documentation, OpenSpec documentation, and pre-existing unrelated dirty-tree files. There are no changed paths under `src/`, `api/`, `prisma/`, backend `test/`, database migrations, or queue worker code. The reviewed frontend changes preserve backend-owned auth/session/RBAC authority, kobo-safe financial handling, active-card verification, idempotency/draft recovery, offline earn capture, no offline redemption, IndexedDB/device binding, and per-record sync reconciliation. Root Jest (56/290), web Jest (18/83), accessibility, critical-flow, workflow, offline, and sync tests passed. This supports 5.3 as complete without claiming that unavailable authenticated browser evidence passed.

### Dirty-tree attribution and rollback

The baseline inventory in this file predates this change and includes unrelated tracked edits (`AGENTS.md`, `CLAUDE.md`, `apps/web/app/(shell)/admin/page.tsx`, `apps/web/app/(shell)/supervisor/page.tsx`, web config/cache files, `docs/development/gitnexus-impact-tracker.md`, `docs/frontend/design-system/tokens.json`, and `package-lock.json`) plus untracked captures, earlier review documents, and other OpenSpec changes. The attributable Review 78b surface is the mapped frontend route/controller/style/test work (`login-form.tsx`, the cashier overview/transaction/earn/redeem workflow files, shared cashier CSS, and their focused specs), focused registration route/component/test files, prototype/reference evidence, and this change's OpenSpec documentation. Git status still shows both sets together; no unrelated path was reset, staged, or overwritten. Current GitNexus attribution could not be recomputed because the process was killed by the runner memory limit; the recorded prior dirty-tree CRITICAL result therefore remains aggregate, not change-only.

Rollback status: **available and documented, not executed**. The approved rollback is slice-by-slice revert of Review 78b route presentation/controller composition and evidence changes only; do not revert unrelated dirty-tree files, backend/API/auth/RBAC contracts, financial history, database migrations, offline state, or queue state. Because visual baselines were not updated, rollback does not require screenshot restoration.

## Prototype-close visual alignment follow-up (2026-09-23)

Per the owner decision to choose the options closest to the prototype pages, the following presentation-only corrections were applied in `apps/web/styles/cashier-routes.css`:

- Find Customer retained its complete lookup hint and `aria-describedby` relationship while changing hint typography to the prototype's single-line rhythm. The desktop landmark now measures **640x108** instead of **640x126**, without fixed-height cropping, hidden content, or semantic changes.
- Redeem retained basket, available-credit context, requested redemption, remaining payable amount, confirmation, pending distinction, and no-offline safeguards. Scoped redeem step/review spacing now produces the stored **1120x1658** review height instead of **1120x1750**.
- Login was not visually falsified: the remaining stored diff is **428 pixels / 0.01 ratio**, confined to the intentional unavailable Owner treatment. Owner remains disabled and backend role authority remains unchanged.

Focused Jest, typecheck, design-system/token checks, lint (two pre-existing warnings), build, Semgrep, OpenSpec, and diff hygiene passed after alignment. The certifier/worker recorded the customer-search landmark pass, Redeem review pass, and final Redeem outcome pass at **1120x1979**. No screenshot baselines were updated. Fresh authenticated side-by-side browser evidence remains unavailable. GitNexus detection was subsequently rerun directly after index repair and is recorded below.

### Phase 5 checklist status

- [ ] 5.1: not complete; lint/typecheck/Jest/a11y/design-system/build/Semgrep passed, but one conformance visual test and three visual regression tests failed.
- [ ] 5.2: not complete; structural/reference and responsive checks passed, but fresh side-by-side browser evidence is unavailable and stored visual comparisons have the documented mismatches.
- [x] 5.3: complete; final paths and passing semantic/offline/queue coverage show no backend/API/auth/RBAC/financial/offline/queue implementation change.
- [ ] 5.4: not complete; GitNexus `detect_changes` was attempted but killed with exit 137, so the prior aggregate result is retained as context only.
- [x] 5.5: complete; strict OpenSpec validation passed, residual risks are recorded above, and rollback guidance is documented.

## Final-blocker continuation (2026-09-23)

The prior partial worker state was retained. No backend, API, schema, auth/session, RBAC, financial, offline, queue-processing, generated, or screenshot-baseline files were reverted or broadened.

### Login presentation and authority

- `LoginForm` now renders exactly three presentation radios: `Cashier / Loyalty Staff`, `Supervisor`, and `Administrator`. There is no Owner radio or Owner copy in the rendered role selector.
- The focused backend-authority regression remains passing: selecting Supervisor and receiving `data.user.role = SUPERVISOR` navigates to `/supervisor`; navigation continues to use the backend response, not the client-selected role. No backend role authority was changed.
- Focused command: `cd apps/web && ../../node_modules/.bin/jest --config ./jest.web.config.cjs tests/login-form.spec.tsx tests/transaction-forms.spec.tsx --runInBand` — **PASS**, 2 suites / 14 tests, 0 snapshots.

### Redeem outcome browser gate

- Focused command: `cd apps/web && PLAYWRIGHT_SKIP_WEBSERVER=1 timeout 180s ./node_modules/.bin/playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts --grep "covers authoritative Earn and Redeem outcomes" --workers=1 --max-failures=1 --timeout=30000` — **PASS**, 1 test (8.6s).
- The scenario exercised the authoritative successful Redeem flow at desktop and 390px, asserted no horizontal overflow, and captured the existing outcome snapshot comparison. The stored Redeem outcome reference is 1120×1979; the passing run required no CSS follow-up and no screenshot update. Outcome content, pending/error distinctions, money semantics, accessibility landmarks, and financial/accessibility behavior remain unchanged.
- The previously recorded 1979-versus-1960 mismatch is stale after the current partial CSS state; it is not reasserted as a current failure. No screenshot baselines were updated.

### Required focused checks

| Gate                                 | Command                                                                                  | Result                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| Web typecheck                        | `npm run web:typecheck`                                                                  | **PASS**, `tsc --noEmit`                  |
| Design-system ownership/token checks | `npm --prefix apps/web run design-system:test`; `npm --prefix apps/web run tokens:check` | **PASS**, 13 tests; token outputs in sync |
| OpenSpec strict validation           | `npx --yes @fission-ai/openspec validate review-78b-prototype-parity-closure --strict`   | **PASS**, change valid                    |
| Diff hygiene                         | `git diff --check`                                                                       | **PASS**                                  |

### GitNexus refresh and bounded detection

- First refresh attempt: `npm run gitnexus:analyze` failed with the exact LadybugDB error: `FTS index 'file_fts' is inconsistent: document for node offset 1567 is missing during delete. Drop and recreate the FTS index.`
- Repair/fallback: `./node_modules/.bin/gitnexus clean --force` completed successfully, then the repo-supported `npm run gitnexus:analyze` completed successfully in 104.7s: **13,392 nodes, 21,593 edges, 403 clusters, 300 flows**. `gitnexus status` reported the index current for commit `0b56977`.
- Initial bounded rerun: `node scripts/gitnexus.cjs detect_changes -r shopcity_LP --scope unstaged --limit 25` returned wrapper exit 1 and the direct runner was killed with exit 137.
- Final direct rerun: `./node_modules/.bin/gitnexus detect_changes --repo shopcity_LP --scope unstaged --limit 25` completed successfully. It reported **26 files, 26 symbols, 30 affected processes, CRITICAL aggregate risk**. The result includes the accumulated dirty tree (including AGENTS/CLAUDE, admin/supervisor, login, cashier workflows, tests, styles, and documentation), so it is not a change-only risk assessment. The current index is healthy and up to date; no detection result is fabricated.

### Final status and residual risks

- `git diff --check` passed; `git diff --cached --name-status` was empty; final `git status --short --branch` showed the existing dirty worktree on `workflow-states-implementation` with no staged files.
- Residual risks: the full certification matrix and fresh authenticated side-by-side prototype comparison remain incomplete; GitNexus now detects the dirty tree when the runner completes but can still hit exit 137 under current memory pressure, and reports CRITICAL aggregate scope because unrelated changes are present. Existing unrelated dirty files remain preserved and are not attributed to this continuation. Rollback remains slice-by-slice only; no screenshot restoration is needed.

## Post-remediation verification (2026-09-23)

- Owner login information is removed from the presentation entirely; only Cashier, Supervisor, and Admin are rendered. Backend-returned role navigation remains authoritative. Focused login/transaction Jest remains passing at **14 tests**.
- The focused combined workflow Playwright run for `covers authoritative Earn and Redeem outcomes` and `keeps prototype landmarks inside the 1440px route geometry` passed **2/2**, including customer-search `640x108` and Redeem outcome `1120x1979`.
- Web typecheck, OpenSpec strict validation, and diff hygiene passed after the remediation.
- A fresh full visual-regression invocation could not start because port `3100` was already occupied; the direct `--grep-invert @critical` attempt against the existing server timed out after 7 of 72 tests. This is an environment limitation, not a fabricated pass.
- A subsequent direct GitNexus detection attempt again exited `137`; the previously successful direct result remains recorded as the latest complete detection (**26 files, 26 symbols, 30 processes, CRITICAL aggregate dirty-tree risk**). The repaired index itself remains current according to `gitnexus status`.
