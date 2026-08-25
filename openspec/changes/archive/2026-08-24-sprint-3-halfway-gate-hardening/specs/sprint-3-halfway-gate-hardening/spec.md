## ADDED Requirements

### Requirement: Reversal contract stays unavailable until implementation exists

The system MUST not advertise a successful reversal response in runtime behavior or OpenAPI while reversal execution remains unavailable.

#### Scenario: Reversal contract is generated

- **WHEN** the API contract is regenerated for the reversal route
- **THEN** the published contract documents only an unavailable or error response and no success status

### Requirement: Completed idempotency results replay before mutable checks

The system MUST resolve an existing completed idempotency record before evaluating mutable eligibility conditions on a retried financial request.

#### Scenario: Retry arrives after mutable state changed

- **WHEN** a request matches an existing completed idempotency record
- **THEN** the original successful response is returned without rechecking mutable device, card, or customer state

### Requirement: Redemption serialization conflicts use bounded retry

The system MUST treat approved redemption write conflicts as retryable only within a bounded retry budget and MUST return a stable conflict response when the budget is exhausted.

#### Scenario: Retryable redemption conflict occurs

- **WHEN** redemption persistence hits a recognized transactional conflict
- **THEN** the system retries within the bounded budget before surfacing the stable conflict outcome

### Requirement: Approval expiry runs in a bounded worker

The system MUST expire overdue approvals through a scheduled worker that processes bounded batches with row locking and records audit events for expiry actions.

#### Scenario: Overdue approvals exist

- **WHEN** the worker runs with pending expiries
- **THEN** it processes only a bounded batch, updates the approval and related receipt state consistently, and emits an expiry audit event

### Requirement: Cashier transaction reads are scope-restricted

The system MUST restrict cashier-facing transaction lookups to the correct branch or actor scope and MUST reject tenant-wide access for cashier requests.

#### Scenario: Cashier requests an out-of-scope transaction

- **WHEN** a cashier queries a transaction outside the allowed branch or creator scope
- **THEN** the request is denied and no transaction data is returned

### Requirement: Halfway gate requires deployable evidence

The system MUST keep the halfway gate blocked until migration history, recovery evidence, and current-head CI evidence are recorded for the target commit.

#### Scenario: Evidence is missing

- **WHEN** the migration tracker or release record lacks deploy evidence for the target commit
- **THEN** the halfway gate remains blocked and the review status is not promoted
