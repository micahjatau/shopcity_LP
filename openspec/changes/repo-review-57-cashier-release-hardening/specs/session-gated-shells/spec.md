## MODIFIED Requirements

### Requirement: Operational routes require authenticated session context

The system MUST prevent cashier, supervisor and admin workflow screens from rendering without authenticated session context.

#### Scenario: Unauthenticated user reaches a protected route

- **WHEN** an unauthenticated user opens an operational route
- **THEN** the shell shows a session-required state or redirects to sign-in instead of exposing the workflow UI

#### Scenario: Session state becomes ready

- **WHEN** the backend session check succeeds
- **THEN** the shell renders the authenticated layout and role-specific navigation

### Requirement: Role boundaries are explicit in the application shell

The system MUST present cashier, supervisor and admin shells with distinct route availability and information density.

#### Scenario: Cashier shell renders

- **WHEN** a cashier session is active
- **THEN** the cashier navigation only exposes cashier-appropriate entry points

#### Scenario: Supervisor and admin shells diverge

- **WHEN** supervisor and admin sessions are compared
- **THEN** the supervisor shell excludes admin-only operational surfaces while the admin shell includes them

### Requirement: Session bootstrap must expose a usable device identity for operational shells

The authenticated session/bootstrap contract SHALL include a usable provisioned device identity for operational flows that depend on device-attested login and offline reconciliation.

#### Scenario: A cashier session is loaded

- **WHEN** the frontend loads the authenticated cashier session
- **THEN** the bootstrap payload includes the authenticated active device identity when one is available
- **AND** the shell can surface that identity instead of substituting a browser-local placeholder

### Requirement: Missing device identity must block device-dependent workflows

The frontend SHALL not present device-dependent workflows as ready when the authenticated session cannot provide a usable device identity.

#### Scenario: Offline Earn opens without a device identity

- **WHEN** the cashier session lacks a usable device identity
- **THEN** Offline Earn indicates that device-attested enrollment or re-authentication is required
- **AND** the queue record is not constructed from undefined device data

### Requirement: Idle sessions cannot access protected workflows

The backend SHALL enforce role-aware inactivity expiry during session resolution, and the frontend SHALL transition to a session-required state when an idle session is rejected.

#### Scenario: Idle session reaches a protected route

- **WHEN** the session has exceeded its server-configured role inactivity window
- **THEN** the backend rejects access and the frontend does not render protected workflow data
