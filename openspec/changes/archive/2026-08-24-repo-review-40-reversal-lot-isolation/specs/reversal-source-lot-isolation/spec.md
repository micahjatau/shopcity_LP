## ADDED Requirements

### Requirement: Credit-source reversals must consume the original lot only

The system MUST allocate debit for unused earn reversals and credit-adjustment reversals from the exact source credit lot that produced the reversed transaction, and MUST not consume any other active credit lot for that reversal.

#### Scenario: Earn reversal consumes its own lot

- **GIVEN** a customer has an older credit lot `A` with remaining balance and a newer earn credit lot `B` that is still fully unused
- **AND** the system is reversing the earn transaction that created lot `B`
- **WHEN** the reversal is completed
- **THEN** lot `B` is reduced to zero
- **AND** lot `A` remains unchanged
- **AND** the reversal allocation evidence references lot `B`
- **AND** the reversal record still points to the reversed earn transaction

#### Scenario: Credit-adjustment reversal consumes its own lot

- **GIVEN** a customer has an older credit lot `A` with remaining balance and a newer credit-adjustment lot `B` that is still fully unused
- **AND** the system is reversing the credit adjustment that created lot `B`
- **WHEN** the reversal is completed
- **THEN** lot `B` is reduced to zero
- **AND** lot `A` remains unchanged
- **AND** the reversal allocation evidence references lot `B`
- **AND** the reversal record still points to the reversed adjustment transaction

### Requirement: Exact-lot reversal allocation must fail closed

The system MUST reject a credit-source reversal when the original credit lot cannot be proven usable at reversal time, rather than falling back to FIFO allocation against other lots.

#### Scenario: Original lot is unavailable

- **GIVEN** a reversal targets a credit lot that is expired, mismatched, or short on remaining balance
- **WHEN** the system attempts to complete the reversal
- **THEN** the reversal fails with a review-required or equivalent unsafe-reversal response
- **AND** no other credit lot is debited
- **AND** no allocation evidence is written for a different lot
