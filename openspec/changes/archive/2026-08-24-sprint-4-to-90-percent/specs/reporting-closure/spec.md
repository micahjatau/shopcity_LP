## ADDED Requirements

### Requirement: Reporting is derived from authoritative source data

The system SHALL define reporting metrics from authoritative receipts, ledger entries, credit lots, approvals, SMS records, and audit records rather than mutable business-side corrections.

#### Scenario: Report is rebuilt

- **WHEN** a reporting materializer rebuilds a tenant or branch
- **THEN** it produces the same totals from the same authoritative inputs instead of incrementing counters twice

### Requirement: Historical snapshots respect the as-of watermark

The system SHALL materialize reports only from authoritative source rows at or before the requested as-of watermark.

#### Scenario: Future transaction is outside the snapshot

- **WHEN** a report is materialized at a watermark before a transaction occurred
- **THEN** the transaction is excluded from the totals and the future state does not appear in the snapshot

### Requirement: Customer performance counts confirmed activity only

The system SHALL derive customer performance metrics from confirmed financial activity only.

#### Scenario: Customer had no confirmed transaction in period

- **WHEN** a customer has no confirmed financial transaction during the selected period
- **THEN** the system does not count that customer as active for that period

### Requirement: Reporting materialization is concurrency safe

The system SHALL scope report materialization per tenant and branch using a watermark or equivalent state so overlapping runs do not double-count records.

#### Scenario: Two workers start the same tenant materialization

- **WHEN** two materialization jobs target the same tenant at the same time
- **THEN** the system prevents duplicate aggregation or resolves to one effective run

### Requirement: Reporting definitions remain integer based

The system SHALL express monetary report values in integer kobo and ratios in basis points.

#### Scenario: Redemption ratio is calculated

- **WHEN** the redemption report calculates an average basket ratio
- **THEN** the system returns the ratio in basis points rather than floating-point percentages
