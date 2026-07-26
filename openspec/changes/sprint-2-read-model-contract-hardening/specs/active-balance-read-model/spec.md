## ADDED Requirements

### Requirement: Active balance excludes expired and depleted credit
The system SHALL calculate customer active balance from credit lots with `remainingAmountKobo > 0` and `expiresAt` later than the calculation time.

#### Scenario: Expired credit is ignored
- **WHEN** a customer has one unexpired positive credit lot and one expired positive credit lot
- **THEN** the active balance includes only the unexpired lot amount

#### Scenario: Depleted credit is ignored
- **WHEN** a customer has credit lots with `remainingAmountKobo` equal to zero or below zero
- **THEN** the active balance excludes those lots

### Requirement: Active balance is reconstructed centrally
The system SHALL use a shared backend-owned active-balance read path for customer summaries, card lookup summaries, earn responses that report balance, and future redemption validation.

#### Scenario: Customer and card reads agree
- **WHEN** a customer is read through the customer endpoint and through card lookup
- **THEN** both responses report the same active `availableBalanceKobo`

### Requirement: Active balance uses integer kobo
The system SHALL represent active-balance amounts as integer kobo values in API responses and internal calculations.

#### Scenario: Balance is serialized as JSON number
- **WHEN** an HTTP response includes `availableBalanceKobo`
- **THEN** the value is a JSON number derived from integer kobo and is not a raw `bigint` value
