# session-gated-shells Specification

## ADDED Requirements

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
