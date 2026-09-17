## ADDED Requirements

### Requirement: Production routes use the React application as the single implementation

The production frontend MUST implement prototype visual behavior through the existing Next.js/React route, shell, typed-client, session, scanner, and offline architecture.

#### Scenario: Prototype design is migrated

- **WHEN** a prototype screen is accepted for production
- **THEN** its production destination is an existing React route or an explicitly approved new React route
- **AND** production behavior does not depend on inline scripts or duplicate static HTML
- **AND** existing auth, CSRF, idempotency, RBAC, scanner, and offline infrastructure remains authoritative

#### Scenario: Prototype artifacts are retired

- **WHEN** a migrated route reaches parity
- **THEN** duplicate root-level prototype files and artifact copies are removed or excluded by documented repository policy
- **AND** exactly one production implementation remains

### Requirement: Prototype screens have explicit React parity records

Each migrated prototype screen MUST have a parity record that identifies its React route/component owner, visual intent, interaction sequence, data authorities, role scope, responsive states, accessibility requirements, and verification evidence.

#### Scenario: A screen is proposed for migration

- **WHEN** a prototype screen is selected for production
- **THEN** its target React route and owning component are recorded
- **AND** every displayed value is mapped to a generated client method or approved typed adapter
- **AND** required roles, session/device context, breakpoints, and test evidence are identified before implementation

#### Scenario: A screen passes visual review

- **WHEN** a reviewer compares the prototype and React route
- **THEN** the primary action, information hierarchy, responsive composition, and interaction intent are equivalent
- **AND** visual similarity does not qualify as parity if production behavior, authorization, accessibility, or server-state handling is missing

### Requirement: Migrated workflows preserve production authority boundaries

A migrated React route MUST retain the production application's session, RBAC, CSRF, idempotency, scanner, offline, masking, and generated-client boundaries.

#### Scenario: Prototype data or controls differ from production contracts

- **WHEN** a prototype field, action, or fixture has no production contract
- **THEN** it is removed, marked non-interactive, or implemented through an approved contract change
- **AND** it is never silently simulated in the production route

### Requirement: Migrated workflows expose truthful operational states

The frontend MUST render accessible loading, empty, offline, unauthorized, validation, conflict, server-error, and session-required states for migrated workflows.

#### Scenario: Backend outcome is not successful

- **WHEN** a workflow receives a rejection, pending state, or unexpected error
- **THEN** the UI shows the authoritative outcome and an actionable next step
- **AND** it does not display a fabricated success, balance, status, or health state
