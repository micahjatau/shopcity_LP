# frontend-operational-ux Specification

## Purpose

Define stable, accessible shared search and coherent operational page composition for ShopCity's web frontend while preserving backend-owned behavior and authority.

## ADDED Requirements

### Requirement: Global search controls have stable geometry

The global search input and action region MUST retain stable dimensions and placement when the user changes among authorized search categories. Category-specific behavior MUST remain correct, including explicit exact-card verification.

#### Scenario: User changes search category

- **WHEN** the user switches between Customers, Cards and Cashiers
- **THEN** the input and action region MUST NOT reflow because a category-specific button appears or disappears
- **AND** the selected category MUST determine the existing appropriate search behavior
- **AND** exact-card results MUST NOT bypass verification.

#### Scenario: Search is used across accepted viewports

- **WHEN** the topbar is displayed at 1440px or 920px viewport width
- **THEN** the rendered input bounding box MUST be at least 180 CSS px wide, independently of category/action width
- **WHEN** the topbar is displayed at 390px or 375px viewport width
- **THEN** the input bounding box MUST be at least 120 CSS px wide, using the approved wrap/compact fallback if needed
- **AND** the input text and placeholder MUST remain readable without horizontal page overflow
- **AND** the approved HTML reference MUST be checked and any larger reference-derived minimum MUST take precedence.

### Requirement: Search results are meaningful and dismissible

The search results surface MUST only be shown when it contains meaningful loading, result, empty or error content, and MUST support pointer, keyboard and assistive-technology interaction.

#### Scenario: Empty search receives focus

- **WHEN** the query is empty and the input receives focus or a category is selected
- **THEN** the input focus state MAY be displayed
- **AND** an empty results container MUST NOT be rendered.

#### Scenario: Eligible query is pending or completed

- **WHEN** a non-empty eligible query is loading or resolves
- **THEN** the user MUST receive a meaningful loading, selectable-results, no-results or error state
- **AND** status and option semantics MUST match the content actually rendered.

#### Scenario: User dismisses the results surface

- **WHEN** the user clicks outside the search surface
- **THEN** the dropdown MUST close and active-result selection MUST clear without hijacking focus
- **WHEN** the user presses Escape
- **THEN** the dropdown MUST close, active selection MUST clear, and focus MUST return to search.

#### Scenario: User selects a result

- **WHEN** the user selects a result by pointer or keyboard
- **THEN** the existing authorized route handoff MUST occur
- **AND** the dropdown MUST close while existing focus and keyboard behavior remains accessible.

### Requirement: Ineligible search transitions invalidate pending requests

Pending search work MUST be invalidated whenever its query/category is cleared, becomes ineligible, changes category, or its dropdown is dismissed, so stale responses cannot restore obsolete results.

#### Scenario: Query is cleared during a request

- **WHEN** an eligible search request is pending and the user clears the query
- **THEN** the pending request MUST no longer be able to populate results or reopen the dropdown.

#### Scenario: Category changes during a request

- **WHEN** a request for one category is pending and the user changes category
- **THEN** its response MUST NOT populate the newly selected category's results.

#### Scenario: Search is closed during a request

- **WHEN** the user dismisses the dropdown while a request is pending
- **THEN** the late response MUST NOT reopen the dropdown or restore hidden stale results.

### Requirement: Operational page composition communicates the task and scope

Operational pages MUST present a coherent hierarchy of title/description, primary and secondary actions, task content, record scope, status and details. Copy MUST be user-oriented and truthful about available data and system behavior. Route DOM order alone does not establish visual acceptance.

#### Scenario: Sync Queue is rendered

- **WHEN** a cashier opens Sync Queue
- **THEN** queue status and the primary Sync action MUST be visually associated with the page header
- **AND** Refresh MUST be secondary
- **AND** device identity and record count MUST each be presented once
- **AND** internal layout commentary and redundant instructional copy MUST NOT be shown
- **AND** record details and technical diagnostics MUST remain accessible but subordinate to the queue task
- **AND** retry, reconciliation, queue status and diagnostic behavior MUST be preserved.

#### Scenario: Transactions is rendered

- **WHEN** a cashier opens Transactions
- **THEN** the heading and description MUST identify bounded cashier activity including purchase/Earn and redemption activity
- **AND** the page MUST NOT imply complete historical ledger coverage unless the data source supports that scope
- **AND** transaction facts MUST precede secondary audit/technical metadata in detail presentation.

#### Scenario: Page visual acceptance is evaluated

- **WHEN** page composition is assessed
- **THEN** heading relationships, action placement, grouping, whitespace/data density, state presentation and responsive reading order MUST be reviewed alongside DOM structure
- **AND** the route-by-route evidence MUST be retained in `docs/frontend/repo-review-79-composition-audit.md` with reference/derived status, role/state/viewport, deviations and unresolved mismatches
- **AND** a React-only snapshot or landmark/order test MUST NOT be represented as HTML-to-React visual parity evidence.

### Requirement: Role landing cards respect featured state

Admin and Supervisor landing cards MUST use the value of their `featured` flag to determine featured layout, not the presence of the property.

#### Scenario: Featured and ordinary cards render

- **WHEN** a route has `featured: true`
- **THEN** it MUST receive the featured visual treatment
- **WHEN** a route has `featured: false`
- **THEN** it MUST receive the ordinary card layout.

### Requirement: Connectivity status uses human-readable, truthful labels

The topbar MUST map every connectivity state to human-readable labels and MUST NOT imply API health based solely on browser connectivity.

#### Scenario: Connectivity enum is rendered

- **WHEN** any supported connectivity state is shown
- **THEN** its label MUST be human-readable and MUST NOT expose raw internal enum text
- **AND** browser connectivity MUST NOT be presented as API/service health without an independent health signal.

### Requirement: Visual comparisons preserve provenance

Prototype parity MUST be substantiated by paired same-route, same-role, same-state, same-browser and same-viewport HTML and React evidence. Reference images MUST NOT be regenerated solely to make a test pass.

#### Scenario: Visual comparison is incomplete

- **WHEN** a required prototype reference, authenticated state or browser capture is unavailable
- **THEN** the limitation MUST be recorded as blocked or unavailable
- **AND** React snapshots MUST remain a separate regression signal rather than a substitute for prototype comparison.
