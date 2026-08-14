# frontend-workflows-shells Specification

## ADDED Requirements

### Requirement: Role shells reflect operational workflows

The system SHALL provide cashier, supervisor, and admin shells whose navigation and route surfaces reflect the approved operational workflow groups.

#### Scenario: Cashier shell exposes transaction tasks

- **WHEN** the cashier shell is opened
- **THEN** it exposes the cashier workflow surfaces for home, earn, redeem, customers, and sync

#### Scenario: Supervisor and admin shells expose broader operations

- **WHEN** a supervisor or admin opens their shell
- **THEN** the shell exposes the reporting, approvals, fraud, and operations surfaces appropriate to that role

### Requirement: Workflow components stay contract-backed

The system SHALL render workflow states from backend responses instead of reimplementing financial policy in the frontend.

#### Scenario: Approval views use server outcomes

- **WHEN** a pending approval is displayed or decided
- **THEN** the UI reflects the server-returned decision state, reason, and reconciliation status

#### Scenario: Cashier earn and redeem flows stay authoritative

- **WHEN** an earn or redeem request is submitted
- **THEN** the frontend displays backend-confirmed states and does not infer loyalty outcomes independently
