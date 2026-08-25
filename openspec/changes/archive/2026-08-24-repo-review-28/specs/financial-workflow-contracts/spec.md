## MODIFIED Requirements

### Requirement: Same-idempotency-key concurrency is consistent

The system MUST return the original successful earn response for concurrent requests that reuse the same idempotency key, and it MUST resolve any stored completed response before time-sensitive validation for earn or redemption requests.

#### Scenario: Two requests share the same idempotency key

- **WHEN** two earn requests arrive simultaneously with the same idempotency key
- **THEN** both responses match the original successful result and no receipt conflict is returned

#### Scenario: Delayed retry reuses a completed key

- **WHEN** a completed earn or redemption request is retried after mutable eligibility windows have changed
- **THEN** the stored completed response is replayed before timestamp or policy validation rejects the request
