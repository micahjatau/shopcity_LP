## ADDED Requirements

### Requirement: Device-bound sessions are revoked with device eligibility
The system SHALL refuse session refresh and guarded auth-context resolution when the linked device is no longer active or no longer belongs to an eligible branch and tenant scope.

#### Scenario: A device is blocked after login
- **WHEN** a session is refreshed after its device is deactivated
- **THEN** the refresh fails and the session is not rotated

### Requirement: Device attestations are replay resistant
The system SHALL reject a previously accepted device attestation nonce for the same device within the attestation validity window.

#### Scenario: The same attestation is presented twice
- **WHEN** the login flow receives the same device attestation more than once
- **THEN** the second attempt fails

### Requirement: Scoped loyalty reads include receiptless ledger entries
The system SHALL expose authorized receiptless adjustment and reversal ledger entries through the scoped customer ledger and transaction read paths when the actor is entitled to that customer scope.

#### Scenario: A branch user reads a customer ledger
- **WHEN** the ledger contains a receiptless adjustment for that customer
- **THEN** the entry appears in the scoped read model if the actor is authorized

### Requirement: Migration evidence remains complete and unique
The system SHALL keep migration evidence synchronized with the applied forward-only migration history and SHALL not duplicate or omit applied migrations in the tracker.

#### Scenario: A new migration is applied
- **WHEN** a migration is introduced or replaced by a follow-up forward migration
- **THEN** the tracker records the correct migration exactly once

### Requirement: Public contract examples match runtime errors
The system SHALL keep OpenAPI error examples and repository contract checks aligned with the runtime error envelope and tracked nested docs and artifacts.

#### Scenario: Error responses are documented
- **WHEN** the OpenAPI document is generated
- **THEN** documented 401, 403, 404, 409, 422, and 429 examples use the runtime status code and error code shape

#### Scenario: Nested docs are formatted
- **WHEN** repo formatting checks run
- **THEN** tracked nested docs and contract artifacts are included in the check scope

### Requirement: SMS templates validate payloads consistently
The system SHALL validate SMS payloads for every rendered template and SHALL reject malformed payloads before rendering or dispatch.

#### Scenario: An earn-confirmed payload is missing credit data
- **WHEN** the worker attempts to render an earn-confirmed SMS without the required credit amount
- **THEN** the payload is rejected as invalid

#### Scenario: A redemption-confirmed payload is incomplete
- **WHEN** the worker attempts to render a redemption-confirmed SMS with missing required fields
- **THEN** rendering fails with an invalid payload error
