## ADDED Requirements

### Requirement: Receipt records must capture idempotent loyalty input

The system MUST define a receipt as the pre-ledger loyalty input record and MUST support idempotent capture of repeated client submissions.

#### Scenario: Receipt capture can omit an external POS reference

- **WHEN** a receipt is captured without a POS receipt number
- **THEN** the receipt record still succeeds if the required idempotency and purchase fields are present

#### Scenario: External POS reference remains informational

- **WHEN** a receipt includes an external POS receipt number
- **THEN** the system stores it for reference only and does not use it as an idempotency key or uniqueness constraint

#### Scenario: Duplicate client submission is deduplicated

- **WHEN** the same tenant submits the same client operation and idempotency key again
- **THEN** the system does not create a second receipt record

### Requirement: Receipt records must carry operational context

The system MUST store the fields needed to trace a purchase capture event before the ledger exists.

#### Scenario: Receipt capture stores operational context

- **WHEN** a receipt is created
- **THEN** the stored record includes tenant, branch, customer, card, device, actor or captured-by context, purchase amount, and capture timestamp
