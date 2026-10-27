# Execution plan: unify Cashier presentation safely

## 1. How to execute this package

Read in order: `proposal.md` → `audit.md` → `design.md` → both `specs/*/spec.md` → this plan → `tasks.md`. The specifications define acceptance, the design records implementation decisions, and task checkboxes track completed work, not intentions.

This is an implementation-ready **plan**, not evidence that the refactor has run. Start with phase 0. Do not skip baseline capture because the index or screenshots look recent. The source branch can advance after this proposal.

Working rule for every slice:

1. Record current SHA/status and preserve unrelated work.
2. Run GitNexus upstream impact for actual symbols to be edited; report HIGH/CRITICAL warnings before editing.
3. Add/confirm a failing or characterization test for the affected contract.
4. Move appearance to its designated owner and migrate consumers without changing domain logic.
5. Run focused behavior, conformance and visual checks; inspect diffs and cross-route effects.
6. Delete obsolete duplicate rules in that same completed slice, not in an untested final sweep.
7. Update evidence/tasks only after the slice passes. Keep failing tasks open.

No commit, deployment, production write, database operation, or destructive cleanup is authorized by this plan alone.

## 2. Dependency graph and work ownership

```text
P0 baseline/reference inventory
  └─ P1 canonical tokens + cascade foundation
       └─ P2 shared primitives/product components + conformance harness
            └─ P3 operational shell compatibility
                 └─ P4 Overview canonical composition
                      └─ P5 Find Customer + Earn + Redeem grouped migration
                           └─ P6 Transactions + modal
                                └─ P7 Sync Queue presentation
                                     └─ P8 cleanup + complete acceptance evidence
```

Keep the primary sequence serial: all phases touch shared visual dependencies. Read-only audits or fixture design may run in parallel, but never allow two writers to edit `globals.css`, tokens, primitive styles or shared components concurrently in one working tree. Once the shared API is stable, independently isolated route work may be proposed, but integration still follows these gates. Prefer several small reviewable slices inside a phase over one large extraction.

Roles: implementer owns source/tests; independent reviewer owns visual/reference comparison and behavioral diff review; product/design owner approves new visual deviations and the derived Sync baseline. In a single-engineer workflow, retain explicit review checkpoints and do not claim independent approval.

## 3. P0 — Freeze context, references and behavior

### Work

- Capture `git rev-parse HEAD`, branch, full status and changed-file inventory. Distinguish user-owned existing edits from this change. Do not include untracked root screenshots or frontend setup files automatically.
- Re-read current relevant OpenSpecs and refresh GitNexus if source moved. Repeat proposal-time findings on the final planned symbols, resolving `Button` with `--kind Function`.
- Build a selector ownership table: selector/token, current files, intended owner, consumers, variant, deletion task, exceptions. Include nested style blocks, inline layout constants, bare button rules, undefined custom properties, Tailwind/preflight interaction and root-layout imports.
- Inventory all six routes, actual workflows, labels, requests, controller mount boundaries, `data-od-id` landmarks and supported states. Identify which financial verified/confirmation snapshots represent the same render.
- Freeze reference provenance. Keep committed `figmaExport` assets pinned to `410ecd75`; preserve manifest's existing Supervisor Transactions entry and add a separate Cashier mapping. Add a derived-reference path/provenance mechanism for Sync rather than claiming a missing Figma asset. Update manifest consumer tests deliberately if its schema/entry count changes.
- Document exact font stacks and browser-resolved fonts used in CI. Do not add a downloadable font dependency simply to improve one local screenshot.
- Capture before screenshots/computed styles for six Cashier pages and representative login, Supervisor registration/approvals/reports and Admin surfaces. Capture both expanded/collapsed shell and mobile drawer.
- Run baseline web lint/typecheck/Jest/accessibility, build, focused browser workflows and reference verification. Record pre-existing failures with logs and ownership; do not silently rebaseline them.

### Deliverables and gate

