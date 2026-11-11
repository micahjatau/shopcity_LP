# Cashier Find Customer

## ADDED Requirements

### Requirement: Customer result lists use bounded cursor pagination

The Cashier Find Customer route SHALL page recent customer summaries and customer discovery results using the existing authenticated customer-list cursor contract. It SHALL show one bounded API page at a time and SHALL display the current page number without implying a total page count.

#### Scenario: Cashier pages through recent customers

- **GIVEN** the customer-list response has `hasMore: true` and a non-empty `nextCursor`
- **WHEN** the Cashier selects Next
- **THEN** the next request uses that cursor and the existing bounded page limit
- **AND** the table shows the returned page and advances its page indicator
- **AND** Previous returns to the prior cursor page
- **AND** the page indicator does not claim a total page count

#### Scenario: Cashier pages through customer search results

- **GIVEN** a customer query has returned a page with `hasMore: true` and a non-empty `nextCursor`
- **WHEN** the Cashier selects Next or Previous
- **THEN** the requested cursor page is loaded for the same query
- **AND** changing the query or submitting a fresh search resets pagination to page 1

#### Scenario: Pagination controls reflect available pages and loading

- **GIVEN** the first page is displayed or a page request is in flight
- **WHEN** pagination controls render
- **THEN** Previous is disabled on page 1
- **AND** Next is disabled when there is no valid continuation cursor
- **AND** both controls are disabled while the list is loading
- **AND** the controls use accessible names and the same left/right chevron icons and visual treatment as Cashier Transactions pagination

#### Scenario: Failed page navigation preserves visible customers

- **GIVEN** customer rows are visible and a cursor-page request fails
- **WHEN** the failure is presented
- **THEN** the currently visible rows and page number remain unchanged
- **AND** the Cashier can retry the failed destination

#### Scenario: Customer discovery does not authorize financial action

- **GIVEN** the Cashier is paging through recent or searched customer summaries
- **WHEN** a customer is displayed without successful exact active-card verification
- **THEN** directory pagination does not unlock Earn or Redeem
- **AND** a verified card context remains required before financial submission
