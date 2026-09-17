## ADDED Requirements

### Requirement: Policy configuration is an audited Admin capability

The product MUST provide validated Admin-only policy mutation with tenant/branch scope, optimistic concurrency, auditability, and generated-client integration.

#### Scenario: Admin changes a policy

- **WHEN** an authorized Admin submits a policy change
- **THEN** the backend validates bounds and version/concurrency
- **AND** persists an audit record with actor and scope
- **AND** the frontend displays the authoritative persisted result

#### Scenario: A stale policy update is submitted

- **WHEN** an Admin submits a policy using an outdated version
- **THEN** the backend rejects the conflict without overwriting the newer policy
- **AND** the UI prompts the Admin to reload current policy state

#### Scenario: An unauthorized role attempts mutation

- **WHEN** a Cashier or Supervisor attempts an Admin policy mutation
- **THEN** the backend rejects the request
- **AND** the UI exposes no mutation control for that role
