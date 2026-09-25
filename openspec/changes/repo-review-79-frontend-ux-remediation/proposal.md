# Change: Close Review 79 frontend UX and presentation gaps

## Why

`docs/repo_review_79.md` consolidates source-level and visual-composition findings against reviewed commit `d77a2dbc8223`. The shared shell reconstruction is worth preserving, but several user-visible defects remain in global search, Admin/Supervisor landing cards, connection-status copy, Sync Queue and Transactions. Existing tests and React-only snapshots do not establish usable responsive controls or same-state HTML-to-React visual parity. A focused remediation proposal is needed before implementation so interaction behavior, page composition and evidence gates are explicit.

The review is the origin of the findings, not proof that the current dirty working tree still has exactly the same implementation. Implementation must first inspect current HEAD and preserve unrelated pre-existing changes; each finding must be confirmed against current source before changing it.

## What changes

- Stabilize `GlobalShellSearch` geometry and action area across Customers, Cards and Cashiers while retaining exact-card verification semantics and role-based category access.
- Define meaningful dropdown visibility and accessible loading/results/empty/error states; support outside-click dismissal, Escape/focus behavior, result selection, clear/category/close transitions and stale-request invalidation.
- Set measurable desktop and mobile search usability criteria, including minimum input width and a documented narrow-viewport fallback; test the actual rendered input and action geometry, not just visibility/no-overflow.
- Audit route-level content hierarchy, copy, primary/secondary actions, grouping, density, empty/loading/error states and responsive reading order against the committed HTML prototypes or an explicitly approved derived composition.
- Recompose Sync Queue around the cashier's queue task, reduce duplicate/implementation-facing copy, surface primary Sync and secondary Refresh actions with queue status, and subordinate—but retain—per-record details and technical diagnostics.
- Clarify Transactions scope and terminology for Earn/Redeem and bounded cashier activity; make transaction facts primary and audit/technical metadata secondary.
- Correct Admin/Supervisor featured-card selection to use the boolean value, and map connection-status enums to human-readable labels without implying API health from browser connectivity alone.
- Require same-route/state/role/viewport HTML-versus-React inspection; do not update screenshot baselines simply to make comparisons pass.

## Scope boundaries

In scope: `apps/web` shared search/topbar and landing/Sync Queue/Transactions presentation, focused interaction/layout/accessibility tests, route-level composition review, and OpenSpec evidence. Other routes are included in the page-composition audit; changes are limited to verified gaps. Use the committed HTML prototypes as the visual reference where an equivalent exists; mark Sync Queue as derived where it does not.

Out of scope: backend/API/auth/session/RBAC authority changes; financial calculations or ledger history; integer-kobo behavior; card/customer verification policy; idempotency; offline Earn capture; offline-redemption prohibition; sync/reconciliation semantics; database changes; broad component extraction or a design-system rewrite; unrelated dirty-tree changes; screenshot rebaselining without an approved, provenance-backed comparison.

## Acceptance criteria

1. Switching among Customers, Cards and Cashiers leaves the search input and action region dimensionally stable. Exact-card lookup still requires its existing explicit verification action; customer/cashier suggestion behavior remains intact.
2. Focusing an empty search or selecting a category does not display an empty results box. For eligible non-empty queries, loading, results, no-results and error content are meaningful and appropriately exposed to assistive technology; listbox semantics are used only for actual selectable options.
3. Outside click closes the dropdown and clears active selection. Escape closes it and returns focus to the search control. Selecting a result closes the dropdown and preserves the existing route handoff and keyboard behavior.
4. Clear, category change, ineligibility, and dismissal invalidate outstanding requests; late responses cannot repopulate or reopen results. Tests cover clear and Customers-to-Cards transitions in addition to query replacement.
5. Desktop input width is not reduced by counting the category pill as part of a 300px input allowance. The rendered input bounding box is at least 180 CSS px at 1440px and 920px viewports. At 390px and 375px it is at least 120 CSS px, or the category/action layout uses the documented wrap/compact fallback while retaining at least 120 CSS px for text entry; placeholder/text remain readable and there is no horizontal overflow. These are explicit derived acceptance thresholds, to be checked against the HTML before implementation; if the HTML demands more, use the larger reference-derived value and record it in the audit artifact.
6. Admin and Supervisor route cards apply featured styling only when `route.featured === true`; ordinary routes occupy ordinary grid spans.
7. Every in-scope route has a durable review in `docs/frontend/repo-review-79-composition-audit.md` covering source-reference or derived status, route/role/state/viewport, heading/description relationships, primary/secondary actions, content grouping, whitespace/density, empty/loading/error treatment, responsive reading order, deviations and unresolved mismatches. Structural/DOM assertions complement, not replace, human visual inspection.
8. Sync Queue has one clear user-oriented subtitle, no internal layout commentary or duplicated device/record-count information, Sync as the primary action and Refresh secondary near status/header, with selected details subordinate and technical diagnostics expandable. Retry, reconciliation, raw states and diagnostics remain accessible and behaviorally unchanged.
9. Transactions accurately names the bounded cashier activity it presents, covers purchases/Earn and redemptions, avoids implying a complete live ledger when data is bounded, and presents transaction facts before secondary technical/audit metadata. Unsupported receipt fields/assets do not appear as unfinished controls.
10. Each visual parity claim has paired HTML and React evidence for the same route, role, state, browser and viewport. React snapshots alone are not prototype evidence. Existing baselines remain unchanged unless stale-reference provenance, review and approval are recorded.
11. Browser-connectivity states have readable labels for every enum value and copy makes clear that browser connectivity is not an API-health check unless a separate health signal supports that claim.
12. Existing auth/RBAC, exact-card verification, customer/card scope, kobo-safe money handling, idempotency, offline Earn, no-offline-redemption and sync reconciliation tests remain intact and passing.
13. The implementation handoff records each of the ten source-review findings as fixed with evidence, already correct with evidence, not reproducible against current source with evidence, or blocked with owner/next action. It references the composition audit, test commands/results, paired captures, unavailable comparisons and residual risks; this disposition is retained in the change evidence.

## Risks and mitigations

- Review findings may not match the current dirty source: confirm each before implementation and record resolved/not-reproducible items rather than forcing stale fixes.
- Existing screenshots/baselines may encode outdated structure: keep them immutable during initial comparison and document conflicts; obtain approval before replacing.
- Search keyboard and assistive-technology behavior can regress while visual geometry improves: include keyboard, focus, accessible-name/status and role-specific interaction checks.
- Sync Queue wording can misstate server behavior: verify copy against the current status/retry model before editing it; preserve operational semantics.
- Existing dirty working-tree changes include numerous files and screenshots: isolate this proposal's files in review and do not reset, stage, or absorb unrelated changes.

## Delivery strategy

Confirm current tree and relevant OpenSpec scope; audit each review finding against current code/prototypes; implement the shared-search corrections; fix the focused card/status issues; redesign Sync Queue and Transactions; audit remaining route composition and record deviations; run interaction, responsive, accessibility and app-quality checks; capture paired HTML/React evidence without baseline updates; perform a final finding-by-finding gap review and validate the OpenSpec artifacts.
