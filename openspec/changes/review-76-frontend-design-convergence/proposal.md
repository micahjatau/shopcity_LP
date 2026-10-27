# Change: Frontend design convergence after Review 76

## Why

`docs/repo_review_76.md` confirms that the cashier design-system work materially improved CSS extraction, ownership, and route conformance, but it is not the final frontend convergence point. Four gaps remain coupled: permitted ownership exceptions are not property-safe, card vocabularies remain duplicated, route CSS still mixes reusable appearance with composition, and the role-aware navbar/customer-discovery implementation remains on `fix/prototype-topbar-customer-lookup` rather than this branch. Exact Figma fidelity and real staging journeys are also not yet acceptance evidence.

## What changes

### 1. Reconcile the functional frontend branches

- Compare `workflow-states-implementation` with `fix/prototype-topbar-customer-lookup` at file and behavior level before merging.
- Bring the role-aware navbar, notification/profile surface, customer-directory discovery, and verified-card lookup behavior into the design-system branch.
- Preserve the current `shell-*` class authority unless a concrete duplicate or accessibility defect requires a change.
- Preserve generated API contracts, Cashier-safe masking, branch/tenant authorization, session authority, idempotency, offline behavior, and financial workflow transitions.
- Add explicit conflict-resolution evidence so neither the newer navbar/customer lookup behavior nor the current CSS ownership cleanup is silently lost.

### 2. Make ownership exceptions property-safe

- Replace file-level exceptions in `style-ownership-registry.mjs` with selector/property-scoped allowlists.
- Define which properties are composition-only (`display`, `grid`, `flex`, `gap`, sizing, alignment, ordering, and responsive layout) and reject canonical appearance properties in route exceptions.
- Reject route-level colors, backgrounds, borders, radii, typography, shadows, focus treatment, and control chrome unless an explicit named variant owns and documents them.
- Add negative fixtures for an exempt file changing canonical appearance and positive fixtures for permitted layout-only overrides.
- Report the selector, property, canonical owner, exception, and source file in failures.

### 3. Consolidate card vocabularies and reduce route CSS

- Establish one canonical card component/style vocabulary with explicit `standard`, `metric`, `table`, and `flow` variants.
- Define the shared card base once; variants may change documented layout properties but may not redefine core surface, border, radius, typography, or focus appearance.
- Migrate remaining `.sc-card`/`.cashier-card` overlap and classify or remove route-local appearance rules.
- Reduce `cashier-routes.css` to route composition: layout, ordering, widths, responsive stacking, and page-specific spacing.
- Keep reusable appearance in the canonical primitive/Cashier component owner and preserve intentional route variants as named modifiers.

### 4. Reconcile and verify the shell after integration

- Verify the role-aware topbar, notification/profile controls, global search, avatar, sidebar expanded/collapsed states, mobile drawer, active/focus states, icon dimensions, and session/device metadata visibility.
- Verify Cashier, Supervisor, and Admin search authorization, result masking, keyboard navigation, Escape/focus return, loading, empty, error, and stale-response behavior.
- Verify Find Customer discovery by name/phone and exact card lookup/deep-link handoff without regressing the existing 404/error contract.
- Run desktop, tablet, mobile, and reduced-motion checks after branch reconciliation.

### 5. Establish exact visual and staging acceptance

- Add Figma-to-React comparisons against the committed Figma export references, separately from React snapshot comparisons.
- Define per-surface tolerances and record intentional differences instead of relying only on the existing 8% screenshot threshold.
- Capture the six Cashier routes plus shell role consumers at approved viewports and required states.
- Run staging journeys against a real backend for customer search, card verification, Capture Purchase, and Redeem; verify authorization, masking, approval/offline/error behavior, and financial safeguards without mutating production data.
- Record candidate SHA, source references, environment, reports/screenshots, accepted deviations, and residual risks.

## Scope

In scope: frontend branch reconciliation, shell and customer-discovery behavior, verified-card lookup presentation, selector/property ownership enforcement, canonical card variants, route stylesheet composition cleanup, Figma comparison tooling/evidence, staging browser journeys, generated frontend artifacts required by existing contracts, and related tests/docs.

Out of scope: changing backend financial calculations, ledger/history semantics, transaction authorization, RBAC rules, authentication/session authority, queue semantics, database schema, approval policy, or introducing GraphQL/microservices.

## Acceptance criteria

- The role-aware navbar/customer-discovery implementation and the cashier design-system cleanup coexist on one branch, with conflicts and preserved behavior documented.
- Ownership exceptions are selector/property-scoped; exempt route CSS cannot change canonical appearance properties, and negative/positive fixtures prove enforcement.
- A single canonical card vocabulary with named variants replaces overlapping `.sc-card`/`.cashier-card` appearance definitions.
- `cashier-routes.css` contains composition-only rules except for documented named variants, and the ownership checker passes the complete production inventory.
- Cashier, Supervisor, and Admin shell behavior passes role, authorization, keyboard, focus, responsive, reduced-motion, and overflow checks.
- Customer discovery supports the accepted name/phone/card flows and preserves exact error, masking, branch scope, and deep-link behavior.
- Figma-to-React comparisons are executed against committed export references with recorded tolerances and deviations; React snapshots remain a separate signal.
- Staging journeys pass for customer search, card verification, Capture Purchase, and Redeem without changing backend financial or authorization behavior.
- Frontend lint, typecheck, Jest/accessibility, ownership, conformance, Figma comparison, staging, build, Semgrep, and final CI gates pass.
- Final evidence identifies the candidate revision, environment, artifacts, accepted deviations, residual risks, and rollback/branch-reconciliation path.

## Risks and mitigations

- **Branch conflict regression:** reconcile behavior by contract and run the existing conformance suite before and after each integration step.
- **Over-constrained ownership rules:** allow only explicitly enumerated composition properties and require a named variant for visual differences.
- **Figma false positives:** use stable fonts/fixtures, computed-style evidence, and documented per-property tolerances alongside screenshots.
- **Staging data mutation:** use isolated tenant/branch fixtures, disposable cards/customers, and a cleanup/reconciliation procedure.
- **Scope expansion into backend behavior:** treat any required API/RBAC/schema change as a separately proposed change rather than modifying this frontend convergence proposal.
