## ADDED Requirements

### Requirement: Sensitive public endpoints must be rate-limited

The system MUST apply request throttling to login, public configuration, and card lookup endpoints.

#### Scenario: Login requests are throttled

- **WHEN** a client exceeds the configured login attempt limit
- **THEN** the system rejects the request with a throttling response

#### Scenario: Card lookup requests are throttled

- **WHEN** a client exceeds the configured card lookup limit
- **THEN** the system rejects the request with a throttling response

### Requirement: Public config must only serve active tenant and branch data

The system MUST reject public configuration requests when the configured tenant is suspended or the configured branch is inactive.

#### Scenario: Suspended tenant is rejected

- **WHEN** the configured tenant is suspended
- **THEN** the system rejects the public configuration request

#### Scenario: Inactive branch is rejected

- **WHEN** the configured branch is inactive
- **THEN** the system rejects the public configuration request
