## Context

The proposal identifies a follow-on closure pass after the Cashier stylesheet extraction. The current implementation has a single global CSS entry point and a focused ownership checker, but route CSS still contains scoped appearance rules, duplicate ownership detection is narrow, the route conformance matrix is pending, and the current workflow Playwright suite has failing Overview scenarios.

The work is presentation- and evidence-scoped. Existing financial controllers, request lifecycles, authorization, offline storage, queue semantics, and backend contracts are protected. Existing dirty-tree changes must remain untouched.

## Goals / Non-Goals

**Goals:**

- Establish a machine-readable shared-selector ownership registry with explicit variant and exception handling.
- Separate component appearance from route composition without requiring a wholesale stylesheet directory rewrite.
- Make conformance evidence reproducible across the defined routes, states, viewports, and shell roles.
- Resolve the topbar/customer-discovery source boundary before implementation changes.
- Make failing required browser evidence visible and blocking rather than silently treating focused checks as completion.

**Non-Goals:**

- Redesigning financial or operational behavior.
- Migrating unrelated Admin/Supervisor inline presentation.
- Adding notification/avatar behavior without a separately approved product decision.
- Replacing the existing frontend framework, CSS pipeline, or reference assets.

## Decisions

### 1. Use a registry-backed ownership checker

The checker will parse the production CSS ownership surfaces and compare canonical selector families against their declared owners. It will support named modifiers and narrowly scoped exceptions so legitimate variants remain possible without permitting accidental ancestor overrides.

**Alternative considered:** Continue adding individual selector checks. Rejected because the current two-selector guard does not scale to cards, inputs, search, status, tables, dialogs, headers, flow panels, or shell controls.

### 2. Keep route CSS for composition only

Existing `cashier-routes.css` remains the home for grids, widths, spacing, responsive layout, and workflow composition. Shared material such as focus rings, heading treatment, borders, radii, and control surfaces moves to the canonical primitive or Cashier component owner, or is explicitly registered as a variant.

**Alternative considered:** Merge every stylesheet into one large global file. Rejected because it would obscure ownership and increase cascade coupling without clarifying responsibility.

### 3. Treat the conformance matrix as a release gate

The existing Review 74 matrix becomes executable evidence. Each required row must produce workflow assertions plus computed-style, accessibility, and visual evidence where applicable. Not-applicable rows require reasons; pending rows are failures for completion purposes.

**Alternative considered:** Approve based on screenshots or the existing focused conformance test. Rejected because neither proves all routes, states, responsive behavior, reduced motion, or protected workflow semantics.

### 4. Resolve source reconciliation before visual edits

The current topbar and customer-discovery implementation will be compared with available history and OpenSpec requirements before changing presentation. If notification/avatar behavior is functional scope, it will be separated from this CSS closure pass; otherwise the accepted current behavior and limitation will be recorded.

**Alternative considered:** Infer the missing prototype branch behavior and implement it. Rejected because the authoritative source is unavailable and inference could introduce unsupported product behavior.

### 5. Diagnose failing browser evidence before updating assertions

The Overview failures will first be reproduced against the current candidate and classified as implementation regression, fixture/environment drift, or stale expectation. Assertions may change only when they reflect the current product contract; unsupported states will not be fabricated to satisfy screenshots.

**Alternative considered:** Update snapshots and selectors immediately. Rejected because it would hide whether the route itself is broken.

## Risks / Trade-offs

- **[Risk] Shared selector parsing misses nested or generated CSS forms.** → Start with explicit supported syntax, add negative fixtures, and document unsupported constructs rather than claiming broad coverage.
- **[Risk] Moving appearance rules changes the cascade.** → Capture baseline computed styles, migrate one family at a time, and rerun route and accessibility checks after each family.
- **[Risk] Browser failures are caused by test fixtures rather than production code.** → Preserve failure artifacts, classify each failure, and require a contract-based justification for assertion changes.
- **[Risk] Topbar reconciliation expands into functional work.** → Keep the decision boundary explicit; create a separate change if behavior beyond presentation is required.
- **[Risk] Dirty working-tree artifacts contaminate evidence.** → Record candidate SHA and scoped file inventory, and distinguish pre-existing changes in every report.

## Migration Plan

1. Record the current candidate revision, dirty-tree inventory, failing Playwright artifacts, and ownership baseline.
2. Resolve the topbar/customer-discovery authority and freeze the accepted scope.
3. Add the selector registry, production inventory, negative fixtures, and exception documentation.
4. Normalize remaining route-owned component appearance and preserve route composition rules.
5. Implement the route/state/viewport evidence harness and diagnose existing browser failures.
6. Run protected workflow, accessibility, lint, typecheck, build, Semgrep, and frontend browser gates.
7. Publish the conformance report with candidate revision, artifacts, deviations, and residual risks.

Rollback is a source revert of only the closure change's files. No database migration, API rollout, or data rollback is required.

## Open Questions

None that change the planned scope or architecture. The topbar decision is an implementation gate with an explicit boundary, not an unresolved assumption in the task breakdown.
