# report-refresh-idempotency Specification

## Purpose

TBD - created by archiving change repo-review-68-reports-cards-sms-correctness. Update Purpose after archive.

## Requirements

### Requirement: Commit refresh intent atomically

The system SHALL commit the refresh idempotency record, audit record, and outbox event in one database transaction.

#### Scenario: Crash-free retry

- **GIVEN** a refresh request succeeds with an idempotency key
- **WHEN** the same request is replayed
- **THEN** the original result is returned and no second refresh event is created

#### Scenario: Conflicting replay

- **GIVEN** the same key is reused with a different request hash
- **WHEN** the request is received
- **THEN** the existing conflict contract is returned and no new audit/event is created

### Requirement: Preserve report authorization

Refresh and subsequent report reads SHALL retain tenant and branch authorization and SHALL not mutate financial truth.

#### Scenario: Unauthorized branch refresh

- **GIVEN** a Supervisor is authorized for branch A
- **WHEN** the Supervisor requests a refresh for branch B
- **THEN** the request is rejected and no refresh audit, outbox event, or idempotency record is created for branch B
