## ADDED Requirements

### Requirement: Cashier transaction reads are branch-scoped

The system MUST limit cashier transaction lookups to transactions owned by the cashier's assigned branch.

#### Scenario: Cashier requests another branch's transaction

- **WHEN** a cashier requests a transaction that belongs to a different branch
- **THEN** the system MUST deny the read or return a not-found response without revealing the record

### Requirement: Privileged transaction reads respect wider scopes

The system MUST allow supervisors and admins to read transactions according to their authorized branch or tenant scope.

#### Scenario: Supervisor reads an assigned branch transaction

- **WHEN** a supervisor requests a transaction from an assigned branch
- **THEN** the system MUST allow the read if the transaction is within that branch scope

#### Scenario: Admin reads any tenant transaction

- **WHEN** an admin requests a transaction within the tenant
- **THEN** the system MUST allow the read across branch boundaries within the tenant
