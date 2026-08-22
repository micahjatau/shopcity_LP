## ADDED Requirements

### Requirement: Session bootstrap must expose a usable device identity for operational shells

The authenticated session/bootstrap contract SHALL include a usable device identity for operational flows that depend on device-attested login and offline reconciliation.

#### Scenario: A cashier session is loaded

- **WHEN** the frontend loads the authenticated cashier session
- **THEN** the bootstrap payload includes the authenticated device identity when one is available
- **AND** the shell can surface that identity instead of substituting a browser-local placeholder

### Requirement: Missing device identity must block device-dependent workflows

The frontend SHALL not present device-dependent workflows as ready when the authenticated session cannot provide a usable device identity.

#### Scenario: Offline Earn opens without a device identity

- **WHEN** the cashier session lacks a usable device identity
- **THEN** Offline Earn indicates that device-attested login or re-authentication is required
- **AND** the queue record is not constructed from undefined device data
