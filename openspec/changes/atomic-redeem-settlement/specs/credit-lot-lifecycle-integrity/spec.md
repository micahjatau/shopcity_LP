## ADDED Requirements

### Requirement: Redemption settlement allocates before creating its new Earn lot

The system MUST allocate a redemption only from eligible credit lots that existed before the settlement's Earn effect. The Earn lot for the net-paid amount MUST be created only after the redemption debit has been allocated, and MUST NOT participate in those allocations.

#### Scenario: FIFO prior lots fund redemption

- **GIVEN** a customer has eligible prior credit lots and the receipt will earn after redemption
- **WHEN** the settlement allocates the redemption
- **THEN** allocation follows the existing FIFO rules across prior lots only, and the new receipt Earn lot is created afterward
