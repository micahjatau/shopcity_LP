## ADDED Requirements

### Requirement: Session resolution enforces role-aware inactivity

The backend SHALL reject or revoke a session when `lastUsedAt` exceeds the configured inactivity window for its role, independently of absolute session expiry.

#### Scenario: Idle cashier session is used

- **WHEN** a cashier session has been inactive longer than the configured cashier window
- **THEN** session resolution rejects the request and the session cannot access protected workflows

#### Scenario: Active session remains valid

- **WHEN** a session is used within its role inactivity window and absolute lifetime
- **THEN** session resolution succeeds and updates activity according to the existing policy

### Requirement: Inactivity policy is observable and configurable

The inactivity windows SHALL be configured server-side by role and SHALL produce an explicit session-expired outcome for clients.

#### Scenario: Client receives idle expiry

- **WHEN** a protected request is rejected for inactivity
- **THEN** the response identifies session expiration without exposing sensitive session details
