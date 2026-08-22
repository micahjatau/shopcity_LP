## ADDED Requirements

### Requirement: Role-aware navigation is registry-driven

The frontend SHALL use one canonical navigation registry to drive role-based shell visibility, active state, and route metadata.

#### Scenario: Cashier sees only cashier navigation

- **GIVEN** an authenticated cashier session
- **WHEN** the application shell renders
- **THEN** the cashier navigation entries are visible
- **AND** supervisor/admin-only entries are hidden

#### Scenario: Active route state comes from the same registry

- **GIVEN** a user is on a workflow route
- **WHEN** the shell renders the navigation state
- **THEN** the active item is derived from the same registry used for route visibility
- **AND** the UI does not maintain a separate, conflicting route map

### Requirement: Cashier shell keeps operational context visible

The frontend SHALL keep cashier operational context visible in the shell so connection, sync, and branch/device state remain easy to reach without burying the workflow forms.

#### Scenario: Cashier sees sync and branch context

- **GIVEN** an authenticated cashier session
- **WHEN** the shell renders on a cashier route
- **THEN** the shell surfaces connection/sync state
- **AND** branch/device context remains visible without dominating the workflow

### Requirement: Cashier Earn and Redeem use dedicated routes

The frontend SHALL expose cashier Earn and Redeem as dedicated workflow routes while keeping `/cashier` as an overview/launchpad page.

#### Scenario: Earn and Redeem are independently addressable

- **GIVEN** a cashier opens an Earn or Redeem deep link
- **WHEN** the route loads
- **THEN** the dedicated workflow page renders the requested workflow
- **AND** the page does not depend on the oversized `/cashier` overview to function

#### Scenario: Cashier overview is not the full workflow container

- **GIVEN** a cashier opens `/cashier`
- **WHEN** the page renders
- **THEN** the page provides operational overview and launch actions
- **AND** it does not embed the full Earn and Redeem forms
- **AND** it preserves quick access to the active sync state and dedicated workflow routes

### Requirement: Responsive navigation matches the viewport

The frontend SHALL render desktop, tablet, and mobile navigation patterns appropriate to the viewport instead of shrinking the desktop sidebar into an unreadable column.

#### Scenario: Desktop uses a sidebar or collapsible rail

- **GIVEN** a large viewport
- **WHEN** the shell renders
- **THEN** the primary navigation is presented as a sidebar or collapsible rail

#### Scenario: Mobile uses an accessible drawer

- **GIVEN** a small viewport
- **WHEN** navigation is opened
- **THEN** the shell uses an accessible drawer or sheet
- **AND** the desktop sidebar is not squeezed into the mobile layout
