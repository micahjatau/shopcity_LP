## ADDED Requirements

### Requirement: Issued-card inventory is cursor paginated

The issued-card inventory endpoint SHALL return bounded cursor pages ordered by issue timestamp descending and card ID descending as a deterministic tie-breaker. Each page SHALL return `items`, `nextCursor`, and `hasMore`; a cursor SHALL continue after the prior page without duplicating its final item.

#### Scenario: Issued-card page has more results

- **WHEN** more tenant-scoped ACTIVE, BLOCKED, and REPLACED cards matching the current filters exist than the requested limit
- **THEN** the response returns at most the bounded limit with `hasMore: true` and a non-empty `nextCursor`.

#### Scenario: Issued-card continuation is stable

- **GIVEN** multiple cards share the same issue timestamp
- **WHEN** the client requests the next page with `nextCursor`
- **THEN** card ID provides a deterministic tie-breaker and no card from the prior page is repeated.
