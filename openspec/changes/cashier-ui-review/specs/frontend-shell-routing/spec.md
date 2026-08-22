## MODIFIED Requirements

### Requirement: Cashier shell keeps operational context visible

The frontend SHALL keep cashier operational context visible in the shell as compact status and identity information so connection, sync, branch, and device state remain easy to reach without burying the active workflow.

#### Scenario: Cashier sees compact status

- **GIVEN** an authenticated cashier session
- **WHEN** the shell renders on a cashier route
- **THEN** the shell surfaces connection/sync state and branch/device context in a compact area
- **AND** the primary workflow area remains visually dominant

### Requirement: Cashier Earn and Redeem use dedicated routes

The frontend SHALL expose cashier Earn and Redeem as dedicated workflow routes whose first visible content is the current task, not a full launcher or route grid.

#### Scenario: Earn and Redeem are independently addressable

- **GIVEN** a cashier opens an Earn or Redeem deep link
- **WHEN** the route loads
- **THEN** the dedicated workflow page renders the requested workflow
- **AND** the page does not depend on the `/cashier` overview to function

#### Scenario: Dedicated workflow pages stay task-focused

- **GIVEN** a cashier opens an Earn or Redeem route
- **WHEN** the page renders
- **THEN** the page starts with the workflow-specific form or task context
- **AND** it does not repeat the full cashier navigation set or launchpad cards

### Requirement: Cashier overview is a compact operational launcher

The frontend SHALL keep `/cashier` as a lightweight operational launcher that highlights the next cashier action and avoids turning the page into a dashboard.

#### Scenario: Cashier overview renders

- **GIVEN** a cashier opens `/cashier`
- **WHEN** the page renders
- **THEN** the page provides quick entry points to lookup, earn, redeem, and sync
- **AND** it does not embed the full Earn or Redeem forms
- **AND** it does not duplicate the sidebar navigation as a route grid
- **AND** it keeps supplementary notes subordinate to the primary action

### Requirement: Cashier sync queue is queue-first and compact

The frontend SHALL present the cashier sync queue as an operations page with queue summary, batch submission, and selected-record recovery above secondary record detail.

#### Scenario: Sync queue renders

- **GIVEN** a cashier opens `/cashier/sync`
- **WHEN** the page renders
- **THEN** queue summary and the primary sync action appear before record detail tables
- **AND** the page does not repeat the full cashier navigation set

#### Scenario: Sync queue keeps record detail subordinate

- **GIVEN** a cashier selects a local offline record
- **WHEN** the detail panel renders
- **THEN** the selected record details remain available for recovery and review
- **AND** the batch reconciliation controls stay visible and primary
