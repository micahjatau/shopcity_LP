## Purpose

Close the authentication, SYSTEM-routing, and device/session trust gaps identified in repo review 53.

## ADDED Requirements

### Requirement: SYSTEM sessions must not enter human navigation or shell flows

The frontend SHALL treat SYSTEM as a non-human actor and SHALL prevent SYSTEM-authenticated sessions from reaching cashier, supervisor, or admin navigation surfaces intended for interactive operators.

#### Scenario: SYSTEM session bootstraps successfully

- **WHEN** session bootstrap resolves a role of `SYSTEM`
- **THEN** the shell does not expose human route links or operator controls
- **AND** the session is redirected away from interactive human workflows

### Requirement: Live admin tests must require explicit secure credentials

The validation and live E2E coverage SHALL fail closed unless explicit admin credentials are provided, and SHALL NOT rely on a committed password fallback.

#### Scenario: Live E2E runs without an admin password

- **WHEN** the live E2E environment is enabled
- **AND** no explicit admin password is configured
- **THEN** the run fails before attempting privileged authentication

### Requirement: Session bootstrap must expose the authenticated device identity

The session/bootstrap contract SHALL include the authenticated device identity so the frontend can reuse the same device context for offline capture and sync.

#### Scenario: An authenticated session is loaded

- **WHEN** the frontend loads the authenticated session
- **THEN** the bootstrap payload includes a usable `deviceId`
- **AND** the frontend can pass that device identity into offline workflows without fabricating a browser-local fallback

### Requirement: Auth throttling must match the production baseline

The authentication service SHALL enforce the production throttle baseline rather than a weaker review-time limit.

#### Scenario: Repeated login attempts exceed the baseline

- **WHEN** a client performs more than the allowed number of login attempts within the configured interval
- **THEN** the authentication flow is throttled
- **AND** the runtime policy matches the production baseline used by the backend service
