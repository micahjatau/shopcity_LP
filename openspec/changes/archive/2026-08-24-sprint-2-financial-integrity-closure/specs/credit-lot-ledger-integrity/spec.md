## ADDED Requirements

### Requirement: Credit lot source consistency

The system SHALL validate that every credit lot matches its source earn ledger entry.

#### Scenario: Lot matches ledger on create

- **WHEN** a credit lot is created for an earn ledger entry
- **THEN** the database MUST require matching tenant, customer, original amount, and earned timestamp between the lot and the ledger entry

#### Scenario: Ledger type and direction validated

- **WHEN** a credit lot references a ledger entry
- **THEN** the referenced ledger entry MUST have type `EARN` and direction `CREDIT`

#### Scenario: Mismatched lot rejected

- **WHEN** a credit lot insert or update would mismatch the referenced ledger tenant, customer, amount, effective timestamp, type, or direction
- **THEN** the database MUST reject the write

### Requirement: Immutable credit lot source fields

The system SHALL prevent updates to credit-lot source identity fields after insertion.

#### Scenario: Source identity mutation rejected

- **WHEN** a database update attempts to change a credit lot's tenant, customer, earn ledger reference, original amount, or earned timestamp
- **THEN** the database MUST reject the update

#### Scenario: Remaining balance remains controlled mutable state

- **WHEN** a future redemption, reversal, or expiry workflow updates `remainingAmountKobo`
- **THEN** the database MAY allow the update only when existing non-negative and not-greater-than-original constraints remain satisfied

### Requirement: Credit lot integrity regression coverage

The system SHALL include tests proving credit-lot source consistency and source immutability.

#### Scenario: Invalid source rejected

- **WHEN** the integration suite attempts to create a credit lot from a mismatched or non-earn ledger entry
- **THEN** the database MUST reject the insert

#### Scenario: Source mutation rejected

- **WHEN** the integration suite attempts to mutate immutable credit-lot source fields
- **THEN** the database MUST reject the update and preserve the original values
