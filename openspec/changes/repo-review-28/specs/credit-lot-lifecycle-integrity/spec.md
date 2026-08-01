## ADDED Requirements

### Requirement: Approved credit sources can create credit lots
The system MUST allow only approved credit-producing ledger sources to create credit lots, including earned credits and adjustment credits, while rejecting debits and unsupported sources.

#### Scenario: Earn credit creates a lot
- **WHEN** an `EARN/CREDIT` entry is committed with matching tenant, customer, amount, and effective date
- **THEN** the system creates a credit lot for that entry

#### Scenario: Adjustment credit creates a lot
- **WHEN** an `ADJUSTMENT/CREDIT` entry is committed with matching tenant, customer, amount, and effective date
- **THEN** the system creates a credit lot for that entry

#### Scenario: Unsupported source is rejected
- **WHEN** a debit or unsupported ledger source attempts to create a credit lot
- **THEN** the database rejects the write and no credit lot is committed

### Requirement: Restorations remain tied to the original debit
The system MUST ensure each allocation restoration references the same original debit ledger entry that consumed the allocation.

#### Scenario: Reversal restores a foreign allocation
- **WHEN** a reversal tries to restore an allocation consumed by a different debit entry
- **THEN** the database rejects the transaction before commit
