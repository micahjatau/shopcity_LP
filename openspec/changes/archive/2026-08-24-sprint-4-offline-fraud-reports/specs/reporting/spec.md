## ADDED Requirements

### Requirement: Reporting definitions are frozen before materialization

The system MUST define reporting metrics in documentation before report materialization code relies on them.

#### Scenario: Report definition is reviewed

- **WHEN** a new reporting metric is introduced
- **THEN** the system MUST document the metric definition before the materializer or API can depend on it

### Requirement: Reporting is derived from authoritative source data

The system MUST define reporting metrics from authoritative receipts, ledger entries, credit lots, approvals, SMS records, and audit records rather than from mutable business-side corrections.

#### Scenario: Report is rebuilt

- **WHEN** a reporting materializer rebuilds a tenant or branch
- **THEN** it MUST produce the same totals from the same authoritative inputs instead of incrementing counters twice

### Requirement: Reporting read models are rebuildable

The system MUST store reporting output in derived tables that can be refreshed or rebuilt safely.

#### Scenario: Materialization reruns after failure

- **WHEN** the same report materialization job runs again for the same period
- **THEN** the system MUST replace or upsert derived rows so the final totals remain idempotent

### Requirement: Reporting materialization is scoped and watermark-driven

The system MUST materialize reporting data per tenant and branch using a watermark or equivalent state so overlapping runs do not double-count records.

#### Scenario: Two workers start the same tenant materialization

- **WHEN** two materialization jobs target the same tenant at the same time
- **THEN** the system MUST prevent duplicate aggregation or must resolve to one effective run

### Requirement: Reporting supports scoped time buckets

The system MUST require explicit date range and timezone handling for report bucketing and MUST return the timezone used.

#### Scenario: Customer report is requested

- **WHEN** a client requests a report with a date range and timezone
- **THEN** the system MUST bucket results using that timezone and include it in the response

### Requirement: Reporting definitions cover Sprint 4 metrics

The system MUST provide definitions for executive summary, liability ageing, cashier activity, customer performance, redemption reporting, SMS operations, and audit reporting.

#### Scenario: Executive summary is requested

- **WHEN** the executive summary report is generated
- **THEN** the system MUST include the defined integer-kobo totals and counts for active customers, credit issued, credit redeemed, credit expired, and outstanding liability

#### Scenario: Liability ageing is requested

- **WHEN** the liability ageing report is generated
- **THEN** the system MUST bucket outstanding lots by expiry month and age bucket using integer-kobo totals

#### Scenario: Customer performance is requested

- **WHEN** the customer performance report is generated
- **THEN** the system MUST return purchase value, current balance, visit count, last activity timestamp, and dormant state for each customer in scope

### Requirement: Customer activity definitions are explicit

The system MUST define active customer and dormant customer using documented Sprint 4 semantics and configured dormancy days.

#### Scenario: Customer had no confirmed transaction in period

- **WHEN** a customer has no confirmed financial transaction during the selected period
- **THEN** the system MUST not count that customer as active for that period

### Requirement: Report responses remain integer-based

The system MUST express all monetary report values in integer kobo and ratios in basis points.

#### Scenario: Redemption ratio is calculated

- **WHEN** the redemption report calculates average basket ratio
- **THEN** the system MUST return the ratio in basis points rather than floating-point percentages
