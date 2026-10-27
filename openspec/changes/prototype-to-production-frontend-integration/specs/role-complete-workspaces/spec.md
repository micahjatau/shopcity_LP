## ADDED Requirements

### Requirement: Shared operational workspaces are role-capability aware

Customer, Card, Transaction, Approval, Fraud, Reporting, and Operations workspaces MUST be reusable across roles without importing a role's page as the implementation for another role.

#### Scenario: Supervisor or Admin opens an operational workspace

- **WHEN** the workspace renders
- **THEN** it composes shared components with explicit capabilities
- **AND** server-enforced role, tenant, and branch scope controls data and actions
- **AND** it does not expose a mixed-role production workflow page

### Requirement: Mature operational capabilities remain reachable

The production frontend MUST provide role-safe routes for card/customer lifecycle, reversals, adjustments, approvals, fraud, reporting/export, SMS operations, pilot health, users, devices, branches, and offline reconciliation where the backend supports them.

#### Scenario: Role navigation is rendered

- **WHEN** a user opens the role shell
- **THEN** visible destinations resolve to implemented routes
- **AND** each destination has loading, empty, unauthorized, error, and accessibility coverage

### Requirement: Session controls are real

Production auth surfaces MUST provide real logout and recovery behavior or remove unavailable affordances.

#### Scenario: User logs out or the session expires

- **WHEN** logout is requested or the backend reports expiry
- **THEN** the server session is invalidated or the expired state is handled
- **AND** sensitive local workflow state is cleared
- **AND** the user is returned to a session-required route
