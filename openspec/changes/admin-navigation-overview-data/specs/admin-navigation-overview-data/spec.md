# Admin navigation and Overview data (delta)

## ADDED Requirements

### Requirement: Admin navigation icons fit their destinations

The Admin sidebar MUST use icons that visually fit each navigation destination while retaining the existing labels, route destinations, route aliases, and role boundaries. Operations MUST use an operational-health/workflow symbol, Transactions a receipt/transaction symbol, and Fraud a security-alert symbol. Directory and control destinations MUST remain under Operations → Controls and MUST NOT be added as new sidebar items.

#### Scenario: Admin scans primary navigation

- **WHEN** an Admin views the primary sidebar
- **THEN** Operations, Transactions, and Fraud use distinct context-appropriate symbols
- **AND** Customers, Cards, Approvals, Reports, and Policies retain symbols suited to their meaning
- **AND** link text and accessible names continue to identify each route independently of its icon.

#### Scenario: Admin opens a control directory

- **WHEN** an Admin opens Users, Devices, Branches, Audit, or Adjustments from Operations → Controls
- **THEN** the destination remains in the existing Admin Operations route aliases
- **AND** no new sidebar destination or authorization path is introduced.

### Requirement: Active virtual-card Overview metric is authoritative

The API MUST provide an Admin-only metric for the number of active virtual cards in the authenticated Admin's tenant. It MUST count only `Card` records whose tenant matches the authenticated tenant and whose status is `ACTIVE`. The Overview MUST render that validated count and MUST NOT infer it from customer counts or report snapshots.

#### Scenario: Admin loads the active-card count

- **GIVEN** an authenticated Admin in a tenant
- **WHEN** the Admin Overview requests its active virtual-card metric
- **THEN** the API returns a non-negative integer count for that tenant only
- **AND** the response is available only to Admins.

#### Scenario: A different role or tenant requests the metric

- **WHEN** a non-Admin requests the Admin metric endpoint
- **THEN** the request is rejected
- **AND** the query does not accept a client-supplied tenant identifier.

#### Scenario: Metric is unavailable or malformed

- **WHEN** the request fails or its response does not satisfy the documented envelope and count contract
- **THEN** the Overview displays an unavailable/error state with its existing retry behavior
- **AND** it does not display zero as a fallback.

### Requirement: Existing Overview report semantics remain unchanged

Adding the live active-card metric MUST NOT change materialized report values, integer-kobo financial semantics, or the meaning of cumulative registered-customer snapshots. Missing report values MUST remain missing rather than being filled with invented values.

#### Scenario: Overview loads report charts alongside live count

- **WHEN** report materialization is current or incomplete
- **THEN** credit, liability, and registration content continues to use the existing authorized report endpoints and materialization-state semantics
- **AND** the active-card metric remains an independent request/state
- **AND** cumulative registration snapshots are not reinterpreted as daily new registrations.
