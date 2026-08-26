## ADDED Requirements

### Requirement: Report exports are CSV-only in Sprint 4

The system MUST provide report exports in CSV format and MUST NOT expose XLSX or PDF exports in Sprint 4.

#### Scenario: Export is requested

- **WHEN** a caller requests a report export with `format=csv`
- **THEN** the system MUST return CSV content for the requested report if the caller is authorized

### Requirement: Export refresh is asynchronous

The system MUST provide an admin-only report refresh operation that returns immediately without performing a full report rebuild synchronously in the request path.

#### Scenario: Admin triggers refresh

- **WHEN** an admin requests report refresh
- **THEN** the system MUST return `202 Accepted` and schedule background materialization

### Requirement: Export access is role-restricted

The system MUST restrict raw exports to admin or owner access and MUST keep supervisor export access branch-scoped.

#### Scenario: Cashier requests an export

- **WHEN** a cashier requests a report export
- **THEN** the system MUST deny the request

#### Scenario: Supervisor requests a cross-branch export

- **WHEN** a supervisor requests a report export outside their branch scope
- **THEN** the system MUST deny the request without revealing tenant-wide data

### Requirement: Export output is safe for spreadsheets

The system MUST escape CSV fields correctly and prevent spreadsheet formula injection.

#### Scenario: Field starts with a formula prefix

- **WHEN** an exported cell value starts with `=`, `+`, `-`, or `@`
- **THEN** the system MUST encode the value so spreadsheet software does not execute it as a formula

### Requirement: Export operations are audited and bounded

The system MUST audit every export request and MUST enforce row and rate limits.

#### Scenario: Export exceeds limits

- **WHEN** an export request exceeds the configured row cap or rate limit
- **THEN** the system MUST reject the request with a stable error response

### Requirement: Export values follow report masking rules

The system MUST apply the report's masking policy to personally identifying values unless the caller is explicitly permitted to view the unmasked value.

#### Scenario: Export contains a phone number

- **WHEN** an export includes a phone number for a caller without elevated permission
- **THEN** the system MUST mask the number in the output CSV
