## ADDED Requirements

### Requirement: Debit allocation totals match ledger amount

The database SHALL reject committed transactions where redemption or debit-adjustment allocation totals do not equal the absolute amount of the linked DEBIT ledger entry.

#### Scenario: Allocation sum is incomplete

- **WHEN** a debit ledger entry commits with allocation rows totaling less than the debit amount
- **THEN** the database rejects the transaction at commit

### Requirement: Allocation ownership matches financial records

The database SHALL enforce that allocation customer and tenant ownership match the credit lot, debit ledger entry, and linked redemption or adjustment context.

#### Scenario: Allocation references another customer's lot

- **WHEN** an allocation attempts to consume a credit lot belonging to another customer
- **THEN** the database rejects the transaction at commit

### Requirement: Redemption allocation links to its redemption ledger

The database SHALL enforce that a redemption allocation's `redemptionLedgerEntryId` matches the ledger entry recorded on the target redemption.

#### Scenario: Allocation links wrong redemption ledger

- **WHEN** a redemption allocation references a ledger entry other than the target redemption's ledger entry
- **THEN** the database rejects the transaction at commit

### Requirement: Allocation inserts are balanced by lot reductions

The database SHALL reject committed transactions where inserted allocation amounts are not reflected in the corresponding credit lot remaining balance change.

#### Scenario: Allocation row without lot decrement

- **WHEN** an allocation row is inserted but the credit lot remaining amount is not reduced accordingly
- **THEN** the database rejects the transaction at commit

### Requirement: Restoration inserts are balanced by lot increases

The database SHALL reject committed transactions where restoration amounts exceed original allocations or are not reflected in corresponding credit lot balance restoration.

#### Scenario: Restoration row without lot increment

- **WHEN** an allocation restoration is inserted without restoring the corresponding lot balance
- **THEN** the database rejects the transaction at commit

### Requirement: Debit allocation invariants are tested in migrations

The system SHALL include migration or integration tests proving the database accepts valid redemption allocation sequences and rejects incomplete or mismatched allocation/restoration writes.

#### Scenario: Invalid direct allocation write is attempted

- **WHEN** a test attempts to commit an allocation that violates ownership, linkage, amount, or lot-balance invariants
- **THEN** PostgreSQL rejects the write with the expected constraint failure
