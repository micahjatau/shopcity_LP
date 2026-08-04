## ADDED Requirements

### Requirement: Adjustment records must match the source ledger entry

The system MUST require each adjustment record to match its source ledger entry on tenant, customer, kind, amount, effective date, and ledger type before the transaction commits.

#### Scenario: Valid adjustment credit is accepted

- **WHEN** an `ADJUSTMENT/CREDIT` entry is committed with matching tenant, customer, amount, and effective date
- **THEN** the system accepts the adjustment only if the adjustment record matches the ledger entry on all required fields

#### Scenario: Adjustment evidence contradicts the ledger

- **WHEN** the adjustment record has a different kind, amount, effective date, tenant, or customer than the ledger entry
- **THEN** the database rejects the write and no conflicting adjustment is committed

### Requirement: Adjustment evidence fields are immutable

The system MUST prevent direct mutation of an adjustment's tenant, customer, kind, amount, ledger link, effective date, creator, and creation evidence after creation.

#### Scenario: Adjustment evidence update is rejected

- **WHEN** a database update attempts to change any immutable adjustment evidence field
- **THEN** the database rejects the update and preserves the original adjustment record
