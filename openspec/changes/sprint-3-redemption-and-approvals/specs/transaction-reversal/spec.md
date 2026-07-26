## ADDED Requirements

### Requirement: Reversal creates compensating ledger entries
The system SHALL reverse confirmed financial transactions by creating compensating ledger entries and SHALL NOT update or delete original confirmed ledger entries.

#### Scenario: Redemption is reversed safely
- **WHEN** an eligible supervisor reverses a confirmed redemption whose source lots can be restored safely
- **THEN** the system creates a credit reversal ledger entry, immutable restoration rows, audit records, outbox event, SMS intent, and an updated active balance

### Requirement: Restoration rows are immutable evidence
The system SHALL persist immutable restoration rows for debit reversals and SHALL reject restoration totals that exceed the original allocation amounts.

#### Scenario: Restoration exceeds allocation
- **WHEN** a reversal transaction attempts to restore more than the original allocation amount
- **THEN** the database rejects the transaction

### Requirement: Unsafe reversals require review
The system SHALL return `REVERSAL_REVIEW_REQUIRED` when automatic reversal cannot prove coherent lot restoration or safe credit removal.

#### Scenario: Original redemption lot is expired
- **WHEN** a redemption reversal would restore credit into an original lot that is already expired
- **THEN** the API returns `REVERSAL_REVIEW_REQUIRED` and creates no compensating financial effect

#### Scenario: Earn credit is partially consumed
- **WHEN** an earn reversal is requested for a credit lot that has already been partially consumed
- **THEN** the API returns `REVERSAL_REVIEW_REQUIRED` unless a documented partial-reversal policy is implemented

### Requirement: Automatic reversal is unique per original transaction
The system SHALL prevent more than one automatic reversal for the same original transaction unless a future multi-reversal policy is explicitly specified.

#### Scenario: Duplicate reversal request
- **WHEN** a confirmed transaction has already been reversed
- **THEN** a later reversal request returns a stable conflict and creates no second reversal ledger entry
