# Design: Review 76 frontend design convergence

## Context

Review 76 identifies a boundary between the completed cashier conformance milestone and the remaining frontend integration work. The current branch has stronger CSS extraction and deterministic conformance evidence, while `fix/prototype-topbar-customer-lookup` contains the newer role-aware navbar and customer-discovery behavior. The implementation must reconcile those branches without reverting the current shell ownership model or changing backend financial/RBAC authority.

## Decisions

1. **Contract-first branch reconciliation.** Compare the two branch implementations by behavior and API contract before merging. Resolve conflicts in favor of the current design-system owners plus the newer role-aware search/customer-discovery behavior. Do not merge branch history blindly.
2. **Property-scoped ownership exceptions.** Registry exceptions identify selectors and allowed layout properties, not merely files. Canonical appearance properties are rejected in route stylesheets unless a named component variant owns them.
3. **Canonical card base with explicit variants.** `ShopCityCard`/the existing shared card ownership becomes the single appearance owner. `standard`, `metric`, `table`, and `flow` variants may alter layout-only properties documented in the registry.
4. **Composition-only route CSS.** `cashier-routes.css` remains available for route geometry, responsive layout, ordering, widths, and page-specific spacing. Reusable appearance moves to primitives or named Cashier components.
5. **Preserve shell class authority.** Existing `shell-*` selectors remain authoritative where they are already centralized and accessible. Renaming for naming consistency alone is out of scope.
6. **Separate visual signals.** Figma-to-React comparisons use committed export references and stable fixtures. Existing React screenshot and computed-style tests remain complementary signals, not substitutes for Figma comparison.
7. **Staging is isolated and read-only by default.** Real-backend journeys use an isolated tenant/branch and disposable fixtures, record cleanup/reconciliation, and never use production data. Any required backend contract change is split into a separate proposal.

## Ownership model

The checker will parse declarations within each selector and compare properties against the canonical family registry:

- canonical appearance: color, background, border, radius, typography, shadow, focus, control chrome;
- composition: display, position, grid/flex layout, gap, ordering, dimensions, alignment, responsive visibility, and page geometry;
- exceptions: selector plus an explicit allowlist of composition properties and a reason.

A violation reports the source file, selector, property, canonical owner, and permitted exception (if any). The checker must fail closed for unknown exception properties.

## Branch integration sequence

1. Capture both branch SHAs and run impact analysis for shell, search, lookup, and card symbols.
2. Extract the customer-discovery/topbar behavior into a reviewable patch or merge commit.
3. Reapply/verify ownership and card changes without reintroducing component-local CSS.
4. Run contract, accessibility, route, responsive, and visual checks after each conflict group.
5. Record preserved behavior and intentional deviations in evidence.

## Verification strategy

- Static: ownership registry/checker, CSS inventory, generated artifact diff, lint, typecheck, build, Semgrep.
- Unit/contract: search normalizers, masking, role categories, stale-response handling, card verification call count, card variants, and financial gating.
- Browser: Cashier/Supervisor/Admin shell states, six Cashier routes, keyboard/focus, responsive/reduced motion, and protected transitions.
- Figma: stable font/fixture setup, per-surface reference comparisons, computed style/property report, and approved tolerance/deviation records.
- Staging: customer name/phone search, exact card verification, Capture Purchase, Redeem, authorization/masking, and cleanup/reconciliation.
- Final: OpenSpec validation, GitNexus detect changes, clean scoped diff inspection, candidate SHA and residual-risk handoff.

## Rollback

If branch reconciliation regresses shell or lookup behavior, revert the integration patch while retaining the property-scoped checker and canonical card migration independently. If Figma or staging evidence is unstable, block certification rather than weakening thresholds or altering backend authority.
