## ADDED Requirements

### Requirement: Earn endpoint has explicit rate limiting

The system SHALL apply explicit Redis-backed request throttling to the canonical earn endpoint.

#### Scenario: Earn request exceeds configured financial limit

- **WHEN** an authenticated staff user and session device exceed the configured earn request rate
- **THEN** the earn endpoint returns a `429 RATE_LIMITED` error envelope

### Requirement: Earn throttle key includes staff and session device identity

The earn endpoint throttle key SHALL include tenant, authenticated staff user, and session device identity.

#### Scenario: Different POS devices do not share one throttle bucket

- **WHEN** the same staff user uses two active session devices
- **THEN** each device is evaluated against its own earn throttle key within the tenant scope

### Requirement: OpenAPI documents rate-limit errors

The OpenAPI contract SHALL document `429 RATE_LIMITED` for endpoints that opt into request throttling.

#### Scenario: Earn contract includes 429 response

- **WHEN** the OpenAPI document is generated
- **THEN** the earn endpoint includes a `429` error-envelope response with code `RATE_LIMITED`
