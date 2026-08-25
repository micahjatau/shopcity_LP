## ADDED Requirements

### Requirement: Credit lots accept adjustment credit sources

The system MUST allow a credit lot to reference a valid credit-producing ledger entry from either an earn or an adjustment credit workflow, while keeping the source reference immutable.

#### Scenario: Adjustment credit creates a lot

- **WHEN** an adjustment workflow creates a `CREDIT` ledger entry that is eligible to source a credit lot
- **THEN** the database MUST accept the credit lot when the expiry and amount invariants are satisfied

#### Scenario: Invalid source mutation is attempted

- **WHEN** a persisted credit lot update attempts to change its source ledger reference
- **THEN** the database MUST reject the update and preserve the original source link

### Requirement: Reversal restorations are tied to the original debit

The system MUST ensure every restored allocation in a reversal points back to the debit ledger entry identified by the reversal record.

#### Scenario: Restoration matches the reversal target

- **WHEN** a reversal restores allocations for a debit ledger entry
- **THEN** each restored allocation MUST reference the same debit ledger entry identified by `reversesEntryId`

#### Scenario: Restoration targets a different debit

- **WHEN** a restored allocation would attach to a debit ledger entry other than the one identified by the reversal record
- **THEN** the system MUST reject the reversal write