Create `docs/frontend/design-system/cashier-conformance-matrix.md` and a change-specific evidence directory (recommended `docs/release-evidence/cashier-design-system/`). Record reference, route/state, viewport, fixture, required/not-applicable status and reason. Initial audit must explicitly state that default Playwright viewport differs from the reference viewport.

**Exit:** test/reference inventories and source boundaries are concrete; any failing baseline gate has a resolution path. You may investigate pre-existing failures but cannot claim implementation acceptance while a required failure remains unresolved.

## 4. P1 — Canonical tokens and CSS entry structure

### Target files

- `docs/frontend/design-system/tokens.json`
- `apps/web/scripts/generate-tokens.mjs`, `check-token-drift.mjs`
- `apps/web/styles/tokens.css` (generated)
- `apps/web/styles/globals.css`, new `base.css`, scoped page-style files
- New tests for generation/alias/reference validity

### Work

1. Inventory all existing token consumers, including non-Cashier routes. Establish canonical semantic mappings from `design.md` and keep compatibility aliases one-way.
2. Add generator/validation tests for existing aliases, newly canonical aliases, missing references, cycles and stable output. If adding groups, explicitly teach the generator to traverse them. Do not put an unvisited group in JSON and assume it emits variables.
3. Move reset/layout-free base rules out of generator output into `base.css`; regenerate with `npm run web:tokens:generate`.
4. Extract non-Cashier login/page rules with equivalent selector scope. Keep Tailwind import and existing layer precedence until deliberate tests demonstrate the intended replacement.
5. Remove the broad product-layout `button` rule only after enumerated consumers get explicit component classes; neutral font resets may remain.
6. Resolve invalid success/warning tokens in migrated consumers. Contrast-check actual foreground/background combinations before approving canonical accent/text values.

### Gate

Deterministic token check, invalid-alias negative tests, source-reference check, Next production build and baseline cross-role/primitive screenshots pass. Any changed non-Cashier appearance is explained and approved or prevented through a supported variant. No page-owned theme aliases are introduced.

## 5. P2 — Shared components and executable conformance harness

### Target files

Existing `components/ui/{button,input,select,alert,badge,table,dialog}.tsx`, relevant primitive CSS, `components/shopcity/`, and new modular component styles. Existing `Money`/MoneyInput and status wrappers are reused, not replaced.

### Work

- Define one variant matrix for controls, cards, statuses and density. Preserve compact/standard/large and native props. Default operational card: white surface, 1px border, 16px radius, no decorative gradient/elevation.
- Add the thin components listed in `design.md`. Keep requests, scanner subscriptions, filtering, timers and state machines outside visual wrappers.
- Resolve shared dialog behavior before Transactions migration: use the existing transaction modal's keyboard/focus contract as minimum parity, and test the generic primitive before substituting it. Verify focus containment on loading/error content and restoration if a trigger disappears (safe fallback target).
- Create proposed `apps/web/tests/design-system-conformance.spec.ts` for browser computed-style checks, plus a fixture/helper with canonical expected values and route/state selectors. Do not use this filename with `.tsx` if it is meant for the current Playwright matcher.
- Add a static ownership checker and its tests under `apps/web/scripts/` (proposed `check-cashier-style-ownership.mjs`). Wire proposed scripts `design-system:check` and `design-system:test` in the web package once implemented; these scripts do not exist at proposal time.
- Static checking should parse or robustly inspect CSS/TSX with existing repository tooling. Catch nested/aliased style objects and actual selectors; a grep-only check can be a diagnostic but is insufficient proof. Limit initial enforcement to migrated paths plus shared component CSS, with an enumerated external/custom-property allowlist.
- Add a small primitive fixture for state/variant combinations not present on every real route. It complements actual-route coverage and must not replace it.

### Computed-style contract

For equivalent component/variant/size/state/viewport compare `font-family`, resolved `font-size`, `font-weight`, `line-height`, text color, control height/min-height, border widths/styles/colors, radius, background, four padding sides, gap and focus outline/shadow. Control width is context-owned unless a specific size variant defines it. Loading must not alter height or padding. A label-length difference may alter width and is not a conformance failure.

