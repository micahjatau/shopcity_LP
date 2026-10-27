# Role-Aware Search and Shared Lookup Specification

## ADDED Requirements

### Requirement: Topbar search is functional and role-aware

The shared topbar MUST provide a reusable search surface whose categories derive from the authenticated role and whose results navigate only to supported authorized destinations.

#### Scenario: Cashier categories

- **GIVEN** an authenticated Cashier shell
- **WHEN** global search is focused
- **THEN** Customers and Cards are available
- **AND** Cashiers are not exposed as a category

#### Scenario: Supervisor/Admin categories

- **GIVEN** an authenticated Supervisor or Admin shell
- **WHEN** global search is focused
- **THEN** Customers, Cards, and Cashiers are available
- **AND** each result uses a supported selected-record destination

#### Scenario: Search interaction lifecycle

- **GIVEN** a user enters a directory query
- **WHEN** the query settles
- **THEN** the appropriate directory request is debounced and stale responses cannot replace newer results
- **AND** loading, error, empty, and result states are announced accessibly
- **AND** Escape closes the results and restores focus to the search input

### Requirement: Customer discovery is contract-backed and Cashier-safe

Global customer search MUST use the existing customer directory contract for name, phone, email, and card-barcode discovery and MUST preserve backend masking for Cashier responses.

#### Scenario: Customer search fields

- **GIVEN** a query matching a supported name, phone, email, or card barcode
- **WHEN** the customer directory responds
- **THEN** matching backend-provided results are shown without client-side authority expansion
- **AND** Cashier-visible fields remain masked according to the response

### Requirement: Exact card verification is explicit

Card search MUST use the existing authoritative card lookup and MUST NOT invoke the rate-limited endpoint on every input change.

#### Scenario: Card lookup submit

- **GIVEN** a user enters a card serial in the Cards category
- **WHEN** the user submits via Search or Enter
- **THEN** exactly one authoritative card lookup is issued for the submitted serial
- **AND** the result exposes only the supported verified card context or a truthful error

### Requirement: Cashier directory is narrowly scoped

Supervisor/Admin cashier discovery MUST use a minimal directory contract that enforces tenant scope and Supervisor branch scope in the backend; it MUST NOT broaden the Admin-only `/users` endpoint.

#### Scenario: Supervisor branch scope

- **GIVEN** a Supervisor authenticated to branch A
- **WHEN** cashier search is requested
- **THEN** only branch-A Cashier summaries are returned
- **AND** branch-B Cashiers are not observable

#### Scenario: Admin tenant scope

- **GIVEN** an Admin authenticated to a tenant
- **WHEN** cashier search is requested
- **THEN** only Cashiers in that tenant are returned
- **AND** non-Cashier roles and other tenants are excluded

### Requirement: Capture Purchase and Redeem share verified lookup presentation

Capture Purchase and Redeem Credit MUST use one `VerifiedCardLookupStep` for initial card lookup states while preserving their existing controllers and route-specific outer widths.

#### Scenario: Paired idle and loading states

- **GIVEN** either financial workflow is at its initial lookup step
- **WHEN** the step is idle or loading
- **THEN** heading, input styling, action, status slot, spacing, padding, and internal dimensions match between routes

#### Scenario: Failed and verified states

- **GIVEN** card lookup fails or returns an authoritative record
- **WHEN** either workflow renders the state
- **THEN** the shared component presents the same error or verified-card geometry
- **AND** financial fields remain gated until verified context is available

#### Scenario: Redeem initial state

- **GIVEN** Redeem Credit starts
- **WHEN** its initial stage renders
- **THEN** the shared lookup step is mounted
- **AND** no generic empty WorkflowSection fallback remains mounted after transition

### Requirement: Financial safeguards remain authoritative

Search and shared lookup changes MUST preserve generated clients, controller validation, integer-kobo financial logic, CSRF, idempotency, offline behavior, approval states, route transitions, and RBAC.

#### Scenario: Lookup cannot grant financial authority

- **GIVEN** a directory result is selected
- **WHEN** Capture Purchase or Redeem receives it
- **THEN** the workflow still requires authoritative card verification before submission
- **AND** no frontend result can grant role, balance, approval, or transaction authority
