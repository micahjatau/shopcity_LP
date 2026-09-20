# Design: one presentation owner per Cashier component

## 1. Context and intent

Read this as an operational checkout interface for Cashiers whose job is to find the correct customer, capture or redeem credit safely, inspect transactions, and reconcile offline work. Use the established warm off-white canvas, white bordered surfaces, restrained ShopCity red actions and meaningful status colors. The goal is consistency and trust, not a new aesthetic.

The audit in `audit.md` distinguishes verified source findings from proposed design decisions. The route/state/reference inventory in phase 0 must preserve that distinction. No backend behavior or data schema needs to change.

## 2. Token ownership and compatibility

### Decision D1: retain one semantic namespace

Use the existing generated `--sc-color-semantic-*`, font, size, radius, spacing, motion and state tokens as the canonical API. The short names in review 73 (`--sc-surface`, etc.) illustrate semantics; they are not a requirement to duplicate every variable. New component tokens are allowed only for genuinely shared dimensions, with matching source and generator support.

Proposed source mapping:

| Canonical semantic             | Approved visual source                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `color.semantic.canvas`        | Current `prototype.canvas` warm off-white                                                                            |
| `color.semantic.surface`       | Current `prototype.surface` white                                                                                    |
| `color.semantic.textPrimary`   | Current `prototype.foreground`                                                                                       |
| `color.semantic.textSecondary` | Current `prototype.muted`, subject to contrast verification                                                          |
| `color.semantic.border`        | Current `prototype.border`                                                                                           |
| `color.semantic.actionPrimary` | Current `prototype.accent`, subject to text contrast verification                                                    |
| Operational heading family     | Current `prototype.fontDisplaySans` fallback stack                                                                   |
| Card/panel radius              | Existing `radius.lg` (16px)                                                                                          |
| Default control sizes          | Existing compact/standard/large API: 36/44/48px unless an approved reference exception explicitly requires otherwise |

Move canonical values into semantic/typography/layout source ownership; retain `prototype.*` as deprecated aliases pointing toward canonical values, not mutually recursive aliases. Keep approved serif/display treatments available for intentional consumers. Do not replace every heading with one font globally without auditing login and other roles.

Hover, focus, disabled, warning, success, error, read-only and pending states need explicit valid tokens. Verify contrast against actual surfaces (normal text 4.5:1, large text 3:1, meaningful non-text controls/focus 3:1); document an accessible correction where an exact prototype value cannot meet the requirement. Do not lower contrast to achieve pixel parity.

Add tests for alias existence, transitive resolution, cycles, deterministic output and invalid CSS-variable references. Account for custom properties intentionally defined by Tailwind/external libraries and locally scoped layout variables; use an explicit documented allowlist, not a blanket ignore of all unknown names. CSS fallback values must not conceal a misspelled shared token. Existing invalid success/warning references are removed, not patched with undefined numeric shades.

### Decision D2: generated CSS contains token declarations; base reset has one owner

Today the generator emits HTML/body/control reset rules as well as variables. Move these rules to `base.css` and update generation/tests in the same slice. Preserve minimal safe element resets (box sizing, body margin, inherited form font); prohibit global element selectors that define product button appearance or layout. This is not a ban on all element selectors.

`tokens:check` currently rewrites the generated output while checking. Keep deterministic generation and document this behavior; avoid expanding this work into a tooling rewrite unless required for valid alias testing.

## 3. CSS structure and cascade

Target structure:

```text
apps/web/styles/
  globals.css                 # imports only, documented order
  tokens.css                  # generated; never hand edited
  base.css                    # minimal document reset, default canvas/font
  primitives.css              # import bridge for existing primitive modules
  components/
    buttons.css
    forms.css                 # input/select/labels/help/errors/actions
    cards.css
    page-header.css
    tables.css
    search.css
    workflow.css
    status.css
    dialog.css
    miscellaneous.css         # existing untargeted primitives, no duplicate owners
  shell/
    sidebar.css
    topbar.css
    navigation.css
  layouts/
    cashier.css               # reused grid/toolbar/flow placement only
  pages/
    login.css                 # preserve existing intentional login appearance
    legacy.css                # remaining existing non-Cashier page styles, inventoried
```

Files may be combined when tiny, but ownership must remain clear. `legacy.css` is not a dumping ground for migrated Cashier selectors. Unique page geometry may use small colocated CSS modules; shared typography/control/card appearance must not live there.

