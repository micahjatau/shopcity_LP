## ADDED Requirements

### Requirement: Fraud review is scoped by role

The system MUST restrict fraud flag review so supervisors can access only their branch scope and admins or owners can access tenant-wide results.

#### Scenario: Supervisor requests another branch's flag

- **WHEN** a supervisor requests a fraud flag outside their assigned branch scope
- **THEN** the system MUST deny the request without enumerating whether the flag exists

### Requirement: Fraud list and detail endpoints expose stable filters

The system MUST support list and detail access for fraud flags using stable filters such as status, severity, rule code, branch, actor, customer, and date range.

#### Scenario: Fraud list is filtered by branch and status

- **WHEN** a reviewer queries fraud flags with branch and status filters
- **THEN** the system MUST return only matching flags within the caller's authorization scope

### Requirement: Fraud lists are paginated and bounded

The system MUST paginate fraud flag listings and enforce a configured maximum page size.

#### Scenario: Client requests too many results

- **WHEN** a client requests more fraud flags than the configured page maximum
- **THEN** the system MUST cap or reject the request according to the list endpoint contract

### Requirement: Fraud flags support operational decisions

The system MUST allow authorized reviewers to acknowledge or resolve fraud flags with a recorded reason.

#### Scenario: Reviewer acknowledges a flag

- **WHEN** an authorized reviewer submits an acknowledgement decision with a reason
- **THEN** the system MUST persist the decision state and actor metadata on the fraud flag

#### Scenario: Reviewer resolves a flag

- **WHEN** an authorized reviewer submits a resolution decision with a reason
- **THEN** the system MUST persist the resolution state, timestamp, and resolving actor metadata

### Requirement: Fraud decisions are idempotent and non-destructive

The system MUST treat repeated decisions on the same flag idempotently and MUST NOT reopen or modify the linked financial transaction.

#### Scenario: Same decision is submitted twice

- **WHEN** the same reviewer submits the same decision for the same fraud flag more than once
- **THEN** the system MUST preserve the existing fraud state without duplicating a case or changing the underlying transaction

### Requirement: Fraud review does not expose financial write controls

The system MUST keep fraud review separate from approval, reversal, or adjustment actions.

#### Scenario: Reviewer tries to alter a transaction

- **WHEN** a fraud reviewer attempts to modify a receipt, ledger entry, or credit lot
- **THEN** the system MUST reject the action because fraud review is evidence handling only
