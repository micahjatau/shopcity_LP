## ADDED Requirements

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