Preserve the existing `@import 'tailwindcss'` and assess its layer/preflight interaction before changing order. Do not introduce new `@layer` semantics casually: unlayered CSS overrides layered CSS, and changing this can silently reverse precedence. Prefer the existing behavior with deterministic imports, low-specificity `.sc-*` component classes, and explicit modifier/data attributes. No `!important` specificity arms race. All imports precede declarations; production Next builds verify processing.

Move one rule family at a time and delete its old owner in the same slice after coverage exists. Avoid a period where old and new shared rules both remain live and route import order decides which wins. Styles must be available through the root layout even on a direct cold navigation, not only after visiting a donor page.

Global product rules use component selectors. A page may place `.sc-form-actions` but may not restyle `.sc-button` borders/radii. No `.cashier-route-page > section:first-of-type` geometry. Layout attributes belong to the owning component, not a descendant's incidental DOM position.

## 4. React boundaries

### Decision D3: reuse low-level primitives and add thin product composition

Keep `components/ui/` as the low-level interactive/semantic layer. Add presentational product wrappers to the existing `components/shopcity/` directory and export them from its index. Do not relocate controllers or all routes just to match suggested directory names.

| Component                           | Responsibility / contract                                                                                  | Must not own                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `CashierPageHeader`                 | Title, optional eyebrow/description/actions; one H1; predictable wrapping                                  | Per-route font rules or requests                                     |
| `ShopCityCard`                      | Surface, padding/density and semantic element choice; default/metric variants                              | Arbitrary colors/radii passed as style props                         |
| `CashierFlowPanel`                  | Single surface and width variant (`earn`, `redeem`), heading/content/actions slots, display-state metadata | State transitions, API calls, authoritative data                     |
| `VerifiedCardLookupStep` (existing) | Controlled lookup field/status/action content inside the panel                                             | A second card shell, financial verification logic                    |
| `ShopCitySearchField`               | Label, input/ref, icon, clear affordance and visual sizing                                                 | Debounce, directory lookup, scanner listeners, result interpretation |
| `ShopCityFilterToolbar`             | Responsive arrangement of search/select/actions                                                            | Filtering or query normalization                                     |
| `ShopCityDataTable`                 | Existing Table wrapper, overflow/empty/loading slots and density                                           | New sorting/paging/fetch behavior                                    |
| `ShopCityStatusMessage`             | Semantic tone, status/alert/live-region policy                                                             | Parsing raw backend responses or converting pending to success       |
| `ShopCityModal`                     | Reuse a hardened dialog behavior owner and shared surface styles                                           | Detail requests, stale-response guards, domain actions               |
| `ShopCityFormActions`               | Shared alignment/stacking of supplied controls                                                             | Submit behavior or hidden alternate submit buttons                   |

Preserve accessible labels, IDs, refs, native event props, `type`, `disabled`, `aria-busy`, test selectors and `data-od-id` landmarks. Do not create nested forms or buttons. Button-like links must remain links with a shared visual treatment, not navigation hidden inside button handlers. Use existing Lucide icons; this refactor does not introduce another icon set.

Prefer typed, narrow variants over `style` escape hatches. Static layout moves to CSS. An unavoidable runtime custom-property value requires a documented exception with scope/reason/tests; no exceptions are expected for current six-page static cards and forms.

## 5. Workflow panel composition

### Decision D4: one stable panel per financial route

Normalize Earn and Redeem so lookup, confirmation, details, review and terminal content use the same `CashierFlowPanel` visual owner. The proposed outer widths are 860px Earn and 720px Redeem, matching review guidance, with shared border/radius/padding rhythm and responsive shrinking. These are **maximums**, never fixed mobile widths. Use CSS-owned padding, e.g. a 24–40px desktop/tablet range with a compact narrow-screen rule, verified against approved references.

Use explicit `data-flow` and display-only `data-state` attributes. The panel should remain mounted; swap its content without remounting trusted forms on each keystroke/step. Do not hoist or re-key Earn/Redeem controller hooks in a way that resets draft state, regenerates idempotency keys, or retriggers card lookup. Preserve existing confirmation/back semantics and current step callbacks. The stepper may differ in labels/count as dictated by each controller.

Remove the empty Earn stage currently left after confirmation and the initial Redeem wrapper asymmetry as presentation changes. Preserve current automation landmarks by mapping them deliberately to the new structure; update geometry tests with an explicit mapping, not arbitrary selector removal.

Directory discovery is tested on Find Customer/global search. If financial routes do not support directory discovery, mark that state not applicable rather than implementing it for screenshot symmetry. “Verified card” may coincide with the customer-confirmation render; document that mapping instead of manufacturing an intermediate business state.

