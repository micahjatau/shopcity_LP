## ADDED Requirements

### Requirement: Consistent receipt week start convention
The system SHALL use the same weekday numbering convention for receipt-week configuration validation and receipt-week derivation.

#### Scenario: Zero-based week start is accepted end-to-end
- **WHEN** a branch or environment config sets the receipt-week start day to `0`
- **THEN** receipt capture SHALL accept the configuration and derive the same week boundary without a runtime validation failure

#### Scenario: Invalid weekday values are rejected consistently
- **WHEN** a receipt-week start day falls outside the supported weekday range
- **THEN** configuration validation SHALL reject it before receipt capture can use it

### Requirement: Hard purchase ceiling
The system SHALL reject `purchaseAmountKobo` values above a hard maximum before status routing or persistence occurs.

#### Scenario: Amount exceeds the ceiling
- **WHEN** a capture request submits a purchase amount above the configured hard maximum
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Amount stays within the ceiling
- **WHEN** a capture request submits a purchase amount within the hard maximum
- **THEN** the system SHALL continue with normal capture classification and persistence

### Requirement: Migration tracker stays current
The repository SHALL record each applied schema migration in `docs/database/migration-tracker.md`.

#### Scenario: A schema migration is applied
- **WHEN** a migration is added for a schema change
- **THEN** the migration tracker SHALL include the migration path, backup/restore status, and release note for that change

#### Scenario: A migration is reviewed later
- **WHEN** the tracker is inspected after a release
- **THEN** the most recent schema migration SHALL be discoverable in the tracker without searching commit history

### Requirement: Device attestation for session binding
The system SHALL require a cryptographic device attestation before binding a session to a device.

#### Scenario: Device proof is valid
- **WHEN** a login request presents a valid device attestation for an active device
- **THEN** the system SHALL issue a session bound to that device

#### Scenario: Device proof is missing or invalid
- **WHEN** a login request presents no attestation or an invalid attestation
- **THEN** the system SHALL reject the login request
