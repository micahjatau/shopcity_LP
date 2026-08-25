## ADDED Requirements

### Requirement: Public error examples match runtime envelope

The OpenAPI contract SHALL document runtime-accurate error envelopes and examples for 400, 401, 403, 404, 409, 422, 429, and 503 responses.

#### Scenario: Runtime error envelope changes

- **WHEN** a public endpoint returns an error envelope
- **THEN** OpenAPI examples and generated clients MUST match the runtime shape and status semantics.

### Requirement: Device security errors are documented

The OpenAPI contract SHALL document stable errors for device-revoked sessions and replayed attestations.

#### Scenario: Device session revoked

- **WHEN** a guarded request or refresh fails because the linked device is ineligible
- **THEN** the documented API contract MUST include the stable status and error code returned by runtime.

#### Scenario: Attestation replay detected

- **WHEN** a repeated attestation nonce is rejected
- **THEN** the documented API contract MUST include the stable replay error code returned by runtime.

### Requirement: Receiptless transaction contract is truthful

The OpenAPI contract SHALL document type-specific receiptless transaction responses when receiptless capabilities are enabled or explicitly document their deferral when disabled.

#### Scenario: Receiptless capability deferred

- **WHEN** Adjustment/Reversal receiptless execution is outside halfway scope
- **THEN** OpenAPI MUST NOT claim successful receiptless transaction responses for unavailable operations.

### Requirement: Generated contract artifacts are synchronized

The system SHALL regenerate OpenAPI and API client artifacts, run Spectral, run breaking-change diff, type-check the generated client, and require clean generated-file diffs in CI.

#### Scenario: Generated client is stale

- **WHEN** runtime API behavior changes but generated client artifacts are not updated
- **THEN** CI MUST fail before release.
