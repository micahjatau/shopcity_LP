## Purpose

Ensure list endpoints expose bounded, stable pagination contracts before clients depend on unbounded response shapes.

## Requirements

### Requirement: Customer search is cursor paginated
Customer search endpoints SHALL require or default a bounded `limit` and SHALL return cursor pagination metadata.

#### Scenario: Customer search has more results
- **WHEN** a customer search has more results than the requested limit
- **THEN** the response returns at most `limit` items with `hasMore: true` and a `nextCursor`

### Requirement: Customer ledger is cursor paginated
Customer ledger endpoints SHALL return bounded pages ordered by stable timestamp plus ID.

#### Scenario: Customer ledger order is stable
- **WHEN** multiple ledger entries share the same timestamp
- **THEN** the endpoint uses the entry ID as a deterministic tie-breaker for cursor pagination

### Requirement: Approval queue is cursor paginated
Approval queue endpoints SHALL return bounded pages with `limit`, `cursor`, `nextCursor`, and `hasMore` semantics.

#### Scenario: Approval queue page is requested with cursor
- **WHEN** a client requests the next approval queue page using `cursor`
- **THEN** the response starts after the cursor position using stable ordering