Normalize values using the same browser/computed-style representation; compare token-resolved colors, not raw hex versus OKLCH strings. Wait for `document.fonts.ready` and stable controlled state. Expect exact discrete values and at most 1 CSS pixel for documented subpixel layout measurements; do not use a broad tolerance to hide a different control variant.

Assert both equality between routes and expected values from the canonical fixture. A shared control that looks identically wrong on all pages must fail. For focus, use keyboard navigation; for hover, disabled, loading, invalid and read-only, drive real states rather than merely attaching CSS classes.

### Gate

Unit/accessibility tests for wrappers/variants, negative static tests, cross-route initial style comparisons and a production build pass. The conformance harness must prove it detects a deliberately mutated token/override in test fixtures without modifying production source as part of the test run.

## 6. P3 — Extract operational shell styles without reverting features

### Target files

`app-shell.tsx`, `app-sidebar.tsx`, `app-topbar.tsx`, `global-shell-search.tsx`, `shell-navigation-icon.tsx` only where presentation needs extraction; `styles/shell/**`; existing shell/search tests.

### Work

- Move shell-local appearance to explicit shared classes. Keep 244px expanded / 76px collapsed desktop widths, persistence, accessible toggle labels and the mobile drawer contract.
- Preserve search groups/authorization, request debouncing, explicit card lookup, stale-request handling, keyboard navigation, Escape, deep links and focus behavior.
- Apply shared search appearance without forcing global search to behave like a submit-only lookup form. Do not add a notification bell removed by the newer search change.
- Preserve Help & Training, logout, connection status, account identity, existing screen-reader diagnostics and backend-owned role routing.
- Test breakpoint edges using existing shell expectations plus the viewport matrix. Respect reduced motion and verify that overlay stacking does not conflict with new modal styles.

### Gate

`app-shell.spec.tsx`, `shell-navigation.spec.tsx`, `global-shell-search.spec.tsx`, session tests and existing sidebar browser scenarios pass. No route access, focus behavior or logout effect changes. Repeat login/Supervisor/Admin visual smoke checks after shell CSS extraction.

## 7. P4 — Make Overview the canonical composed page

### Target files

`app/(shell)/cashier/page.tsx`, `components/workflows/cashier-overview-lookup.tsx`, shared header/card/table/status/search CSS and `layouts/cashier.css`.

### Work

- Replace both embedded style owners with shared components/classes in one coherent slice.
- Keep four-metric composition, actual existing labels/derived values, bounded feed, authorized quick actions, query behavior, table footer and route destinations.
- Use one header rhythm, metric treatment, table header/divider/density and search style. No per-page primary-button radius/height override.
- Capture empty/loading/error/normal data and long-value fixtures. Verify wrapped labels and integer-kobo display on mobile.

### Gate

Overview functional tests, token checks, conformance assertions, desktop/tablet/mobile screenshots and relevant accessibility checks pass. Approve this composition as a shared-pattern example, not a template requiring every page to use the same metric count.

## 8. P5 — Migrate Find Customer, Capture Purchase and Redeem together

### Target files

`cashier-transaction-route.tsx`, `verified-card-lookup-step.tsx`, `earn-transaction-form.tsx`, `redeem-transaction-form.tsx`, corresponding route wrappers only if necessary, `styles/components/workflow.css`, forms/search/status CSS.

### Work

1. Characterize current lookup/confirmation/back/reset behavior and form-controller mount lifecycle before changing wrappers.
2. Extract common header/search/result/status/form-action presentation. Preserve input IDs, label text, refs and scanner focus target.
3. Establish one stable financial panel owner. Remove duplicate outer wrappers/empty Earn stage; let both initial lookups consume the same panel content composition.
4. Replace positional selectors with explicit panel/heading/content/actions/step classes and display-only state metadata. Width differences are named variants, not descendant overrides.
5. Move static form grid/padding/margins into shared CSS; preserve controller calls, monetary parsing, request payload construction, idempotency generation, pending/approval/offline outcomes and callback behavior.
6. Preserve discovery-versus-verification distinction, masked data and query-param handoff. Never use a selected directory record to grant balance authority.
7. Keep states truthful: test confirmed, approval-required, offline-saved and failed Earn; supported Redeem success/approval/error and offline prohibition. Do not copy an Earn outcome into Redeem if unsupported.
8. Remove old style blocks and redundant classes after paired state tests pass; retain mapped `data-od-id` landmarks used by approved evidence.