Success presentations distinguish confirmed, pending approval, saved locally, rejected, and retry-required results. Sharing a status component does not mean sharing a success label. Offline redemption remains unavailable.

## 6. Page composition decisions

### Overview

Retain the current bounded feed, aggregation logic, quick-action permissions and route destinations. Share the page heading, four-metric layout, metric surfaces, table/search and empty/error treatment. Metric labels must match actual derived values; no invented revenue or totals beyond the available feed. Replace both route CSS and nested overview CSS together.

### Find Customer

Retain search/scanner/controller semantics, masked Cashier data, selection/deep links and authoritative lookup. Use shared search/card/result-row/form/status styles. Directory results cannot become verified financial balances by virtue of selecting a styled card. Keep loading, no-results, offline/error, retry and keyboard selection states visible and truthful.

### Transactions

Keep existing filter semantics and bounded-copy scope. Reuse table/search/toolbar/status styles; make row focus and activation keyboard accessible. Modal opening and closing preserve focus return, trap/Escape, accessible title and stale-detail response protection. The current generic Dialog is less capable than the local modal; it cannot replace it until parity tests pass. Keep the domain request-generation guard in `TransactionDashboard` while the reusable dialog owns keyboard lifecycle. Test loading and failed detail responses, not just loaded records.

### Sync Queue

Use a standard Cashier header, shared metric/status surfaces, toolbar, table, actions and selected-detail card. Preserve operational details and last-batch results, device gating, per-record retry, and `CLEAR` confirmation. Remove decorative gradients and strong shadows from operational cards; intentional brand/card artwork elsewhere is not globally prohibited.

For this presentation-only scope, retain existing status categories/count definitions, including separately visible pending approval and rejected/retry information. The review's four conceptual groups are not a new required aggregation contract. If four visual groups are desired, require an explicit total-preserving mapping and tests for every stored state, including `saved-on-device`; do not silently relabel awaiting approval as confirmed or invent “syncing” transitions from a busy flag. Do not change queue persistence or deletion eligibility to simplify the UI.

## 7. Compatibility and safety boundaries

Shared primitives and semantic tokens can affect login, Admin/Supervisor pages, registration, cards, approvals, reports, and operational dialogs. Establish before/after coverage for these surfaces; preserve intentional non-Cashier appearance with explicit shared variants or scoped page rules. Do not fix regressions by recreating per-page shared-button overrides.

Keep backend/source, generated API artifacts, browser queue storage/controller files and session modules unchanged unless an independently verified defect requires a separately approved expansion. If changing a visual wrapper causes a new request count, stale response, lost draft, unauthorized route, or queue mutation, stop and correct the wrapper rather than rewriting the protected subsystem.

## 8. Alternatives rejected

- **One enormous globals.css:** centralizes text but not ownership; modular import entry is easier to review.
- **Copy polished page styles to five other pages:** preserves the drift mechanism.
- **Pure screenshot approval:** identical screenshots can hide inaccessible controls, undefined tokens and broken request/state semantics.
- **CSS Modules for all shared components:** useful for unique layout, but route-owned styling does not establish the requested shared product language.
- **Replace everything with shadcn/Tailwind utilities:** existing tooling availability is not authorization to migrate the design system.
- **Unify controllers/state machines:** unnecessary risk for a styling refactor; share presentation only.
- **Four misleading Sync metrics:** visual uniformity cannot erase pending/failed states.

## 9. Rollout and rollback

Implement in reviewable slices: baseline; token/cascade foundation; primitives; shell; Overview; grouped lookup/financial routes; Transactions; Sync; cleanup/conformance. Each slice contains its styles, consumers, tests and necessary snapshots. No database migrations or data rollback are required.

Rollback is the revert of a cohesive slice (or dependent slices in reverse order), including generated token output and corresponding snapshots. Do not revert user-owned pre-existing edits or discard IndexedDB records. Re-run focused behavior and visual checks after rollback. Deployment and production financial writes are not authorized by this planning package.

## 10. Decisions requiring implementation evidence

No unresolved architecture choice blocks starting phase 0. Before visual acceptance, record reference provenance, browser-resolved font, approved compact-control exceptions, and Sync's derived reference in evidence. Any conflict between exact prototype styling and accessibility must be resolved through the deviation registry, not silently chosen by the implementer. Final visual approval is a release gate, not a claim made by this proposal.
