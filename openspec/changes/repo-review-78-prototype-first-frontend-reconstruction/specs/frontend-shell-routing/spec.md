# Frontend prototype-first presentation

## ADDED Requirements

### Requirement: Shared operational navbar follows the approved prototype composition

The frontend SHALL use one shared operational navbar whose visible hierarchy follows the approved prototype topbar while preserving role-aware search authorization and existing shell behavior.

#### Scenario: Cashier sees the approved search categories

- **GIVEN** an authenticated cashier session on any operational route
- **WHEN** the shared navbar renders
- **THEN** the search input and category selector are presented as adjacent controls
- **AND** the available categories are Customers and Cards
- **AND** session/device diagnostic copy is not rendered in the navbar presentation

#### Scenario: Supervisor or admin sees authorized categories

- **GIVEN** an authenticated supervisor or admin session
- **WHEN** the shared navbar renders
- **THEN** the category selector offers Customers, Cards, and Cashiers
- **AND** unauthorized search results remain unavailable

### Requirement: Approved prototype markup governs route presentation structure

The frontend SHALL translate approved prototype markup into React presentation hierarchy for the operational routes while retaining authoritative production controllers and truthful state handling.

#### Scenario: Overview preserves prototype content order

- **GIVEN** an authenticated cashier opens Overview
- **WHEN** the page renders
- **THEN** the page heading, quick actions, activity metrics, recent-transactions table, and footer appear in the approved prototype order
- **AND** bounded production activity data and role-authorized actions remain in control of the content

#### Scenario: Workflow route preserves production behavior under prototype presentation

- **GIVEN** a cashier uses Find Customer, Capture Purchase, Redeem Credit, or Transactions
- **WHEN** the route renders or advances state
- **THEN** its visible hierarchy follows the approved route prototype
- **AND** lookup, authorization, financial validity, masking, idempotency, offline, loading, error, and success behavior remains authoritative

### Requirement: Prototype comparison is separate from regression snapshots

The frontend SHALL require route/state/viewport comparison evidence against approved prototype references before declaring a route visually complete.

#### Scenario: A route is certified

- **GIVEN** a route implementation is proposed as complete
- **WHEN** its acceptance evidence is reviewed
- **THEN** matching prototype and React screenshots, DOM landmarks, responsive/accessibility checks, and intentional deviations are recorded
- **AND** passing React snapshots alone do not certify visual completion