### Gate

Lookup, transaction form, money, draft-persistence, API-request and offline tests pass. Existing contract/workflow browser tests pass. Paired conformance/screenshot state coverage completes before this dependency group is marked done. Route switch/reload/back actions must not create extra requests, reset an in-progress form unexpectedly or change idempotency behavior.

## 9. P6 — Transactions, table and detail modal

### Target files

`app/(shell)/cashier/transactions/page.tsx`, `transaction-dashboard.tsx`, shared filter/table/dialog components and styles; transaction dashboard/browser tests.

### Work

- Extract toolbar, search, select, table, row interaction and modal appearance; remove `.transaction-toolbar .sc-button`-style overrides.
- Preserve exact existing query/filter semantics and bounded feed copy. No new history/pagination endpoint and no fabricated audit fields.
- Adopt shared modal behavior only after parity tests pass. Keep request generation invalidation in the domain component so closing/reopening or selecting another row cannot show stale details.
- Cover Escape/backdrop/close button, focus trap/return, scrolling, loading/error details and narrow-screen geometry. Modal must remain within the viewport and allow content scrolling.

### Gate

TransactionDashboard Jest tests, existing modal workflow tests, conformance checks, accessibility and list/detail screenshots pass. Verify detail close while a request is pending and reopening a different row with out-of-order responses.

## 10. P7 — Sync Queue presentation, not synchronization redesign

### Target files

`app/(shell)/cashier/sync/page.tsx`, shared card/filter/table/status/action components and layout CSS. `lib/browser/offline-earn-queue` and generated sync client are protected behavior dependencies, not planned edits.

### Work

- Replace all static visual `CSSProperties` constants and embedded CSS with shared styles. Remove default card gradients/highlighted decoration; keep meaningful semantic statuses.
- Retain current counts/categories, record selection, details, last-batch results, search/filter behavior, retry control, refresh/subscription, busy gating, session device check and `CLEAR` confirmation.
- Ensure `saved-on-device`, waiting, syncing, awaiting approval, confirmed, rejected and retry-required records remain visible and explainable. Do not create an optimistic “confirmed” state from successful HTTP transport.
- Preserve exact per-record DTOs, idempotency keys, batch request behavior and status mapping. Do not reset persisted queue data for screenshots; use isolated seeded test storage.
- Use full-width mobile actions/stacked toolbar where needed and contained table overflow. Preserve selection and keyboard access to records.

### Gate

Offline queue/unit and local Earn reconciliation/browser tests, missing-device gating, clear-confirmed confirmation and preservation of pending records pass. Static check confirms removal of obsolete style objects. Derived Sync reference is reviewed against the canonical operational components; no unapproved baseline is treated as an original prototype.

## 11. P8 — Finish ownership enforcement and certification

- Audit the six routes and all consumed presentational components for remaining duplicate shared-style definitions. Document every allowed exception; reject static visual exceptions without concrete runtime necessity.
- Remove dead selectors/imports only after checking all role consumers and direct route loads. Do not mass-delete all globals or all prototype aliases.
- Run the complete required suite against the same final source revision. Keep browser/font/fixture environment consistent with reference evidence.
- Review screenshots and geometry, not only exit codes. Keep approved deviation records small and justified by accessibility, truthful data/security, supported behavior or explicit product approval.
- Inspect source diff for unexpected controllers/API/session/queue/storage/backend/schema changes. Run GitNexus diff analysis; separate accumulated branch changes and user-owned edits from this package's changes.
- Record command exits, logs, artifacts, reference SHA, implementation SHA, working-tree state, reviewer decisions and all remaining limitations. Require reruns after material edits.

## 12. Route/state acceptance matrix

