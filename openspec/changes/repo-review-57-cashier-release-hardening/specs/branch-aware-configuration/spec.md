## ADDED Requirements

### Requirement: Authenticated configuration uses session branch authority

Operational configuration for an authenticated request SHALL resolve tenant and branch from the validated session context rather than default public tenant or branch environment values.

#### Scenario: Cashier requests configuration

- **WHEN** an authenticated cashier requests operational configuration
- **THEN** the response is scoped to the session tenant and branch

### Requirement: Public configuration is bounded-cacheable

Public branch configuration SHALL support bounded fresh and stale caching, while never serving as an authorization source for authenticated operations.

#### Scenario: Public configuration is cached

- **WHEN** repeated public configuration requests occur within the configured cache window
- **THEN** the service may serve the bounded cached projection
- **AND** authenticated authorization still uses session scope
