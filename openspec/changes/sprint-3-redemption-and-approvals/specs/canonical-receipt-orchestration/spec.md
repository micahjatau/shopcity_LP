## ADDED Requirements

### Requirement: Redemption receipt evidence is canonical
The system SHALL create redemption receipt evidence through the canonical receipt identity path and SHALL enforce tenant, branch, receipt week, and normalized receipt number uniqueness.

#### Scenario: Redemption receipt is duplicated
- **WHEN** a redemption request uses a receipt identity already used by a confirmed or pending financial action in the same tenant, branch, and receipt week
- **THEN** the API returns `409 RECEIPT_ALREADY_USED` and creates no duplicate receipt evidence

### Requirement: Pending redemption preserves receipt evidence without balance effect
The system SHALL preserve receipt evidence for high-value pending redemption while creating no debit ledger entry, allocation, lot mutation, outbox financial confirmation, or SMS financial confirmation.

#### Scenario: High-value redemption awaits approval
- **WHEN** a valid high-value redemption request is accepted for approval
- **THEN** receipt evidence and redemption intent are persisted while active balance remains unchanged
