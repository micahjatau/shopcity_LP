## ADDED Requirements

### Requirement: Approval-path financial flows emit fraud evaluation work

The system SHALL enqueue fraud evaluation for earn and redemption transactions that enter pending approval before returning the pending response.

#### Scenario: High-value earn requires approval

- **WHEN** an earn transaction crosses the approval threshold
- **THEN** the system records the receipt, records the approval, enqueues fraud evaluation work, and returns the pending-approval response

#### Scenario: High-value redemption requires approval

- **WHEN** a redemption transaction crosses the approval threshold
- **THEN** the system records the redemption request, enqueues fraud evaluation work, and returns the pending-approval response

### Requirement: Fraud evaluation processing is terminal after success

The system SHALL treat a successfully processed fraud evaluation event as terminal so recovery and retry flows do not reprocess the same event and double-count occurrence history.

#### Scenario: Successful fraud evaluation is completed once

- **WHEN** the worker finishes fraud evaluation successfully
- **THEN** the event is marked terminal and is no longer eligible for replay as an unpublished event

### Requirement: Duplicate receipt attempts persist evidence

The system SHALL persist duplicate-receipt evidence in a committed path that survives a rejected capture attempt while still returning the documented duplicate conflict response.

#### Scenario: Duplicate receipt is rejected after evidence is recorded

- **WHEN** a receipt is submitted that already exists for the same tenant, branch, week, and normalized receipt number
- **THEN** the system records duplicate-attempt evidence and returns the duplicate conflict response without losing the evidence

### Requirement: Behavioral fraud evaluation uses one shared runtime

The system SHALL evaluate behavioral fraud rules through one shared runtime path so production processing and regression coverage exercise the same rule construction and source-row queries.

#### Scenario: Worker and regression cover the same fraud runtime

- **WHEN** behavioral fraud is evaluated from a production outbox event or from the integration coverage path
- **THEN** the same runtime rules and source-row derivation are used

### Requirement: Behavioral fraud windows use the actual branch-day boundary

The system SHALL deduplicate and scope behavioral fraud findings using the actual branch-local day window rather than a receipt-specific timestamp key.

#### Scenario: Multiple triggering receipts on the same branch day

- **WHEN** multiple receipts trigger the same branch-day behavioral anomaly
- **THEN** the system keeps one logical finding for that branch-day window instead of fragmenting it by receipt timestamp
