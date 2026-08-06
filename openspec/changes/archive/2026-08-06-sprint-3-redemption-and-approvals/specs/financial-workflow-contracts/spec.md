## ADDED Requirements

### Requirement: Financial workflow supports debit transaction types

The system MUST expose stable transaction IDs and machine-readable responses for confirmed earn, redeem, reversal, and adjustment ledger entries.

#### Scenario: Redemption response is returned

- **WHEN** a redemption completes successfully
- **THEN** the response contains a transactionId backed by the debit ledger entry and does not overload receiptId

#### Scenario: Adjustment response is returned

- **WHEN** an adjustment completes successfully
- **THEN** the response contains a transactionId backed by the adjustment ledger entry

### Requirement: Financial workflow returns Sprint 3 stable errors

The system MUST return stable machine-readable error codes for redemption, approval execution, reversal, and adjustment rejections.

#### Scenario: Redemption transaction conflict occurs

- **WHEN** recognized database conflicts exhaust bounded retry during redemption
- **THEN** the API returns `503 REDEMPTION_TRANSACTION_CONFLICT`

#### Scenario: Unsafe reversal is requested

- **WHEN** automatic reversal cannot prove safe compensation
- **THEN** the API returns `REVERSAL_REVIEW_REQUIRED`

### Requirement: Transaction lookup is discriminated by ledger type

The system MUST return JSON-safe transaction details using a discriminated shape for earn, redeem, reversal, and adjustment transaction IDs.

#### Scenario: Redemption transaction is looked up

- **WHEN** a client requests a confirmed redemption transaction ID
- **THEN** the response includes redemption details, allocation summary, approval summary when applicable, SMS status, and JSON-safe integer kobo values
