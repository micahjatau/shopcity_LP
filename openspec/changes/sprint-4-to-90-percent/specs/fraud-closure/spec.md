## ADDED Requirements

### Requirement: Fraud evidence is operational and replay-safe

The system SHALL record fraud findings as operational evidence and SHALL NOT mutate confirmed financial history as part of fraud evaluation.

#### Scenario: Fraud rule matches a transaction

- **WHEN** a transaction satisfies a fraud rule
- **THEN** the system records or updates fraud evidence without editing the underlying receipt or ledger rows

### Requirement: Qualifying earn and redemption flows create fraud work

The system SHALL enqueue fraud evaluation work for qualifying earn and redemption flows so high-value review is driven from production financial transactions.

#### Scenario: High-value earn is confirmed

- **WHEN** an earn transaction exceeds the configured review threshold
- **THEN** the system creates fraud evaluation work for the receipt and keeps the earn response unchanged

#### Scenario: High-value redemption is confirmed

- **WHEN** a redemption transaction exceeds the configured review threshold
- **THEN** the system creates fraud evaluation work for the redemption and keeps the redemption response unchanged

### Requirement: Fraud evaluation events are terminal after success

The system SHALL mark a successfully processed fraud evaluation event as terminal so recovery does not replay it forever.

#### Scenario: Fraud evaluation is processed once

- **WHEN** the worker processes a fraud evaluation event successfully
- **THEN** the event becomes terminal and is not eligible for stale recovery replay

### Requirement: Behavioral fraud rules are deterministic

The system SHALL evaluate the configured behavioral fraud rules using deterministic thresholds and minimum sample sizes over authoritative rows.

#### Scenario: Card reuse threshold is crossed

- **WHEN** a card is used more than the configured daily count threshold within a branch-local day
- **THEN** the system records the configured card-reuse fraud evidence

#### Scenario: Cashier sample size is too small

- **WHEN** a cashier has fewer than the configured minimum sample size for the peer comparison window
- **THEN** the system does not emit a cashier anomaly based only on that insufficient sample

### Requirement: Duplicate receipt attempts preserve evidence

The system SHALL persist duplicate-attempt evidence for receipt uniqueness violations and SHALL keep the unique constraint intact.

#### Scenario: Duplicate receipt is blocked after evidence is recorded

- **WHEN** a cashier submits a receipt that already exists for the same tenant, branch, week, and normalized receipt number
- **THEN** the system records duplicate-attempt evidence and rejects the capture without weakening receipt uniqueness
