# Close Cashier design-system ownership and conformance gaps

## Why

`docs/repo_review_75.md` confirms that the Cashier frontend now has one global stylesheet entry point and that several Review 74 gaps were addressed, but it does not yet establish a complete design-system ownership model or route-level conformance. The current repository still has explicit unresolved ownership exceptions, a narrow duplicate-selector guard, an unresolved topbar/customer-discovery source decision, and a pending six-route evidence matrix.

The follow-on work must be a bounded closure pass, not another page-by-page visual rewrite. Existing financial, session, routing, offline, queue, scanner, authorization, and request semantics remain protected.

## Review 75 findings

### Confirmed addressed

- `app/layout.tsx` provides the single production CSS entry point through `globals.css`.
- `tokens.css` is generated from `docs/frontend/design-system/tokens.json`.
- Cashier routes do not import route-local stylesheets.
- AppShell no longer contains embedded style blocks or static inline heading styles.
- The previous positional Capture Purchase selector was replaced with explicit classes.
- Duplicate `.cashier-primary-action` and `.cashier-secondary-action` definitions were removed.
- Ancestor-based `.cashier-card .sc-button` overrides were removed.
- The ownership checker covers the six Cashier routes, workflow presentation files, AppShell, sidebar, topbar, global search, and transaction dashboard.
- The focused ownership check and existing frontend validation slices pass when run against their supported fixtures.

### Still open or not proven

- `cashier-routes.css` still contains component-appearance rules such as `.cashier-card h2` and `.cashier-card .sc-input:focus-visible`; these must be classified as named exceptions or moved to canonical component owners.
- The guard only detects duplicate ownership for two action selectors. It does not enforce ownership for cards, inputs, forms, search, status, tables, dialogs, page headers, flow panels, or shell selectors.
- The six-route matrix remains pending; focused checks are not equivalent to computed-style evidence across states and viewports.
- The current Playwright workflow suite has failures in the Overview route/state coverage, including missing expected elements and screenshot assertions. These failures must be diagnosed and resolved or explicitly recorded as blockers; they cannot be reported as visual conformance.
- The authoritative topbar/customer-discovery implementation is not established. Current `AppTopbar` still has a non-interactive avatar and no notification control, while the referenced prototype branch is unavailable locally. The proposal must resolve whether those are required behavior changes or an explicitly separate scope.
- `/cashier/customers` and other non-Cashier Admin/Supervisor surfaces contain inline presentation by design. They must remain outside the Cashier guard unless this change explicitly expands its boundary.
- Existing dirty-tree changes, generated artifacts, screenshots, and unrelated Admin/Supervisor/configuration work must be preserved and separated from implementation evidence.

## What Changes

- Define a canonical selector-family registry with owners, allowed modifiers, and documented exceptions.
- Expand static ownership checks to detect competing definitions across primitives, Cashier components, shell components, and route composition styles without falsely rejecting layout-only selectors.
- Make `cashier-routes.css` composition/layout-only where a shared component appearance is currently overridden.
- Resolve the topbar/customer-discovery source decision before implementation and record the accepted behavior boundary.
- Produce executable computed-style and accessibility evidence for Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, Sync Queue, and the Cashier/Supervisor/Admin shell roles at desktop, tablet, mobile, and reduced-motion conditions where applicable.
- Diagnose the current failing route-state Playwright checks, update fixtures/assertions only when they reflect the current product contract, and preserve the requirement that unsupported states are not invented.
- Record final evidence against the candidate revision, including justified exceptions, test exits, screenshots, and residual risks.

## Capabilities

### New Capabilities

- `cashier-style-ownership-closure`: canonical ownership enforcement for shared frontend selector families and explicit route-layout exceptions.
- `cashier-route-conformance-evidence`: reproducible route/state/viewport computed-style, accessibility, and visual evidence for the Cashier and shared shell surfaces.

### Modified Capabilities

None. Existing financial workflow, authentication, RBAC, session, API, offline, queue, scanner, and data-minimization requirements remain authoritative.

## Non-goals

- No backend, API, Prisma, Supabase/RLS, generated-client, financial-calculation, queue-semantics, authentication, RBAC, or deployment changes.
- No redesign of Admin/Supervisor inline presentation outside the declared regression boundary.
- No new notification/avatar behavior unless the resolved authoritative source explicitly requires it and a separate approved scope is recorded.
- No screenshot-only acceptance; visual similarity cannot replace behavior, computed-style, accessibility, and source-ownership evidence.
- No resetting, cleaning, or claiming unrelated working-tree changes.

## Acceptance criteria

1. Every canonical shared selector family has one owner, or a documented variant/exception with a test-backed reason.
2. `cashier-routes.css` contains layout/composition rules only for audited shared components; remaining appearance exceptions are explicit and registered.
3. The ownership checker fails representative duplicate-selector, inline-style, and undeclared-exception fixtures and passes the production source inventory.
4. The topbar/customer-discovery authority and scope are recorded before implementation; no stale prototype behavior is silently accepted.
5. All required route/state/viewport matrix rows are evidenced or marked not-applicable with a documented reason; pending rows are not treated as complete.
6. The current Playwright route-state failures are fixed or remain as explicit blocking evidence; the proposal does not claim green conformance while they fail.
7. Existing financial, lookup, session, role, offline, queue, modal, scanner, and request-race tests remain passing.
8. Final evidence identifies the candidate revision, environment, commands, artifacts, accepted deviations, and residual risks.

## Impact and implementation guardrails

Primary surfaces are `apps/web/styles/**`, the ownership checker and fixtures, shared Cashier/shell presentation components, and Playwright conformance evidence. Before modifying any function, class, or method, run GitNexus upstream impact analysis for the actual symbol and warn on HIGH/CRITICAL results. Do not edit financial controllers or backend contracts.

Implementation must begin only after the proposal is reviewed and the follow-on design/spec/tasks artifacts define the exact selector registry, conformance matrix, topbar decision, and rollback/evidence plan.
