# frontend-shell-routing Specification

## Purpose

Provide the role-aware frontend shell and cashier workflow routing contract for ShopCity.

## Requirements

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

### Requirement: Navigation registry and dashboard shortcuts must stay in sync with existing routes

The frontend SHALL keep the canonical role navigation registry and any dashboard quick actions aligned with routes that actually exist.

#### Scenario: Admin navigation renders only real destinations

- **WHEN** an authenticated admin opens the shell
- **THEN** every visible admin navigation item resolves to an existing route
- **AND** no sidebar entry points to a missing page

#### Scenario: Dashboard quick actions are derived from the same route model

- **WHEN** the admin homepage renders its quick actions
- **THEN** the actions either come from the canonical registry or a clearly smaller deliberate subset
- **AND** the page does not maintain a conflicting route registry

### Requirement: Sidebar collapse must render a real icon rail

The shell SHALL collapse to a narrower icon rail with reduced width, icons, and accessible labels/tooltips instead of hiding text in the same-width layout.

#### Scenario: The sidebar is collapsed

- **WHEN** the user collapses the shell navigation
- **THEN** the sidebar width decreases to the rail layout
- **AND** navigation remains usable through icons and accessible labels

#### Scenario: Tablet defaults to the rail layout

- **WHEN** the shell renders on a tablet-sized viewport
- **THEN** it uses the rail pattern instead of a pseudo-expanded desktop sidebar

### Requirement: Mobile navigation must trap focus and keep the background inert

The mobile drawer SHALL behave like an accessible modal with focus containment, escape handling, and a skip link into the main application.

#### Scenario: The mobile drawer is open

- **WHEN** the user tabs through the drawer
- **THEN** focus remains inside the drawer until it closes
- **AND** the background application is inert or otherwise unreachable by keyboard navigation

#### Scenario: The drawer is dismissed

- **WHEN** the user closes the mobile drawer
- **THEN** focus returns to the invoking control or a predictable shell target
