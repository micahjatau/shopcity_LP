## ADDED Requirements

### Requirement: Offline sync is a real reconciliation workflow

The frontend SHALL expose a batch sync queue for offline earn records.

#### Scenario: Queue shows pending offline records

- **GIVEN** the browser has pending offline earn records
- **WHEN** the cashier opens sync
- **THEN** the queue lists the local records and their current state

#### Scenario: Batch sync returns authoritative per-record results

- **GIVEN** the cashier submits a sync batch
- **WHEN** the backend returns per-record results
- **THEN** the UI shows confirmed, pending-approval, rejected, and retryable outcomes
- **AND** each rejected or retryable record displays the failure reason

### Requirement: Partial batch outcomes preserve local evidence

The frontend SHALL keep local evidence visible when batch submission does not fully succeed.

#### Scenario: Partial success does not erase unsent items

- **GIVEN** some records in a batch succeed and others fail
- **WHEN** the result is rendered
- **THEN** the successful records are marked accordingly and the unresolved records remain in the queue

#### Scenario: Retryable records can be retried without losing context

- **GIVEN** a record is marked retryable
- **WHEN** the user retries it
- **THEN** the workflow preserves the original local evidence and resubmits only that record or selected batch
