## MODIFIED Requirements

### Requirement: Cashier customer reads expose minimal sales data

The system SHALL return cashier-facing customer data using a role-specific DTO limited to `customerId`, `fullName`, `maskedPhone`, card status, and available balance. Cashier task surfaces SHALL present only the subset needed for the current task and SHALL defer non-task detail behind an explicit disclosure.

#### Scenario: Cashier lists customers

- **WHEN** a cashier lists or searches customers
- **THEN** each response item omits full phone number, email, staff flag, registration attribution, block timestamps, and internal identifiers not required for the sale workflow
- **AND** the UI presents a compact result row with one clear selection action

#### Scenario: Cashier opens a selected customer

- **WHEN** a cashier selects a customer for Lookup, Earn, or Redeem
- **THEN** the screen shows only the identity, card state, balance, and actions relevant to that workflow
- **AND** non-task details require an intentional disclosure or privileged route

### Requirement: Cashier card lookup avoids nested customer PII

The system SHALL prevent cashier card lookup responses from spreading nested customer objects or exposing full customer PII.

#### Scenario: Cashier looks up a card

- **WHEN** a cashier looks up a card by barcode
- **THEN** the response includes the minimal customer summary and card workflow state without full phone or email
- **AND** the Lookup, Earn, and Redeem surfaces do not render diagnostic identifiers as normal task content

### Requirement: Privileged PII reads are audited

The system SHALL limit full customer phone and email reads to supervisor or admin roles and SHALL audit sensitive reads.

#### Scenario: Supervisor reads full customer contact details

- **WHEN** a supervisor or admin retrieves full customer contact details
- **THEN** the system records an audit event for the sensitive read
- **AND** the cashier workflow remains on the minimal sales-data contract
