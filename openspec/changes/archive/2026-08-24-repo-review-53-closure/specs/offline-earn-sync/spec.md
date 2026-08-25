## Purpose

Close the offline earn and sync correctness gaps identified in repo review 53.

## ADDED Requirements

### Requirement: Offline earn must only report success after local persistence succeeds

The offline earn flow SHALL treat local persistence failure as a failed capture, not a queued success.

#### Scenario: IndexedDB or local save fails

- **WHEN** the client attempts to create an offline earn record
- **AND** local persistence fails
- **THEN** the user sees a failure state
- **AND** no queued success is reported

### Requirement: Offline earn records must carry truthful queue identity and policy context

An offline earn record SHALL include the authenticated cashier, branch, device, receipt-week, and idempotency context required for later reconciliation.

#### Scenario: A cashier creates an offline earn

- **WHEN** the client captures an offline earn record
- **THEN** the stored record includes the cashier identity, branch identity, device identity, receipt-week start context, and idempotency key needed for backend sync

### Requirement: Queue states must align with batch submission eligibility

The offline queue SHALL treat every local state that can be created by the UI as either synchronizable, retryable, or terminal according to the batch API contract.

#### Scenario: A locally saved record is waiting or retryable

- **WHEN** a local earn record is marked as waiting, saved, or retryable
- **THEN** the queue presents it as eligible for the appropriate sync action
- **AND** it is not stranded in a non-actionable state

### Requirement: Batch reconciliation must preserve identity and rejection reasons

The sync batch response SHALL preserve local record identity and SHALL surface rejection reasons truthfully for partial success or failure.

#### Scenario: A batch contains mixed outcomes

- **WHEN** some records are accepted and others are rejected or retryable
- **THEN** each local record retains its original identity
- **AND** the UI shows the server-provided rejection reason or retry outcome for each failed record
