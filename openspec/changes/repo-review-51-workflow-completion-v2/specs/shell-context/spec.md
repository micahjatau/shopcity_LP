## ADDED Requirements

### Requirement: Workspaces are route-backed and role-aware

The frontend SHALL replace placeholder cards with real cashier, supervisor, and admin route entry points.

#### Scenario: Persona route opens the correct workspace

- **GIVEN** an authenticated user with a known role
- **WHEN** they open the application
- **THEN** the shell presents the correct persona workspace entry points for that role
- **AND** unused persona areas are not shown as actionable controls

#### Scenario: Unknown or unauthorized access is blocked

- **GIVEN** a user attempts to open a route they cannot access
- **WHEN** the route resolves
- **THEN** the user sees an authorization-aware fallback state
- **AND** no forbidden data is rendered

### Requirement: Public configuration is visible shell context

The frontend SHALL render public branch, tenant, timezone, policy, and offline-redemption context where those values affect the user decision.

#### Scenario: Shell shows live organization context

- **GIVEN** public configuration is available
- **WHEN** the shell renders
- **THEN** the current tenant, branch identity, and timezone are visible
- **AND** policy values that shape workflows are available in the relevant workspace

#### Scenario: Missing public config fails gracefully

- **GIVEN** public configuration is temporarily unavailable
- **WHEN** the shell renders
- **THEN** the UI shows a non-destructive fallback state
- **AND** the app does not invent branch, tenant, policy, or offline-redemption values

### Requirement: Placeholder affordances are not treated as real actions

The frontend SHALL NOT present no-op buttons, fake cards, or summary text as if they were operational workflows.

#### Scenario: Nonfunctional control is removed or hidden

- **GIVEN** a button or card has no real handler or navigation target
- **WHEN** the workspace renders
- **THEN** the control is hidden, disabled, or replaced with truthful copy
- **AND** the user is not misled into expecting a working action

#### Scenario: Demo metrics are not shown as operational truth

- **GIVEN** a previous panel showed demo numbers
- **WHEN** the new workflow loads
- **THEN** it either uses live data or stays hidden until the source exists
