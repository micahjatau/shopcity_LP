# Bounded list endpoints

## MODIFIED Requirements

### Requirement: Approval list supports status filters before pagination

The approvals list endpoint SHALL accept the optional status filters `ALL`, `PENDING`, `APPROVED`, `REJECTED`, and `EXPIRED`. `APPROVED` SHALL include both `APPROVED` and `EXECUTED` records. Filtering SHALL occur within the authenticated tenant and branch scope before cursor pagination. Unsupported filters SHALL return a client error.

#### Scenario: Approved history is paginated

- **WHEN** a caller requests `status=APPROVED` with a cursor page
- **THEN** only approved or executed approvals in the caller's authorized scope are returned and the cursor advances through that filtered result set

#### Scenario: Invalid filter is rejected

- **WHEN** a caller requests an unsupported status
- **THEN** the API returns a client error without listing records
