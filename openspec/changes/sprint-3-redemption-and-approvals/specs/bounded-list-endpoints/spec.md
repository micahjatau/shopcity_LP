## ADDED Requirements

### Requirement: Customer ledger includes Sprint 3 transaction types

Customer ledger endpoints SHALL include bounded, JSON-safe entries for redeem, reversal, and adjustment transactions with direction, reversal linkage, and allocation or restoration summaries where applicable.

#### Scenario: Customer ledger contains redemption

- **WHEN** a customer ledger page includes a redemption ledger entry
- **THEN** the entry includes debit direction, redeemed amount, allocation summary, and stable cursor pagination metadata

### Requirement: Approval queue exposes target discrimination

Approval queue endpoints SHALL expose approval target type and target summary for earn and redemption approvals without leaking unnecessary PII.

#### Scenario: Redemption approval is listed

- **WHEN** a pending redemption approval appears in the approval queue
- **THEN** the item includes targetType, redemptionId, requested amount, current status, policy reason, and relevant customer/receipt summary
