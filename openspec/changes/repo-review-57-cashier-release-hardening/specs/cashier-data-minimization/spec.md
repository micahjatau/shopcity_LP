## MODIFIED Requirements

### Requirement: Cashier customer reads expose minimal sales data

The system SHALL return cashier-facing customer data using a role-specific DTO limited to customer identity needed for verification, `maskedPhone`, card status, staff/earning eligibility, eligibility reason, and available balance; it SHALL omit full contact data.

#### Scenario: Cashier lists customers

- **WHEN** a cashier lists or searches customers
- **THEN** each response item omits full phone number, email, registration attribution, block timestamps, and internal identifiers not required for the sale workflow
- **AND** it includes the staff/earning eligibility state needed to explain whether Earn is allowed

### Requirement: Cashier card lookup avoids nested customer PII

The system SHALL prevent cashier card lookup responses from spreading nested customer objects or exposing full customer PII.

#### Scenario: Cashier looks up a card

- **WHEN** a cashier looks up a card by barcode
- **THEN** the response includes the minimal customer summary, masked phone, eligibility state, and card workflow state without full phone or email

### Requirement: Privileged PII reads are audited

The system SHALL limit full customer phone and email reads to supervisor or admin roles and SHALL audit sensitive reads.

#### Scenario: Supervisor reads full customer contact details

- **WHEN** a supervisor or admin retrieves full customer contact details
- **THEN** the system records an audit event for the sensitive read
