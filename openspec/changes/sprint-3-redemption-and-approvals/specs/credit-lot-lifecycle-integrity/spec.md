## MODIFIED Requirements

### Requirement: Immutable credit-lot lifecycle fields
The system SHALL prevent direct mutation of credit-lot source fields and expiry, and SHALL allow remaining-balance mutation only through controlled redemption, adjustment, reversal, or future expiry workflows backed by immutable ledger and lot-movement evidence.

#### Scenario: Expiry mutation rejected
- **WHEN** a database update attempts to change a credit lot's `expiresAt`
- **THEN** the database MUST reject the update and preserve the original expiry

#### Scenario: Unexplained remaining balance mutation rejected
- **WHEN** a database update attempts to change a credit lot's `remainingAmountKobo` without matching controlled allocation or restoration evidence in the same financial transaction
- **THEN** the database MUST reject the update and preserve the original remaining balance

#### Scenario: Controlled redemption updates remaining balance
- **WHEN** a confirmed redemption creates a debit ledger entry and immutable allocations for a credit lot
- **THEN** the database MUST allow the corresponding remaining balance decrease when all allocation invariants pass

#### Scenario: Controlled reversal restores remaining balance
- **WHEN** a safe reversal creates a credit reversal ledger entry and immutable restoration rows for original allocations
- **THEN** the database MUST allow the corresponding remaining balance increase without exceeding original amount

## ADDED Requirements

### Requirement: Credit-lot balance bounds are enforced
The system SHALL enforce that credit-lot remaining balance is never negative and never greater than the original amount.

#### Scenario: Lot balance would become negative
- **WHEN** a controlled debit attempts to reduce a lot below zero
- **THEN** the database rejects the transaction

#### Scenario: Lot balance would exceed original amount
- **WHEN** a controlled restoration attempts to increase a lot above its original amount
- **THEN** the database rejects the transaction
