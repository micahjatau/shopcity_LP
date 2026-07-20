## ADDED Requirements

### Requirement: Sensitive routes must use Redis-backed throttling
The system MUST enforce request throttling with Redis-backed counters for login, public configuration, and card lookup routes.

#### Scenario: Login requests are limited by Redis
- **WHEN** a client exceeds the configured login limit within the throttle window
- **THEN** the system rejects the request with HTTP 429 using Redis-backed state

#### Scenario: Card lookup requests are limited by Redis
- **WHEN** a client exceeds the configured card lookup limit within the throttle window
- **THEN** the system rejects the request with HTTP 429 using Redis-backed state

### Requirement: Throttle keys must not depend on the looked-up serial number
The system MUST derive throttle keys for login and card lookup from stable client and tenant context, not from the submitted card serial or barcode value.

#### Scenario: Card lookup throttling ignores serial variation
- **WHEN** a caller changes the requested serial number repeatedly from the same client context
- **THEN** the lookup bucket remains constrained by the stable client key

#### Scenario: Login throttling normalizes account identifiers
- **WHEN** a caller submits the same login identity with different casing or surrounding whitespace
- **THEN** the system treats the attempts as the same account bucket
