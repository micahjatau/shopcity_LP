## MODIFIED Requirements

### Requirement: Commit refresh intent atomically

The system SHALL commit the refresh idempotency record, audit record, and outbox event in one database transaction. For a completed Supervisor refresh replay, the system SHALL return the original result without creating another refresh event or repeating immediate materialization.

#### Scenario: Crash-free retry

- **GIVEN** a refresh request succeeds with an idempotency key
- **WHEN** the same request is replayed
- **THEN** the original result is returned and no second refresh event is created
- **AND** an already completed Supervisor refresh replay does not repeat immediate materialization

#### Scenario: Conflicting replay

- **GIVEN** the same key is reused with a different request hash
- **WHEN** the request is received
- **THEN** the existing conflict contract is returned and no new audit/event is created

### Requirement: Preserve report authorization

Refresh and subsequent report reads SHALL retain tenant and branch authorization and SHALL not mutate financial truth.

#### Scenario: Unauthorized branch refresh

- **GIVEN** a Supervisor is authorized for branch A
- **WHEN** the Supervisor requests a refresh for branch B
- **THEN** the request is rejected and no refresh audit, outbox event, idempotency record, or materialization is created for branch B
