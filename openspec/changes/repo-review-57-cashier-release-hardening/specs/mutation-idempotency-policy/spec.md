## ADDED Requirements

### Requirement: Retry-sensitive mutations require idempotency

Financial, approval, reversal, adjustment, card-lifecycle, offline replay, and other explicitly retry-sensitive state-changing requests SHALL require a client-generated idempotency key.

#### Scenario: Retry-sensitive request omits a key

- **WHEN** a client submits a retry-sensitive mutation without an idempotency key
- **THEN** the request is rejected before state mutation

### Requirement: Idempotent replay is deterministic

The server SHALL return the original result for an identical replay and reject reuse of a key with a changed request body or actor scope.

#### Scenario: Identical request is retried

- **WHEN** the same actor retries a mutation with the same key and equivalent body
- **THEN** the server returns the original result without applying a second effect

#### Scenario: Key body is changed

- **WHEN** a key is reused with a different body or unauthorized actor scope
- **THEN** the server rejects the replay and does not mutate state
