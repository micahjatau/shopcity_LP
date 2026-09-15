## ADDED Requirements

### Requirement: Duplicate receipt handling is safe with a single database connection

The earn workflow MUST NOT start a nested Prisma transaction when handling a duplicate receipt, including when the database connection limit is one.

#### Scenario: Duplicate receipt is detected

- **GIVEN** an existing receipt conflicts with the earn request
- **WHEN** the earn workflow handles the conflict
- **THEN** the financial transaction is rolled back or exits without financial mutation
- **AND** the endpoint returns `409 RECEIPT_ALREADY_USED`
- **AND** it does not return a transaction-start timeout or `500 SYSTEM_ERROR`

#### Scenario: Duplicate evidence is persisted

- **GIVEN** a duplicate receipt was rejected
- **WHEN** duplicate-attempt handling completes
- **THEN** the audit event and `fraud.evaluate` outbox event are durably persisted atomically
- **AND** the evidence includes the tenant, receipt, branch, actor, customer, device, and occurrence metadata
- **AND** no ledger, balance, lot, or confirmed receipt mutation is created
