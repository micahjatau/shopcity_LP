# credit-lot-lifecycle-integrity Specification

## Purpose

TBD - created by archiving change sprint-2-credit-lot-lifecycle-closure. Update Purpose after archive.

## Requirements

### Requirement: Derived credit-lot expiry

The system SHALL enforce that every credit lot expiry is derived from its earn timestamp using the approved twelve-month UTC month-clamp calculation.

#### Scenario: Valid expiry accepted

- **WHEN** a credit lot is created with `expiresAt` equal to the twelve-month derived value from `earnedAt`
- **THEN** the database MUST accept the credit lot when all other ledger-source requirements are satisfied

#### Scenario: Invalid expiry rejected

- **WHEN** a credit lot insert or update would set `expiresAt` to a value other than the twelve-month derived value from `earnedAt`
- **THEN** the database MUST reject the write

#### Scenario: Month-end expiry parity

- **WHEN** `earnedAt` falls on a date whose day does not exist in the target month or year
- **THEN** the derived `expiresAt` MUST clamp to the last valid day of the target month while preserving the UTC time components

### Requirement: Immutable credit-lot lifecycle fields

The system SHALL prevent direct mutation of credit-lot lifecycle fields until controlled workflows exist.

#### Scenario: Expiry mutation rejected

- **WHEN** a database update attempts to change a credit lot's `expiresAt`
- **THEN** the database MUST reject the update and preserve the original expiry

#### Scenario: Remaining balance mutation rejected

- **WHEN** a database update attempts to change a credit lot's `remainingAmountKobo`
- **THEN** the database MUST reject the update until a controlled redemption, expiry, reversal, or audit workflow is introduced

### Requirement: Credit lots are not deletable

The system SHALL prevent direct deletion of earned credit lots.

#### Scenario: Credit lot deletion rejected

- **WHEN** a database delete attempts to remove a `CreditLot` row
- **THEN** the database MUST reject the delete and preserve the lot for ledger reconciliation

#### Scenario: Corrections do not delete lots

- **WHEN** a future correction is required for earned credit
- **THEN** the system MUST represent the correction through redemption allocation, expiry debit, reversal, or administrative compensating workflows rather than deleting the credit lot

### Requirement: Credit-lot lifecycle regression coverage

The system SHALL include database-level tests for credit-lot lifecycle protection.

#### Scenario: Lifecycle mutation tests fail closed

- **WHEN** the integration suite attempts invalid expiry, expiry mutation, remaining-balance mutation, or credit-lot deletion
- **THEN** each operation MUST fail and the persisted credit-lot values MUST remain unchanged

#### Scenario: Existing source integrity remains covered

- **WHEN** lifecycle guards are added
- **THEN** existing tests for ledger source matching and immutable source fields MUST continue to pass
