## ADDED Requirements

### Requirement: POS devices are administratively provisioned

The system SHALL allow an authorized administrator to enroll, branch-bind, activate, revoke, and inspect POS device identity without requiring a cashier to enter a raw attestation secret during every login.

#### Scenario: Administrator enrolls a POS

- **WHEN** an authorized administrator provisions a device for a branch
- **THEN** the device is created with an auditable branch binding and activation state

### Requirement: Device-attested sessions remain fail-closed

Cashier sessions SHALL bind to an active provisioned device and SHALL reject missing, revoked, cross-branch, or invalid attestation.

#### Scenario: Cashier uses an unprovisioned device

- **WHEN** login has no valid active device binding
- **THEN** the session is not established for operational workflows

### Requirement: Raw attestation secrets are not browser-persisted

The frontend SHALL not persist raw device attestation secrets in local storage, IndexedDB, URL parameters, or ordinary application state beyond the minimum request boundary.

#### Scenario: Login state is persisted

- **WHEN** the browser persists login or offline state
- **THEN** no raw attestation secret is present in the persisted data
