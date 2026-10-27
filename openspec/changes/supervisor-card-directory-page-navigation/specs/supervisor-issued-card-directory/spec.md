## MODIFIED Requirements

### Requirement: Directory pagination and states remain complete

The issued-card table MUST load bounded cursor pages in stable issue-date-descending and card-ID-descending order and display one cursor page at a time. It MUST provide accessible Previous, Page N, and Next controls matching the Supervisor transactions pagination pattern. Previous MUST be disabled on the first page; Next MUST be disabled when no continuation cursor is available; both controls MUST be disabled while a page request is in flight. Navigation requests MUST retain the active search, status, and inclusive issue-date filters. Changing an effective filter MUST reset the cursor stack and displayed page to page 1. A successful navigation MUST replace the visible rows with the requested page and update the page number. A failed navigation MUST preserve the currently visible rows and page number and provide a retry action for the failed destination. The directory MUST show truthful loading, empty, retryable error, and end-of-list states; a failed request MUST NOT be presented as a successful empty result. The page indicator MUST NOT imply a total page count when none is provided by the API.

#### Scenario: More issued cards are available

- **GIVEN** more matching cards exist than fit in the current 25-card page
- **WHEN** the page loads
- **THEN** the table shows the first bounded response page and a Next control
- **AND** activating Next requests the returned continuation cursor with the same active filters
- **AND** the table shows only that next response page and the indicator advances to `Page 2`.

#### Scenario: Supervisor returns to a previous card page

- **GIVEN** the Supervisor is on page 2 or later
- **WHEN** they activate Previous
- **THEN** the saved cursor for the previous page is requested with the current filters
- **AND** the returned page replaces the visible rows and the page indicator decreases by one.

#### Scenario: A page request fails

- **GIVEN** the Supervisor has a successfully loaded card page
- **WHEN** a Previous or Next page request fails
- **THEN** the current rows and page indicator remain visible
- **AND** a retry action repeats the failed destination request.

#### Scenario: Filters change while viewing a later page

- **GIVEN** the Supervisor is on a later page
- **WHEN** search, status, or issue-date filters change
- **THEN** the issued-card request restarts with an empty cursor and the active filters
- **AND** the page indicator resets to `Page 1`.

#### Scenario: No additional card page is available

- **GIVEN** the current response has no continuation cursor
- **WHEN** the current card page is rendered
- **THEN** Next is disabled while Previous remains available when the page number is greater than 1
- **AND** the page indicator shows only `Page N` without an invented total.