Every route gets normal/empty/loading/error coverage where applicable and mobile overflow/keyboard checks. Use deterministic response interception and isolated storage based on existing fixtures; never hit production financial endpoints for test convenience.

| Surface             | Mandatory additional states/actions                                                                               | Evidence                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Overview            | Bounded feed, quick actions, local receipt search, zero/long values                                               | Request assertions, metric/table screenshot, shared styles                                  |
| Find Customer       | Idle, pending, no results, API/offline error, discovery, verified card, scanner, keyboard and deep-link handoff   | Lookup tests and route screenshots                                                          |
| Earn / Redeem pair  | Idle, delayed loading, error/retry, verified/confirmation, details, review, supported terminal outcomes, Back     | Matched control style reports and paired screenshots; document merged/non-applicable states |
| Earn behavior       | Pending submission, duplicate prevention, approval, local saving and later reconciliation                         | Payload/idempotency and offline assertions                                                  |
| Redeem behavior     | Limits/balance validation, pending, approval where supported, rejection, offline disallowed                       | Existing controller/contract assertions                                                     |
| Transactions        | Every filter, empty result, refresh error, detail loading/error/loaded, keyboard close, stale response            | List/modal screenshots and focus/request tests                                              |
| Sync                | All stored states, retry, device unavailable, mixed batch result, refresh, confirmed-only clear, pending retained | Queue integrity tests and derived-reference screenshots                                     |
| Shell / other roles | Expanded/collapsed, reload, drawer, search, logout, authorized navigation, representative primitive/modal users   | Existing regression suites and visual diff review                                           |

Viewport policy: all six routes at 1440×923, 768×1024, 360×800, 375×812, 390×844 for layout/overflow/conformance. Paired financial lookup states get screenshots at desktop and 375×812; details/review/outcomes get desktop plus mobile checks/screenshots. Reuse existing shell 1024px and breakpoint scenarios; test breakpoint minus/at/plus one pixel for media rules actually changed. Include reduced-motion and 200% zoom/reflow checks. Avoid a wasteful Cartesian product of every business outcome at every viewport; all states still need behavior coverage, and minimum paired visual cases cannot be silently dropped.

Control targets default to 44px standard and 48px POS. A 36px compact variant is not permission to make primary mobile workflow actions tiny; provide appropriate target spacing/area and validate accessibility. Long names, IDs, localized dates, zero/large monetary values and wrapped notices must not overlap actions.

## 13. Verification commands and when they apply

Run from repository root unless noted. Commands below are instructions for implementation, **not claimed results**.

### Existing source/token/unit/build commands

```bash
npm run web:tokens:generate
npm run web:tokens:check
npm run web:lint
npm run web:typecheck
npm run web:test
npm run web:build
npm run verify:prototype-reference
npm run test:prototype-reference
```

`web:test` includes token drift, Jest and Jest accessibility tests. `web:build` regenerates tokens. Inspect working-tree changes afterward rather than assuming these commands are read-only. Use direct web Jest invocation with its configuration for a targeted TSX test; root Jest is the backend runner, not a substitute.

### Existing browser gates

```bash
npm run web:critical:test
npm run web:visual:test
npm --prefix apps/web run a11y:browser
```

For a focused route test while iterating:

```bash
npm --prefix apps/web exec -- playwright test --config playwright.config.ts tests/workflow-routes.spec.ts
npm --prefix apps/web exec -- playwright test --config playwright.config.ts tests/contract-flows.spec.ts
```

Add `tests/design-system-conformance.spec.ts` to focused execution once created; full visual execution already includes non-critical matching specs. Use proposed `npm --prefix apps/web run design-system:check` and `design-system:test` only after wiring them. Make new gates part of the existing frontend CI validation path; if no suitable path exists, add a narrowly scoped workflow change with explicit review.

Use a known isolated dev/build server. Existing config can reuse a running server locally; verify its source/port before trusting evidence. Set `PLAYWRIGHT_BASE_URL`/`PLAYWRIGHT_SKIP_WEBSERVER` only when intentionally using that known server. Production-build smoke is recommended to catch import/cascade issues absent in dev.

### Static security and graph scope

