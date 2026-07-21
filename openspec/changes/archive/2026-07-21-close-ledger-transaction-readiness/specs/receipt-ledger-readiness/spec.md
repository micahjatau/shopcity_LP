## ADDED Requirements

### Requirement: Authoritative receipt capture transaction
Receipt capture SHALL derive the branch, receipt-week start, and duplicate-detection scope from records read inside the same database transaction that creates the receipt.

#### Scenario: Device changes after initial lookup
- **WHEN** a device is reassigned to a different branch after the request begins
- **THEN** the persisted receipt SHALL use the branch and receipt-week values from the transaction snapshot, not the earlier lookup

#### Scenario: Duplicate receipt in the same scope
- **WHEN** a second request submits the same normalized physical receipt identity for the same branch and receipt week
- **THEN** the system SHALL reject the duplicate and SHALL persist only one receipt row

### Requirement: Receipt approval workflow
The system SHALL support approving and rejecting receipts that require review, and it SHALL record the approving actor and decision timestamp.

#### Scenario: Eligible receipt approval
- **WHEN** an authorized approver approves a receipt that is pending review
- **THEN** the receipt SHALL transition to an approved state and the approval metadata SHALL be stored

#### Scenario: Self-approval is rejected
- **WHEN** the cashier who captured the receipt attempts to approve it
- **THEN** the system SHALL reject the action

### Requirement: Idempotency expiration
The system SHALL treat expired idempotency records as absent when processing a new request and SHALL not replay expired responses.

#### Scenario: Expired completed record
- **WHEN** a request reuses an idempotency key whose stored record has expired
- **THEN** the system SHALL ignore the stale record and process the request as new

#### Scenario: Unexpired record replay
- **WHEN** a request reuses an idempotency key whose stored record is still valid
- **THEN** the system SHALL return the stored result instead of creating a second receipt
