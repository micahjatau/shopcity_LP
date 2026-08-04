## ADDED Requirements

### Requirement: Response schemas match the current HTTP payloads

The OpenAPI contract MUST describe the full response shapes currently returned by the transaction detail, customer ledger, and approval-list endpoints, including the structured nested data exposed by the services.

#### Scenario: transaction detail exposes structured fields

- **WHEN** the API documents `GET /transactions/:id`
- **THEN** the response schema MUST include the transaction, tenant, branch, customer, device, card, receipt, amount, approval, balance, expiry, SMS, and nested ledger data returned by the service

#### Scenario: ledger and approval-list responses are not generic objects

- **WHEN** the API documents the customer ledger or approval-list endpoint
- **THEN** the response schema MUST describe the structured fields returned by the service rather than a generic object placeholder

### Requirement: Earn responses are state-specific

The OpenAPI contract MUST distinguish confirmed and pending-approval earn responses, and MUST require state-specific fields for each response shape.

#### Scenario: confirmed earns require financial-effect fields

- **WHEN** the API documents a confirmed earn response
- **THEN** the schema MUST require `transactionId` and the other confirmed-state financial-effect fields

#### Scenario: pending approvals require an approval identifier

- **WHEN** the API documents a pending-approval earn response
- **THEN** the schema MUST require `approvalId` and MUST keep financial-effect fields null or absent until approval is executed
