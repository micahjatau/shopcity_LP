## ADDED Requirements

### Requirement: Duplicate receipt attempts persist fraud evidence

The system SHALL persist duplicate-receipt fraud evidence in a committed path that survives the rejected receipt attempt, while still rejecting the duplicate capture with the documented conflict response.

#### Scenario: Duplicate receipt is blocked after evidence is recorded

- **WHEN** a cashier submits a receipt that already exists for the same tenant, branch, week, and normalized receipt number
- **THEN** the system records duplicate-attempt fraud evidence, rejects the capture, and preserves the evidence after the transaction completes

### Requirement: Ordinary high-value financial flows emit fraud evaluation work

The system SHALL emit fraud evaluation work for qualifying earn and redemption transactions so high-value fraud rules are evaluated from the production financial flows.

#### Scenario: High-value earn is confirmed

- **WHEN** an earn transaction exceeds the configured fraud threshold
- **THEN** the system creates fraud evaluation work for the receipt and keeps the earn response unchanged

#### Scenario: High-value redemption is confirmed

- **WHEN** a redemption transaction exceeds the configured fraud threshold
- **THEN** the system creates fraud evaluation work for the redemption and keeps the redemption response unchanged

### Requirement: Fraud evaluation events are terminal after processing

The system SHALL mark a successfully processed fraud evaluation event as terminal so recovery does not republish it after the processing window has elapsed.

#### Scenario: Fraud evaluation is processed once

- **WHEN** the worker processes a fraud evaluation event successfully
- **THEN** the event becomes terminal and is not eligible for stale recovery replay

### Requirement: Report materialization respects the watermark snapshot

The system SHALL materialize reports only from authoritative source rows at or before the requested as-of watermark and SHALL derive purchase value from the source receipt amount rather than the earn credit amount.

#### Scenario: Future transaction is outside the snapshot

- **WHEN** a report is materialized at a watermark before a transaction occurred
- **THEN** the transaction is excluded from the report totals and the future state does not appear in the snapshot

#### Scenario: Purchase value uses the receipt amount

- **WHEN** a confirmed earn ledger entry is included in a report
- **THEN** the purchase value is computed from the linked receipt purchase amount and not the cashback credit amount

### Requirement: Reversal-aware report totals exclude reversed credits

The system SHALL exclude reversed earn credits from credit-issued and cashier reversal metrics using the ledger reversal relationship rather than only the entry type.

#### Scenario: Earn credit is reversed later

- **WHEN** an earn ledger entry has a compensating reversal linked through reversesEntryId
- **THEN** the original credit does not count as issued in the report totals and the reversal count reflects the linked reversal
