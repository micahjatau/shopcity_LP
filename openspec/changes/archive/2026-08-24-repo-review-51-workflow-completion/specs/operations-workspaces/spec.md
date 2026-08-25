## ADDED Requirements

### Requirement: Offline queue becomes a real reconciliation workflow

The frontend SHALL expose a batch sync queue for offline records with per-record outcomes.

#### Scenario: Queue shows pending offline records

- **GIVEN** the browser has pending offline earn records
- **WHEN** the cashier opens sync
- **THEN** the queue lists the local records and their current state

#### Scenario: Batch sync shows authoritative outcomes

- **GIVEN** the cashier submits a sync batch
- **WHEN** the backend returns per-record results
- **THEN** the UI shows confirmed, pending-approval, rejected, and retryable outcomes
- **AND** failure reasons remain visible for follow-up

### Requirement: Supervisor transaction workspace supports review and reversal

The frontend SHALL expose transaction search, detail, and reversal workflows for authorized supervisor and admin roles.

#### Scenario: Transaction detail can lead to reversal

- **GIVEN** an authorized user opens a transaction detail view
- **WHEN** the transaction is reversible and a valid reason is provided
- **THEN** the user can confirm the reversal from the same workflow

### Requirement: Approvals, fraud, and reports are detail-led workspaces

The frontend SHALL expose live approvals, fraud review, and report exploration rather than summary-only cards.

#### Scenario: Approval detail includes context for decisioning

- **GIVEN** a supervisor opens an approval item
- **WHEN** the detail view loads
- **THEN** it shows customer, receipt, amount, policy, and reason context before decision

#### Scenario: Fraud review exposes evidence context

- **GIVEN** a supervisor opens a fraud item
- **WHEN** the detail view loads
- **THEN** the UI shows the related transaction and evidence context needed to decide

#### Scenario: Reports can be filtered and exported

- **GIVEN** an admin opens the reports workspace
- **WHEN** a report is selected
- **THEN** the workspace supports filters, freshness awareness, and export where the backend provides it

### Requirement: Admin operations surfaces use live backend data

The frontend SHALL expose users, devices, branches, audit, and pilot operations data through real workflows.

#### Scenario: Admin operations summary is source-backed

- **GIVEN** an admin opens the operations summary
- **WHEN** data loads successfully
- **THEN** the screen reflects live outbox, SMS, offline-sync, fraud, report, and reconciliation signals rather than demo values
