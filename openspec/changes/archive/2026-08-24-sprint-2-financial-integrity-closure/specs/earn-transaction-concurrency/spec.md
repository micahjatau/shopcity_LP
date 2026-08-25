## ADDED Requirements

### Requirement: Bounded serialization retry

The system SHALL retry known PostgreSQL serialization failures during earn transaction capture before returning an error.

#### Scenario: Serialization retry succeeds

- **WHEN** an earn transaction fails with a known serialization conflict and a retry succeeds within the retry budget
- **THEN** the API MUST return the successful earn response and MUST NOT expose the transient conflict to the caller

#### Scenario: Serialization retry exhausted

- **WHEN** known serialization conflicts continue until the retry budget is exhausted
- **THEN** the API MUST return a temporary concurrency error and MUST NOT return a duplicate receipt error

#### Scenario: Retry uses jitter

- **WHEN** the system retries a serialization conflict
- **THEN** it MUST wait a small jittered delay before retrying to reduce immediate collision

### Requirement: Duplicate receipt error accuracy

The system SHALL return duplicate receipt errors only for actual receipt uniqueness violations.

#### Scenario: Receipt uniqueness violation

- **WHEN** a write violates the database uniqueness constraint for tenant-scoped physical receipt identity/week
- **THEN** the API MUST return the stable `RECEIPT_ALREADY_USED` domain code

#### Scenario: Serialization conflict is not duplicate

- **WHEN** PostgreSQL reports a serialization conflict without a receipt uniqueness violation
- **THEN** the API MUST NOT return `RECEIPT_ALREADY_USED` or `RECEIPT_ALREADY_CAPTURED`

### Requirement: Concurrency regression coverage

The system SHALL include tests for duplicate receipt handling and serialization retry behavior.

#### Scenario: Same receipt different keys

- **WHEN** two requests attempt to capture the same receipt with different idempotency keys
- **THEN** exactly one financial effect MUST be committed and the loser MUST receive the duplicate receipt code only when the uniqueness constraint is the cause

#### Scenario: Simulated serialization conflict

- **WHEN** the earn transaction path receives a simulated known serialization conflict
- **THEN** the retry wrapper MUST retry within budget and map exhausted retries to the temporary concurrency error
