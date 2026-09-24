# Change: Prototype-first frontend reconstruction after Review 78

## Why

The committed prototype HTML is the presentation specification, but the JSX audit shows that the production shell still uses a capped `shell-main` wrapper, retains migration-era wrappers, diverges at tablet breakpoints, and composes search/category controls differently from the prototype. Route composition also needs an explicit HTML-to-JSX hierarchy review rather than relying on CSS, snapshots, or passing functional tests. This proposal turns the two reconstruction audits into an implementation-ready, presentation-only work plan.

## What changes

- Reconstruct the shared topbar from the prototype HTML: full remaining-column outer page padding, independently centered inner content width, 64px desktop/56px mobile geometry, and the complete search/status/notification/avatar composition.
- Correct global search/category composition without changing role authorization, masking, result handoffs, or backend search behavior; include the Admin card handoff and readable responsive category pill.
- Compare each route's JSX hierarchy, landmark order, and grouping line-by-line against its corresponding HTML before accepting the route: Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, and the derived Sync Queue composition.
- Replace old layout wrappers that own conflicting width/order/landmark behavior, while retaining existing controllers, auth/session guards, RBAC, financial authority, idempotency, offline persistence/reconciliation, and queue semantics.
- Validate prototype-derived responsive behavior at the documented 920/620 and 700px transitions plus required tablet/mobile viewports; do not broaden the change into a design-system rewrite.
- Require a second passthrough gap review after implementation and final artifact/provenance validation before handoff.

## Scope boundaries

In scope: `apps/web` presentation JSX/CSS and focused conformance/accessibility evidence for the shared shell and mapped operational routes; route-by-route HTML/JSX comparisons; and OpenSpec/evidence artifacts. Any source edit must receive symbol-level impact analysis first.

Out of scope: backend controllers/services, API contracts, generated clients, authentication/session authority, RBAC policy, money/ledger/history semantics, database schema, offline reconciliation/IndexedDB behavior, queue processing, and unrelated dirty files. Do not edit visual baselines as part of this proposal. A reference artifact may change only after a same route/state/role/browser/viewport comparison proves the retained artifact stale and receives explicit provenance/approval.

## Acceptance criteria

- Shared shell geometry is derived from HTML: the topbar spans the padded post-sidebar column while route content is independently centered at the prototype width (1120px generally; 1080px/712px Find Customer widths where applicable), with no old capped wrapper shrinking content to 1072px.
- Topbar/search composition matches the prototype at desktop, tablet, and mobile widths: global search, readable role-authorized category pill, System Online visual state, notifications, avatar, and mobile controls do not overflow or become cramped. Admin card results hand off to `/admin/cards`.
- Each mapped route has a recorded HTML-vs-JSX hierarchy/element-order comparison and stable landmarks; old wrappers are removed or proven harmless. Transactions places refresh with heading/actions; Sync Queue order is correct in both DOM and visual presentation.
- Existing controllers/auth/RBAC/financial/idempotency/offline/queue behavior and truthful loading, empty, error, success, disabled, masking, and focus states remain unchanged and pass focused tests.
- No visual baseline is updated before the same route/state/role/browser/viewport prototype comparison; React snapshots remain a separate regression signal.
- The second passthrough review records zero untriaged P1/P2 structural gaps, and final artifact validation confirms routes, dimensions, provenance, assertions, and changed-path scope.

## Delivery strategy

Freeze evidence and dirty-tree exclusions; implement shared shell geometry first; perform route-by-route JSX/HTML comparisons and narrow presentation changes; run behavior/responsive/accessibility checks; perform the second passthrough gap review; then run final artifact validation and report residual blockers. Never reset or absorb unrelated working-tree files.

## Impact

Primary surface: `apps/web` presentation components/styles and documentation/evidence only. Proposal-time GitNexus analysis of `AppTopbar` is LOW risk, exact: 4 impacted symbols, 1 direct dependant, 2 affected processes, and 1 affected module (`ShellLayout`/`AppShellContent` consumers). The audited `CashierWorkflowRoute` remains HIGH and must be rechecked before any edit; CSS/DOM cascade impact exceeds call-graph counts, so browser and functional evidence is mandatory.

## Artifact-repair scope and non-completion rule (2026-09-23)

This repair makes the proposal auditable; it does not widen the product scope or claim frontend implementation completion. The normative 12-row matrix covers `/login`, `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, `/cashier/transactions`, `/supervisor/customers`, focused registration at `/supervisor/customers/new` and `/admin/customers/new`, `/supervisor/transactions`, `/admin/transactions`, and `/cashier/sync`. Each route now has an exact HTML reference or explicit derived/out-of-scope disposition, React entry/root/landmark order, role/state coverage, and states at all required widths.

The HTML source is authoritative for Find Customer's 712px search panel. The prior 640px screenshot is historical superseded evidence, not a competing requirement; any production deviation requires explicit approval and provenance. `AppShell` owns the full remaining-column topbar, shell padding, formula-based route slot, and exactly-once `BrowserStateBootstrap`, shell status row, and `OfflineIndicator`; route wrappers are limited by the allowlist in `design.md`. Search assertions, exact `System Online`, Admin `/admin/cards` handoff, Sync Queue DOM order, baseline prohibition, second pass, and final artifact gates are normative in the companion spec.

All new implementation/certification tasks remain unchecked. Existing dirty source, tests, screenshots, and baselines are preserved and are not part of this documentation-only repair.
