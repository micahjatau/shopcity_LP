# workflow-coverage-expansion Specification

## ADDED Requirements

### Requirement: Earn and redeem are real contract-backed workflows

The system MUST implement Earn and Redeem as real backend-connected or contract-faithful workflows rather than placeholder screens.

#### Scenario: Earn is submitted

- **WHEN** a user submits an Earn transaction
- **THEN** the workflow displays the API outcome and transaction state instead of a fixture-only success card

#### Scenario: Redeem is submitted

- **WHEN** a user submits a Redeem transaction
- **THEN** the workflow displays the API outcome and balance/policy outcome instead of a placeholder panel

### Requirement: Supervisor and admin workflows are contract-backed

The system MUST extend the same workflow evidence standard to approvals, fraud review, reports, audit and operations surfaces.

#### Scenario: Approval queue opens

- **WHEN** a supervisor opens approvals
- **THEN** the queue reflects backend-backed items and states rather than static mock data

#### Scenario: Operations summary opens

- **WHEN** an admin opens the operations summary
- **THEN** the panel reflects a backend contract and not a hardcoded health snapshot
