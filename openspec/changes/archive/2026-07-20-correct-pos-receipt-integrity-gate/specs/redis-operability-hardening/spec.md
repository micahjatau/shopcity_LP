## ADDED Requirements

### Requirement: CI and tests must provision Redis without external dependencies
The system MUST run Redis-backed tests against a disposable Redis instance provisioned by the test harness or CI environment and MUST not depend on a manually started host Redis service.

#### Scenario: Clean CI runner can execute Redis tests
- **WHEN** the integration suite runs on a clean CI runner
- **THEN** the suite starts its own Redis instance and completes without requiring a host Redis process

#### Scenario: Host Redis assumptions are absent
- **WHEN** the test suite runs on a machine without Redis installed locally
- **THEN** Redis-backed tests still pass by using the provisioned test instance

### Requirement: Redis-backed safeguards must fail closed and recover automatically
The system MUST return a safe failure response when Redis is unavailable for security-sensitive operations and MUST recover after transient reconnects without requiring an application restart.

#### Scenario: Startup Redis failure fails closed
- **WHEN** the application cannot connect to Redis at startup for a Redis-backed safeguard
- **THEN** the affected request is rejected with a service-unavailable style response instead of bypassing the safeguard

#### Scenario: Transient Redis disconnect recovers
- **WHEN** Redis disconnects temporarily during runtime and then becomes available again
- **THEN** the application reconnects within a bounded retry policy and resumes processing requests without a restart

### Requirement: Redis failures must be observable
The system MUST log Redis connection failures and reconnect attempts with enough context to distinguish initial startup failure from mid-flight disconnection.

#### Scenario: Failure logging distinguishes startup from reconnect
- **WHEN** Redis connection attempts fail during startup or while the application is already running
- **THEN** the logs identify the failure mode clearly enough for operators to diagnose the outage
