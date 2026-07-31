## ADDED Requirements

### Requirement: Redemption replay is authoritative before mutable checks
The system MUST resolve a completed idempotency response for a redemption request before evaluating mutable eligibility checks such as card state, branch availability, or customer status.

#### Scenario: Completed redemption is retried
- **WHEN** a request arrives with the same normalized idempotency key and payload as a previously completed redemption
- **THEN** the system MUST return the completed redemption result before evaluating current eligibility data

### Requirement: Redemption serialization conflicts use bounded retries
The system MUST retry redemption serialization conflicts with a bounded backoff policy before returning a failure to the client.

#### Scenario: Serializable conflict occurs
- **WHEN** a redemption transaction fails because of a serialization conflict
- **THEN** the system MUST retry the transaction up to a bounded number of times with jittered backoff

#### Scenario: Retry budget is exhausted
- **WHEN** the bounded retry budget is exhausted after repeated serialization conflicts
- **THEN** the system MUST return a stable retryable failure code instead of reclassifying the request as a business rejection

### Requirement: Conflict-time receipt lookup remains branch-safe
The system MUST preserve the original tenant, branch, receipt week, and normalized receipt number when resolving a duplicate receipt after a serialization conflict.

#### Scenario: Same receipt number exists in another branch
- **WHEN** a retry path evaluates a receipt number that exists in a different branch or week
- **THEN** the system MUST not report a duplicate receipt for the wrong branch or receipt week

### Requirement: Unsupported ledger type and direction pairs are rejected
The system MUST reject any ledger type and direction combination that is not explicitly supported by the financial model.

#### Scenario: Invalid ledger pair is submitted
- **WHEN** a ledger entry uses an unsupported type and direction pair such as `EARN/DEBIT`, `REDEEM/CREDIT`, or `REVERSAL/DEBIT`
- **THEN** the system MUST reject the write before commit
