## ADDED Requirements

### Requirement: Approval listings respect actor branch scope

The system MUST scope approval listings by the caller's authorized branch membership before results are returned.

#### Scenario: Supervisor lists approvals

- **WHEN** a supervisor requests approvals for a tenant
- **THEN** the system returns only approvals assigned to branches the supervisor may access

### Requirement: Approval decisions enforce actor scope

The system MUST authorize approval decisions against the caller's branch scope before any state change is attempted.

#### Scenario: Actor decides a foreign-branch approval

- **WHEN** a caller attempts to decide an approval outside their authorized branch scope
- **THEN** the request fails without changing approval, redemption, receipt, or audit state

### Requirement: Customer-ledger reads respect branch and tenant scope

The system MUST restrict customer-ledger reads to branch scope for non-admin actors and tenant scope for admins.

#### Scenario: Branch-scoped actor reads a customer ledger

- **WHEN** a non-admin actor requests a customer ledger
- **THEN** the query returns only rows in the actor's authorized branch scope
