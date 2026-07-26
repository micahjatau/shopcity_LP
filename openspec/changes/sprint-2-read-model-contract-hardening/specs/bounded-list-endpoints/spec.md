## ADDED Requirements

### Requirement: Customer lists avoid unbounded nested credit lots
Customer list endpoints SHALL return aggregate balance fields without loading or returning complete nested credit-lot collections for each customer in the page.

#### Scenario: Customer list returns aggregate balances
- **WHEN** a customer list page is requested
- **THEN** each item includes aggregate `availableBalanceKobo` where applicable and omits nested `creditLots`

#### Scenario: Balance loading scales with page size
- **WHEN** a customer list page contains multiple customers with many historical credit lots
- **THEN** the active-balance read uses a bounded aggregate/grouped query scoped to the page customers rather than one unbounded nested collection per customer
