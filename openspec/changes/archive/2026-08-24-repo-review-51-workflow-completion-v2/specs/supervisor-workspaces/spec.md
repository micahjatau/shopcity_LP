## ADDED Requirements

### Requirement: Transaction search and detail are actionable supervisor workflows

The frontend SHALL expose transaction search and transaction detail instead of summary text.

#### Scenario: Search lists recent branch activity

- **GIVEN** a supervisor opens transaction search
- **WHEN** they search or filter activity
- **THEN** matching transactions are listed with enough context to open a detail view

#### Scenario: Detail can lead to reversal

- **GIVEN** an authorized user opens a transaction detail
- **WHEN** the transaction is reversible and a valid reason is entered
- **THEN** the user can confirm the reversal from the same workflow

### Requirement: Approvals are detail-led decision screens

The frontend SHALL expose approval items with the context needed to make a decision.

#### Scenario: Approval detail shows the decision context

- **GIVEN** a supervisor opens an approval item
- **WHEN** the detail view loads
- **THEN** it shows customer, receipt, amount, policy, audit, and reason context before decision

#### Scenario: Decision uses entered reason rather than a hard-coded string

- **GIVEN** the supervisor chooses approve or reject
- **WHEN** the decision is submitted
- **THEN** the reason comes from the user input or a selected controlled value
- **AND** the backend receives the actual decision context

### Requirement: Fraud review is evidence-led and filterable

The frontend SHALL expose fraud items with filters and evidence context.

#### Scenario: Fraud review includes filters and evidence

- **GIVEN** a supervisor opens fraud review
- **WHEN** the list renders
- **THEN** the UI can filter by the supported operational dimensions and show the related evidence context

### Requirement: Reports are selectable, filterable, and exportable

The frontend SHALL expose report exploration with freshness awareness and export where supported.

#### Scenario: Report selector exposes multiple report types

- **GIVEN** an admin opens reports
- **WHEN** the workspace loads
- **THEN** the user can select among supported reports instead of only viewing a single executive summary

#### Scenario: Freshness and export are visible

- **GIVEN** a report is selected
- **WHEN** the data loads
- **THEN** the workspace shows freshness or materialization state and export controls where the backend provides them
