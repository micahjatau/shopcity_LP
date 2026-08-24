## ADDED Requirements

### Requirement: Cashier overview starts with card lookup

The cashier overview SHALL present scan/search as the primary next action and retain direct access to dedicated Earn, Redeem, and Sync routes.

#### Scenario: Cashier starts a sale

- **WHEN** an authenticated cashier opens `/cashier`
- **THEN** scan/search is the first primary action
- **AND** the cashier can open the dedicated lookup, Earn, Redeem, and Sync routes

### Requirement: Lookup shows complete cashier verification

The cashier lookup result SHALL show customer name, masked phone, card status, staff/earning eligibility, and available balance.

#### Scenario: Active customer card is found

- **WHEN** the cashier successfully looks up a card
- **THEN** the UI shows all required verification fields from the role-safe backend projection

### Requirement: Earn requires receipt and uses authoritative rounding

Earn submission SHALL be blocked until card context, a non-empty receipt number, and a positive valid purchase amount exist; the advisory credit preview SHALL use ceiling rounding and remain non-authoritative.

#### Scenario: Required Earn input is missing

- **WHEN** receipt number or purchase amount is missing or invalid
- **THEN** submission remains unavailable and the missing field is identified

#### Scenario: Earn preview is calculated

- **WHEN** a valid purchase amount is entered
- **THEN** the preview uses the backend-equivalent ceiling rule
- **AND** the UI states that the backend confirms the final credit

### Requirement: Cashier errors are actionable

The cashier SHALL map known domain error codes and offline/network failures to actionable workflow messages rather than exposing only HTTP status numbers.

#### Scenario: Duplicate receipt is rejected

- **WHEN** the backend returns a duplicate-receipt code
- **THEN** the cashier sees that the receipt was already used and what action to take

#### Scenario: Eligibility or network failure occurs

- **WHEN** the backend reports inactive card, staff ineligibility, approval, insufficient balance, or network failure
- **THEN** the cashier sees a distinct actionable message for that outcome
