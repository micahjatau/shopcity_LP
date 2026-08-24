## MODIFIED Requirements

### Requirement: Cashier shell keeps operational context visible

The frontend SHALL keep cashier operational context visible in the shell as compact status and identity information so connection, sync, branch, and device state remain easy to reach without burying the active workflow.

#### Scenario: Cashier sees compact status

- **GIVEN** an authenticated cashier session
- **WHEN** the shell renders on a cashier route
- **THEN** the shell surfaces connection/sync state and branch/device context in a compact area
- **AND** the primary workflow area remains visually dominant

#### Scenario: Cashier sees sync and branch context

- **GIVEN** an authenticated cashier session
- **WHEN** the shell renders on a cashier route
- **THEN** the shell surfaces connection/sync state
- **AND** branch/device context remains visible without dominating the workflow

### Requirement: Cashier overview is a compact operational launcher

The frontend SHALL keep `/cashier` as a lightweight operational launcher with scanner/search as the primary action and direct access to lookup, Earn, Redeem, and Sync routes.

#### Scenario: Cashier overview renders

- **GIVEN** a cashier opens `/cashier`
- **WHEN** the page renders
- **THEN** scan/search is the first primary action
- **AND** the page does not embed full Earn or Redeem forms
- **AND** it preserves quick access to dedicated workflow routes and active sync state

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