No repo-specific Semgrep rule file was established during planning. At P0 resolve the existing security policy; otherwise pin an approved JavaScript/TypeScript ruleset and record its identity. An initial focused command is:

```bash
semgrep scan --config p/typescript --error apps/web/components apps/web/app apps/web/scripts
node scripts/gitnexus.cjs detect-changes --scope all -r shopcity_LP
node scripts/gitnexus.cjs detect-changes --scope compare --base-ref master -r shopcity_LP
```

Registry access/ruleset resolution failure is not a clean scan. Record findings and baseline differences; do not suppress them to obtain a pass. Scope the final scan to actual changed source and shared affected files if unrelated existing findings need separation. `compare master` contains the branch's accumulated history, so it cannot by itself attribute changes to this proposal. Before any requested commit, run `detect_changes`/`detect-changes` on the relevant diff and inspect actual Git changes.

Backend tests/build, database integration, Supabase/RLS and deployment checks are **not required solely for this presentation change**. If backend, API, session, persistence or deployment behavior expands, pause, update scope/specs, run impact and add the relevant repository gates rather than asserting N/A. Real-backend E2E may be used in an isolated seeded test environment as additional evidence; it is not permission to seed or mutate shared environments.

### Planning artifact validation

```bash
npx --no-install @fission-ai/openspec validate unify-cashier-design-system --strict --no-interactive
npx --no-install @fission-ai/openspec status --change unify-cashier-design-system --json
```

OpenSpec artifact readiness is not implementation completion or reviewer approval.

## 14. Visual acceptance and evidence policy

- Retain approved quantitative reference tolerances where applicable: geometry positions/dimensions ±2px, padding/gap ±1px, discrete font-size/radius exact, colors token-equivalent; review-71 target <1% mismatch and tighter static-chrome comparison remain goals unless explicitly superseded by an approved accessible deviation.
- Do not apply one broad pixel threshold to all new derived snapshots. Same-environment regression snapshots should be strict; any tolerance is named per case with a reason. Reference-image comparison and regression-to-previous-implementation are different evidence types and must be labeled.
- Mask only unavoidable fixture-dependent text, never the controls/cards/layout being certified. Prefer fixed fixtures over masking.
- A screenshot against a newly generated baseline is not proof of prototype fidelity. Keep before/after/reference diff and reviewer decision together.
- Record test selection and counts to guard against an empty or accidentally skipped suite. Missing fonts/browser binaries, skipped required states and unavailable approvals block final acceptance.

## 15. Risk controls, rollback and handoff

| Risk                                | Control                                                      | Stop condition                                                         |
| ----------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Global token/cascade spillover      | Inventory consumers; cross-role fixture suite at P1/P2/P3    | Login/role screens lose contrast, layout or interactions               |
| React remount resets state          | Preserve controller identities; back/draft/idempotency tests | Unexpected lookup/request, lost draft or changed key                   |
| Shared modal weaker than local      | Harden/test behavior before adoption                         | Focus escape/loss or stale detail content                              |
| Offline cosmetic changes hide state | Keep categories/handlers; mixed-outcome queue tests          | Pending shown confirmed, stored records lost or device gating weakened |
| Reference drift                     | Committed manifest, explicit derived Sync provenance         | Unreviewed screenshot accepted as original reference                   |
| Dirty-tree contamination            | Per-slice diff inventory, one writer, no blanket reset       | Unrelated files changed without explanation                            |
| False conformance                   | Canonical expected values plus equality; negative fixtures   | Tests pass identical wrong controls or only a gallery                  |

Rollback dependent presentation slices in reverse order, including source tokens/generated CSS and their snapshots as a unit. Do not reset runtime/offline data. If an in-progress slice fails, keep its task open and either fix it or revert only that slice with the owner's awareness.

Final handoff contains: final candidate SHA/status; completed requirement-to-test map; before/after/reference visual artifacts; style-conformance reports; commands/exits and environment; approved deviations; scoped GitNexus findings; confirmation that protected financial/offline/session contracts did not change; and unresolved risks. Do not archive the change until implementation and required approvals are complete.
