## ADDED Requirements

### Requirement: Committed adjustments must match their source ledger entry

The system MUST require each committed adjustment record to match its source ledger entry on tenant, customer, kind, amount, effective date, and ledger relationship before the transaction commits.

#### Scenario: Valid adjustment is accepted

- **WHEN** an adjustment is committed with matching tenant, customer, kind, amount, effective date, and ledger relationship
- **THEN** the database accepts the adjustment

#### Scenario: Adjustment evidence contradicts the ledger

- **WHEN** the adjustment record has a different kind, amount, effective date, tenant, customer, or ledger relationship than the source ledger entry
- **THEN** the database rejects the write and no conflicting adjustment is committed

### Requirement: Uncommitted adjustments may remain without a ledger link

The system MUST allow an explicit non-committed adjustment state to exist without a source ledger link, but MUST prevent that state from being finalized without a matching ledger entry.

#### Scenario: Draft adjustment is stored

- **WHEN** an adjustment is created in a non-committed state without a ledger link
- **THEN** the system allows the draft to exist without treating it as a finalized financial record

#### Scenario: Draft adjustment is finalized without a ledger link

- **WHEN** a non-committed adjustment is finalized without a matching ledger entry
- **THEN** the system rejects the finalization

### Requirement: Historical adjustment mismatches fail migration preflight

The system MUST scan existing adjustment and ledger rows before applying an integrity migration and fail closed if any linked pair is inconsistent.

#### Scenario: Existing mismatch is found

- **WHEN** a historical adjustment differs from its linked ledger entry on any required field
- **THEN** the migration preflight fails and reports the inconsistent rows
