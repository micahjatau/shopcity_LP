# financial-workflow-contracts Specification

## Purpose

TBD - created by archiving change sprint-2-exit-gate-hardening. Update Purpose after archive.

## Requirements

### Requirement: Legacy receipt review cannot bypass financial execution

The system MUST not finalize a receipt approval or rejection by updating only receipt review state when a financial approval record is absent.

#### Scenario: Legacy approval request arrives

- **WHEN** an approval decision is requested for a receipt without a modern approval record
- **THEN** the system routes through the financial workflow or returns a documented error without creating a review-only success response

### Requirement: Transaction responses expose explicit transaction IDs

The system MUST expose a transactionId for confirmed earn results and lookup routes, distinct from receiptId.

#### Scenario: Confirmed earn response is returned

- **WHEN** an earn completes successfully
- **THEN** the response contains a transactionId that is not overloaded with receiptId

### Requirement: Financial workflow returns stable error codes

The system MUST return stable machine-readable error codes for financial workflow rejections.

#### Scenario: Inactive card is rejected

- **WHEN** a card is inactive
- **THEN** the response includes a stable code identifying the inactive-card rejection

#### Scenario: Idempotency conflict is rejected

- **WHEN** a request reuses an idempotency key for a conflicting payload
- **THEN** the response includes a stable code identifying the idempotency conflict

### Requirement: Approval execution rechecks current policy

The system MUST re-evaluate the current purchase ceiling, approval threshold, earn-rate policy, and approval expiry immediately before approval execution.

#### Scenario: Policy changed after approval request

- **WHEN** policy changes before approval execution
- **THEN** the approval executes using the updated policy or fails with a policy-conflict code

### Requirement: Leap-day expiry is deterministic

The system MUST define a stable expiry outcome for approvals and credits originating on February 29.

#### Scenario: Leap-day grant expires

- **WHEN** an expiry interval is applied to a February 29 timestamp
- **THEN** the computed expiry follows the documented calendar rule and is regression-testable

### Requirement: Same-idempotency-key concurrency is consistent

The system MUST return the original successful earn response for concurrent requests that reuse the same idempotency key.

#### Scenario: Two requests share the same idempotency key

- **WHEN** two earn requests arrive simultaneously with the same idempotency key
- **THEN** both responses match the original successful result and no receipt conflict is returned
