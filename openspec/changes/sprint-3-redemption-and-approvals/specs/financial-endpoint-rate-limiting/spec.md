## ADDED Requirements

### Requirement: Redemption endpoint has explicit rate limiting

The system SHALL apply explicit Redis-backed request throttling to the canonical redemption endpoint.

#### Scenario: Redemption request exceeds configured financial limit

- **WHEN** an authenticated staff user and session device exceed the configured redemption request rate
- **THEN** the redemption endpoint returns a `429 RATE_LIMITED` error envelope

### Requirement: Redemption throttle key includes staff and session device identity

The redemption endpoint throttle key SHALL include tenant, authenticated staff user, and session device identity.

#### Scenario: Different POS devices do not share redemption bucket

- **WHEN** the same staff user uses two active session devices
- **THEN** each device is evaluated against its own redemption throttle key within the tenant scope

### Requirement: Sprint 3 financial contracts document rate-limit errors

The OpenAPI contract SHALL document `429 RATE_LIMITED` for redemption, reversal, and adjustment endpoints that opt into request throttling.

#### Scenario: Redemption contract includes 429 response

- **WHEN** the OpenAPI document is generated
- **THEN** the redemption endpoint includes a `429` error-envelope response with code `RATE_LIMITED`
