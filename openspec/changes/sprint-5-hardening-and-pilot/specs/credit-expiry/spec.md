## ADDED Requirements

### Requirement: Due credit expires exactly once

The system SHALL create at most one confirmed expiry debit for a given credit lot.

#### Scenario: Remaining credit expires once

- **WHEN** a due lot still has positive remaining credit
- **THEN** the system creates one confirmed expiry ledger debit for exactly that remaining amount
- **AND** records immutable expiry evidence linked uniquely to the lot and ledger entry
- **AND** reduces the lot remaining amount to zero

#### Scenario: Repeat or concurrent sweeps do not duplicate expiry

- **WHEN** the same due lot is seen by repeated or concurrent sweeps
- **THEN** the system produces at most one expiry evidence record for that lot
- **AND** no duplicate expiry debit is committed

### Requirement: Expiry only consumes remaining spendable credit

The system SHALL expire only the authoritative remaining amount on the lot at sweep time.

#### Scenario: Partially consumed lot expires its remainder only

- **WHEN** a lot has already been partially redeemed
- **THEN** the expiry amount equals the authoritative remaining amount, not the original earned amount

#### Scenario: Fully consumed lot creates no expiry debit

- **WHEN** a lot has zero remaining credit
- **THEN** the expiry sweep creates no expiry debit and no expiry evidence for that lot

### Requirement: Expiry is historically reconstructable

Historical reporting SHALL derive expired credit from expiry evidence rather than current mutable balances.

#### Scenario: Report before expiry shows pre-expiry liability

- **WHEN** a report watermark is earlier than the lot expiry event
- **THEN** the report still shows the pre-expiry outstanding amount for that lot

#### Scenario: Report after expiry shows expired credit

- **WHEN** a report watermark is later than the lot expiry event
- **THEN** the report shows the expired amount and no longer counts that amount as outstanding liability
