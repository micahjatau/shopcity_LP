# Design: Review 79 frontend UX remediation

## Context and sources of truth

`docs/repo_review_79.md` is the review input. It identifies defects at commit `d77a2dbc8223`; the current implementation and behavior must be verified from the checked-out source before implementation. `docs/TRD.md` remains authoritative for product/architecture constraints. Approved standalone HTML prototypes are the presentation reference only; current production controllers, APIs, session/RBAC and queue behavior own application semantics.

The current worktree is already dirty before this proposal. Preserve it. Do not treat existing local screenshots or generated React snapshots as approved HTML comparison evidence. The prior OpenSpec work (`repo-review-78-prototype-first-frontend-reconstruction`, `review-78b-prototype-parity-closure`) already addresses broad prototype parity and contains important non-completion blockers. This change targets the specific remaining Review 79 interaction and page-composition issues; it does not supersede unresolved evidence gates from those changes.

## Principles

1. Confirm findings against current code; distinguish confirmed, already fixed, not reproducible and blocked by unavailable source evidence.
2. Keep role, identity, verification, financial and sync authority in existing production paths.
3. Treat search geometry, focus, accessible states and async correctness as one interaction contract.
4. Improve hierarchy and copy without deleting operational detail that users need for recovery or audit.
5. Compare the same route, role, state, viewport and browser; never make a visual test pass by silently changing the baseline.
6. DOM order and automated snapshots are necessary evidence, not substitutes for design review.

## A. GlobalShellSearch interaction and layout

### Stable control contract

Render a consistent search input and action slot across Customers, Cards and Cashiers. Category-specific semantics remain distinct: Cards retains exact lookup and explicit verification; Customers/Cashiers retain their current suggestion/debounce behavior. The action must not appear/disappear in a way that shifts input width. Category selection must not open an empty result surface.

The input's usable width is measured independently of category controls and action buttons. At desktop, the category pill must not consume the input's documented width allowance. The minimum rendered input bounding-box width is 180 CSS px at 1440px/920px and 120 CSS px at 390px/375px, with a tested wrap/compact-category fallback rather than further shrinking. These are derived minimum thresholds; compare them with the authoritative HTML before implementation, raise them if the source reference requires more, and record the actual threshold and dimensions in `docs/frontend/repo-review-79-composition-audit.md`.

### Dropdown state model

The dropdown is visible only when it contains meaningful content: loading, selectable results, no-results, or an actionable error/retry state. Empty query focus shows input focus styling only. Assistive technology receives suitable status/option semantics; do not expose an empty `listbox`.

Events and invariants:

- Focus: does not open empty results.
- Eligible query: begins loading/debounce and may show the loading state.
- Query clear, category change, close/dismiss or becoming ineligible: invalidate pending generations before clearing/hiding state.
- Late response: only the latest eligible generation for the current category/query may update results.
- Outside click: close and clear active index without stealing focus from the clicked control.
- Escape: close, clear active index and return focus to the search input.
- Keyboard navigation and selection: retain current accessible navigation and route handoff; selection closes results.

Implementation should use a single dismissal boundary (for example, a containing ref plus document-level pointer handler) with cleanup and tests for clicks inside controls/results to avoid accidental close. Do not rely on stale closure state or a request-only guard that fails on early returns.

## B. Route composition audit

Audit the prototype-mapped routes represented in the current app, not only the two named screens. Publish the durable route-by-route record at `docs/frontend/repo-review-79-composition-audit.md`. For each route include direct HTML reference or derived status, role, state, viewport, heading/description, primary/secondary actions, content grouping/hierarchy, whitespace/data density, loading/empty/error/success states, mobile reading order, deviations and unresolved mismatches. Review rendered DOM and actual screenshots together. A missing matching HTML reference is recorded as derived composition, not claimed as parity.

Specific local correction: Admin and Supervisor route-card styles must branch on the boolean `route.featured`, not property existence. Add assertions for both true and false cards and their computed grid placement.

## C. Sync Queue

The cashier's main job is to understand what is waiting and trigger safe synchronization. The first viewport should establish page title/subtitle, connection/queue status, primary Sync action and secondary Refresh, then queue counts/table and useful filters. Keep a single device identity display and a single record count. Remove internal layout narration and redundant paragraphs. Put selected-record detail in a subordinate conditional region; expose backend response/technical diagnostics in an explicit expandable section.

Before writing copy, trace exact queue statuses and retry inclusion through current code/API behavior. User-facing instructions must not imply a retry/confirmation behavior that the system does not guarantee. Preserve IndexedDB/device binding, per-record reconciliation, statuses, retry/error paths, and all existing data. Empty/loading/error states should occupy the queue content region with purposeful messaging and action affordances.

## D. Transactions

Describe the page as bounded cashier activity and use terms that include both purchases/Earn and redemptions. Avoid “live ledger” or complete-history implications unless the endpoint and data scope substantiate them. Keep Refresh in the page-header action group. Put search/filter controls before the table, one record count/pagination footer after it, and transaction facts first in the detail view; place audit/technical metadata second. Missing images or unsupported fields should be rendered as truthful absence, not empty placeholder UI that resembles an unfinished feature.

## E. Connectivity state

Map every internal connectivity enum to explicit human-readable copy. Do not interpolate raw enum strings. Use neutral wording such as browser/offline connectivity when that is the only signal; label API/service health separately and only when an independent health check exists. Add exhaustive mapping coverage so a new enum cannot silently leak internal naming to users.

## Preservation boundaries

No backend/API/schema/session/RBAC changes. Do not weaken exact-card verification, customer/card masking or branch scope, financial kobo precision/idempotency, offline Earn capture, offline-redemption prohibition, or server reconciliation. No broad shared-component extraction. No screenshot baseline update during initial remediation.

## Evidence and verification

- Focused component tests for search control geometry across categories, dropdown content states, outside click, Escape/focus, selection, keyboard navigation, clear/category/dismiss stale-response races, and role-specific categories.
- Browser-level measurements for input and action widths and no-overflow at 1440, 920, 390 and 375 CSS pixels; assert a minimum usable input width plus readable placeholder/text (not visibility alone).
- Route/page composition audit and paired screenshots for each relevant HTML route/state; compare same browser/role/state/viewport. Use derived-composition annotation for Sync Queue if no source HTML exists.
- Focused Sync Queue and Transactions interaction/accessibility/responsive regression tests; verify all server statuses and retry behavior are unchanged.
- Existing frontend lint, typecheck, unit and affected Playwright suites, build, accessibility and design-system checks as applicable.
- Final manual second pass maps every numbered finding in the review to implemented evidence, existing verified fix, justified non-reproducibility or explicit blocker. Publish this disposition with test/capture references, unavailable or blocked comparisons, and residual risks in the change's evidence/handoff artifact.
