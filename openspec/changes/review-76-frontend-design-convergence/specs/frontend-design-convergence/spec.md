# Frontend Design Convergence Specification

## ADDED Requirements

### Requirement: Branch reconciliation preserves both functional and design-system behavior

The implementation MUST reconcile the role-aware navbar/customer-discovery behavior with the current design-system branch without reintroducing embedded or competing shared appearance rules.

#### Scenario: Reconciled shell behavior

- **GIVEN** the two candidate frontend implementations are compared
- **WHEN** the integration patch is applied
- **THEN** role-aware navbar, profile/notification, search, customer discovery, and verified-card behavior are present
- **AND** the centralized shell ownership and current cashier conformance behavior remain intact
- **AND** conflicts and preserved behavior are recorded in evidence

#### Scenario: Financial and authorization boundaries remain unchanged

- **GIVEN** a selected customer, cashier, or card result
- **WHEN** the result is handed to a workflow
- **THEN** backend card verification, RBAC, branch/tenant scope, integer-kobo validation, CSRF, idempotency, approval, and offline safeguards remain authoritative

### Requirement: Ownership exceptions are property-scoped

The style ownership checker MUST enforce selector- and property-scoped exceptions and MUST reject canonical appearance declarations in route composition styles.

#### Scenario: Composition exception passes

- **GIVEN** an explicitly registered selector exception
- **WHEN** it declares only allowed composition properties
- **THEN** ownership validation passes
- **AND** the diagnostic records the selector, allowed properties, reason, and canonical owner

#### Scenario: Appearance leakage fails

- **GIVEN** an exempt route selector
- **WHEN** it declares a canonical color, background, border, radius, typography, shadow, focus, or control-chrome property
- **THEN** ownership validation fails with source, selector, property, and canonical-owner diagnostics

#### Scenario: Unknown exception fails closed

- **GIVEN** an exception contains an unknown property or unknown selector family
- **WHEN** the registry is validated
- **THEN** validation fails rather than silently permitting the declaration

### Requirement: Card appearance has one canonical vocabulary

Cashier and shared card surfaces MUST use one canonical card base with explicit named variants for documented layout differences.

#### Scenario: Card variants preserve shared appearance

- **GIVEN** `standard`, `metric`, `table`, or `flow` card variants render
- **WHEN** computed styles are captured
- **THEN** core surface, border, radius, typography, and focus properties come from the canonical owner
- **AND** only documented variant layout properties differ

#### Scenario: Route stylesheet is composition-only

- **GIVEN** a rule in `cashier-routes.css`
- **WHEN** it is classified by the ownership checker
- **THEN** it contains only route geometry, responsive layout, ordering, widths, alignment, or documented composition spacing
- **AND** reusable appearance is owned by primitives or named Cashier components

### Requirement: Reconciled shell is role-aware and accessible

The shared shell MUST provide truthful, role-authorized search and consistent responsive interaction for Cashier, Supervisor, and Admin users.

#### Scenario: Authorized search categories

- **GIVEN** a Cashier shell
- **WHEN** global search opens
- **THEN** only supported Cashier categories and destinations are exposed

- **GIVEN** a Supervisor or Admin shell
- **WHEN** global search opens
- **THEN** customer/card/cashier categories are exposed only where authorized
- **AND** returned records remain tenant/branch scoped and safely masked

#### Scenario: Search interaction states

- **GIVEN** a user searches, changes query, presses arrows/Enter/Escape, or receives an error
- **WHEN** results render
- **THEN** loading, empty, error, stale-response suppression, keyboard selection, and focus restoration are accessible and truthful

#### Scenario: Responsive shell behavior

- **GIVEN** desktop, tablet, mobile, or reduced-motion preferences
- **WHEN** the shell renders
- **THEN** sidebar, topbar, profile/notification controls, search, and mobile drawer remain usable without prohibited overflow, clipping, or inaccessible targets
- **AND** applicable transitions are reduced or suppressed

### Requirement: Exact visual conformance is separately evidenced

The implementation MUST compare rendered surfaces against committed Figma export references in addition to React snapshots and computed-style checks.

#### Scenario: Figma comparison passes

- **GIVEN** a stable font, fixture, route, state, and approved viewport
- **WHEN** a Figma-to-React comparison runs
- **THEN** the report identifies the reference, route/state, measured differences, tolerance, and pass/fail result

#### Scenario: Intentional deviation is recorded

- **GIVEN** a difference is required by the product contract or accessibility constraint
- **WHEN** the comparison cannot match the reference exactly
- **THEN** the deviation records its reason, owner, scope, and approval instead of weakening the global threshold

### Requirement: Real staging journeys validate the integrated frontend

The final evidence MUST include isolated staging journeys for customer discovery, exact card verification, Capture Purchase, and Redeem Credit.

#### Scenario: Staging workflow passes

- **GIVEN** disposable tenant/branch fixtures and an isolated staging environment
- **WHEN** the four journeys execute
- **THEN** authorization, masking, lookup authority, financial gating, approval/offline/error behavior, and cleanup/reconciliation checks pass
- **AND** no production data is mutated

### Requirement: Final delivery is fully evidenced

The change MUST not be called complete until all static, unit, browser, visual, staging, security, build, OpenSpec, and GitNexus gates pass or an accepted deviation is recorded.

#### Scenario: Final handoff

- **GIVEN** the implementation and all gates have run
- **WHEN** the final evidence is published
- **THEN** it records candidate SHA, branch sources, environment, reports/screenshots, accepted deviations, residual risks, rollback path, and dirty-tree separation
