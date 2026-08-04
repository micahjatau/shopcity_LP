## ADDED Requirements

### Requirement: Redis-backed controls must fail closed

The system MUST fail closed when Redis-backed controls are unavailable for security-sensitive flows.

#### Scenario: Redis startup failure blocks the sensitive flow

- **WHEN** Redis cannot be reached during a sensitive request
- **THEN** the system rejects the request with a service-unavailable outcome instead of bypassing the control

#### Scenario: Redis disconnect remains fail-closed

- **WHEN** Redis disconnects during an active sensitive flow
- **THEN** the system preserves fail-closed behavior rather than silently disabling the control

### Requirement: Redis connectivity must recover without a process restart

The system MUST use bounded reconnect behavior and MUST recover from transient Redis disconnects without requiring the application to restart.

#### Scenario: Transient Redis disconnect is recovered

- **WHEN** Redis becomes unavailable briefly and then returns
- **THEN** the application reconnects and resumes Redis-backed operations

#### Scenario: Closed Redis client is reset on recovery

- **WHEN** the Redis connection closes unexpectedly
- **THEN** the application resets its cached Redis client and establishes a new connection on the next use

### Requirement: Redis test coverage must be self-contained

The system MUST use disposable Redis provisioning in integration tests or CI rather than depending on ambient host services.

#### Scenario: CI runs without host Redis

- **WHEN** the integration test suite runs in a clean CI environment
- **THEN** the Redis-backed tests still run using provisioned disposable infrastructure

#### Scenario: Host Redis absence does not invalidate the test suite

- **WHEN** no Redis service is installed on the runner
- **THEN** the test harness still completes using the configured disposable Redis setup
