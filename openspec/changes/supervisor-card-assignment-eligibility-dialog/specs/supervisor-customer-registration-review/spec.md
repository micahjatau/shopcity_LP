## MODIFIED Requirements

### Requirement: Existing-customer selection loads details directly

Manage customers and Assign card MUST continue to require deliberate search-result selection or an ID deep link followed by authoritative detail loading and identity verification. Once verified, Manage customers MUST show the selected customer profile directly without a generic customer-preview modal; Assign card MUST show eligibility in its dedicated Assignment eligibility dialog, not the generic customer-preview. A mismatch or failed detail request MUST remain fail-closed. Assign card MUST retain its existing eligibility checks and separate new-serial review before the assignment write.

#### Scenario: Manage selection loads profile directly

- **GIVEN** a Supervisor explicitly selects a customer search result
- **WHEN** authoritative details return the same customer ID
- **THEN** the customer details and profile controls are shown directly
- **AND** no customer-preview dialog is opened.

#### Scenario: Assignment selection opens verified eligibility

- **GIVEN** a Supervisor explicitly selects an existing customer for card assignment
- **WHEN** authoritative details return the same customer ID
- **THEN** the dedicated Assignment eligibility dialog shows the verified customer and eligibility state
- **AND** the assignment still requires its existing new-serial review before creating a card
- **AND** no generic customer-preview dialog is opened.

#### Scenario: Mismatched details fail closed

- **WHEN** a detail response does not match the selected/deep-linked customer ID or cannot be loaded
- **THEN** the appropriate truthful detail error is shown
- **AND** neither profile writes nor card assignment is enabled from unverified data.
