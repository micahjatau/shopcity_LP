## Context

The proposal and delta spec define a cross-cutting frontend adaptation against the committed visual baseline at `410ecd75`. The current Next.js frontend already owns session bootstrap, RBAC, generated API clients, CSRF, idempotency, scanner behavior, offline persistence, and authoritative financial workflows, but route components currently combine those concerns with presentational layout. `CashierWorkflowRoute` is a HIGH-risk seam affecting the Earn, Lookup, and Redeem processes.

The implementation must preserve unrelated dirty working-tree changes and must not move financial authority into React state. The prototype reference assets and their `data-od-id` attributes are the stable comparison contract. The backend contract remains unchanged unless an explicit truthful field decision requires an additive approved change.

## Goals / Non-Goals

**Goals:**

- Establish a shared prototype-compatible shell and token/primitives layer.
- Extract workflow behavior into controllers with narrow view-models.
- Implement dedicated prototype-exact views for cashier overview, lookup, Earn, Redeem, registration, transactions, and login.
- Preserve authoritative card lookup, session/RBAC, CSRF, idempotency, integer-kobo, offline, policy, approval, and typed outcome behavior.
- Add deterministic reference manifests, screenshot comparisons, DOM geometry checks, approved visual deviations, and focused regression coverage.

**Non-Goals:**

- Backend rewrites, GraphQL, new frontend frameworks, or new financial authority sources.
- A cashier history endpoint solely for visual pagination.
- Reintroduction of prototype-only registration fields.
- Implementing Till/cashier reference without an approved backend property.
- Completing unrelated release-certification or operational work.

## Decisions

### 1. Separate controllers from views

Create route-local controllers/hooks that own API calls, validation, persistence, security context, workflow state, and derived values. Views receive display-ready values and callbacks only. This is preferred over extending `CashierWorkflowRoute` because the existing component's layout branches are the source of visual drift and have a HIGH impact surface.

Alternatives considered: retaining generic workflow sections (rejected because they preserve implementation-driven geometry); moving state into global stores (rejected because it broadens authority and makes route state harder to audit).

### 2. Preserve one stable DOM tree per workflow

Each multi-step workflow renders one persistent prototype panel with fixed child nodes and toggles visibility for the active step. This keeps `data-od-id` mapping, focus targets, screenshot regions, and geometry stable across state transitions.

Alternatives considered: rendering separate trees per step (rejected because it changes geometry and complicates visual baselines); CSS-only hiding of all interactive content (rejected unless hidden content is removed from the accessibility tree and focus order).

### 3. Use existing production contracts as the authority boundary

Directory search remains discovery. Card lookup verifies financial authority. Controllers continue using generated clients, backend session context, CSRF, idempotency, branch/device identity, integer-kobo values, offline queues, and server outcomes. No controller will accept frontend balances, roles, approvals, policy, or eligibility as authoritative.

Alternatives considered: adapting prototype fixtures into production state (rejected as unsafe and misleading); adding a new API for each visual card (rejected as unnecessary scope).

### 4. Make shared prototype CSS canonical

Add scoped design tokens and primitives for shell, page headings, flow steps/panels, tables, and status surfaces. Route views compose those primitives instead of embedding convergent inline styles. Existing global styles remain compatible and are migrated incrementally to avoid unrelated visual changes.

Alternatives considered: copying prototype CSS per route (rejected because drift would recur); replacing the entire design system at once (rejected because it increases blast radius beyond the review).

### 5. Treat bounded data honestly

Overview and cashier transactions continue using the bounded cashier-today feed. Local filtering powers the prototype controls. Any pager or result text explicitly describes loaded/bounded activity; no endpoint is added unless separately approved.

Alternatives considered: fake client pagination that implies complete history (rejected); introducing server history during visual adaptation (rejected as a separate contract and data-scope change).

### 6. Resolve prototype-only fields through an explicit deviation

Before implementation of the Capture Purchase field for Till/cashier reference, inspect the current contract. Either map it to a real persisted/backend property or remove it from the approved reference and record the decision in the deviation registry. The UI will not collect and discard it.

### 7. Gate parity with both screenshots and geometry

Create a manifest keyed by route and viewport. Use screenshot comparison for static/chrome regions and `data-od-id` geometry comparison for structure and computed styles. Dynamic data is deterministic through fixtures or narrowly scoped masks. The initial mismatch target is below 1%, tightening toward 0.5%; geometry uses the tolerances specified by the delta spec.

Alternatives considered: screenshot-only review (rejected because equal pixels can hide structural drift); DOM-only review (rejected because it misses colors, typography, and rendering effects).

### 8. Implement in vertical slices

The work proceeds shell → overview → lookup → Earn → Redeem → registration → transactions → login → quantitative gates. Each slice preserves or adds focused unit, accessibility, route, controller, and Playwright evidence before the next slice. The HIGH-risk CashierWorkflowRoute slice requires all three affected routes to pass together.

## Risks / Trade-offs

- [HIGH blast radius in `CashierWorkflowRoute`] → Keep the old trusted logic until each controller has parity tests; run all three affected route suites together and run GitNexus `detect_changes()` before certification.
- [Prototype references may contain dynamic or contract-inaccurate content] → Use deterministic fixtures, explicit masks, and the approved visual-deviation registry; never fake production data.
- [Persistent hidden step nodes may create focus/accessibility defects] → Apply `hidden`/inert semantics correctly, move focus on transitions, and run accessibility tests at every workflow state.
- [Removing shell context may hide useful operational information] → Keep it in accessible metadata, route status slots, dedicated Sync screen, or existing overlays; do not re-add desktop geometry without approval.
- [Bounded feed may not satisfy a history-like prototype table] → Use truthful copy and loaded-result pagination; escalate a real history endpoint as a separate change.
- [Till/cashier reference has no confirmed contract] → Block that field's implementation until it is mapped or removed from the approved design.
- [Visual tests can be environment-sensitive] → Pin viewport, fonts, browser version, fixtures, and reference SHA; separate static/chrome thresholds from masked dynamic regions.
- [Existing dirty files could be overwritten] → Restrict edits to the planned frontend/spec/evidence paths and inspect status before every broad formatter or generator command.

## Migration Plan

1. Record the current baseline and preserve unrelated working-tree changes.
2. Add shared tokens/primitives and shell structure behind existing routes.
3. Extract controllers incrementally, keeping route behavior covered while replacing presentational JSX.
4. Migrate each route as a vertical slice and add its reference manifest entry and evidence.
5. Resolve the Till/cashier-reference decision before Capture Purchase acceptance.
6. Run frontend typecheck, lint, unit/a11y tests, affected Playwright tests, visual/geometry gates, and GitNexus change detection.
7. Roll back a slice by restoring the route's prior view composition while retaining isolated controller code; do not roll back or rewrite backend financial history or migrations.

## Open Questions

- The final reference crops and deterministic fixture values for every committed `figmaExport` image must be enumerated in the manifest during implementation.

The Till/cashier-reference question is resolved for this change: repository/API searches found no production property, so the production Capture Purchase view will omit that prototype-only input and record the deviation rather than collect and discard it.
