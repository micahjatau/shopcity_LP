# Supervisor Overview Specification

## Purpose

Define the reference presentation and live, branch-scoped reporting behavior for the Supervisor landing route while retaining shared-shell navigation and operational workflows.

## MODIFIED Requirements

### Requirement: Supervisor overview presents current branch activity and searchable paginated open approvals

The `/supervisor` route MUST show the role-appropriate greeting and welcome copy, an approvals action, a Today's Activity section with four responsive metric cards, and a semantic approvals table modeled on the supplied SVG references. The cards and table MUST be accessible semantic HTML styled with repository CSS; the SVGs in `apps/web/public/brand/supervisor/` MUST remain visual references only and MUST NOT be embedded as page content. The full-page screenshot MUST NOT be rendered inside the shell.

The overview MUST obtain transaction, credit-issued, and credit-redeemed metrics from the authorized executive-snapshot API for the current business date in the response's branch timezone. It MUST display the snapshot's `materializedAt` timestamp and make clear that report metrics may lag live activity. A missing current-date report row or invalid metric MUST be shown as unavailable, not fabricated as zero. The pending-approval metric MUST use an exact count computed by the server under the caller's existing authorization scope; this global count MUST remain distinct from any search-result count.

The approvals table MUST show up to five pending approvals per page from the authorized cursor-paginated approvals API, including available customer name, request amount in integer kobo formatted as NGN, requester username, request time, reason/reference, and a link to the dedicated approvals route. It MUST provide right-aligned, icon-only, accessible previous/next controls based on the server's cursor metadata, retain the exact count of matches across pages, and disable navigation when no corresponding page exists. It MUST NOT provide a client-selected branch scope.

Search MUST apply to all pending approvals in the caller's authorized scope, not just the currently loaded page. The API MUST filter before cursor pagination and return an exact match count as well as the unfiltered count for the caller's pending-approval scope. Search MUST include the table's searchable customer, requester, reason, receipt/reference, request type, and amount fields. Changing the query MUST return navigation to the first matching page; navigating within results MUST keep the query active. The search control and result summary MUST disclose that the query searches all open approvals in the caller's scope. Static example metrics and rows MUST NOT be rendered as operational data.

#### Scenario: Supervisor opens the overview with today's report available

- **WHEN** an authorized Supervisor opens `/supervisor`
- **THEN** the page displays one level-one heading, `Hi, Supervisor!`, and the existing welcome copy
- **AND** an accessible action links to the dedicated approvals route
- **AND** the page requests the executive snapshot and first pending-approval page without supplying a client-selected branch scope
- **AND** the server-authorized branch snapshot supplies today's transaction count, credit issued, and credit redeemed values
- **AND** the pending metric shows the exact unfiltered branch-scoped count, while the table shows up to five pending requests on the current result page
- **AND** the report section displays the materialization timestamp and discloses that report values may lag
- **AND** money remains integer kobo in data handling and is formatted as NGN for display
- **AND** the shared shell remains responsible for navigation and the page retains scanner lookup context
- **AND** the SVGs are used as visual guidance only, not rendered as images.

#### Scenario: Today's report is not materialized

- **WHEN** the executive snapshot has no row for the current business date in its returned timezone
- **THEN** the report-backed cards show an unavailable value and a clear no-report-yet message
- **AND** the page MUST NOT reuse an older day's figures or substitute zero
- **AND** the independently loaded pending-approval count and table remain usable.

#### Scenario: A report or approvals request fails

- **WHEN** either API request fails or returns a non-success response
- **THEN** the affected section displays a truthful error and retry affordance
- **AND** the other section remains usable if its request succeeded
- **AND** an existing value may remain visible only when its last successful refresh/freshness is clear; otherwise the value is unavailable.

#### Scenario: There are no pending approvals

- **WHEN** the approvals API succeeds with an exact pending count of zero and no items
- **THEN** the metric shows zero and the table displays a live empty state
- **AND** no illustrative or sample approval rows are shown.

#### Scenario: Supervisor pages through matching approvals

- **WHEN** the current result page has a next cursor and the Supervisor selects Next
- **THEN** the overview requests the next page with the returned cursor, active search query, and pending-status filter
- **AND** it preserves the five-row page limit, exact matching count, unfiltered pending count, and server-enforced branch scope
- **AND** the Previous control becomes available and returns to the prior matching page without clearing the query
- **AND** Next is disabled when the server reports no further page and Previous is disabled on the first page.

#### Scenario: Supervisor searches all open approvals

- **WHEN** a Supervisor enters or changes a search query
- **THEN** the overview sends the query to the authorized approvals API and resets cursor navigation to the first result page
- **AND** the API filters all pending approvals in the caller's existing tenant/role/branch scope before cursor pagination
- **AND** matches on later pages are included in the filtered result set
- **AND** the search covers customer name, requester username, reason, receipt/reference, request type, and amount
- **AND** the exact matching count is shown separately from the unfiltered pending-approval metric
- **AND** the control and result summary disclose that all open approvals in the caller's scope are searched.

#### Scenario: Supervisor search has no matches

- **WHEN** the full-queue search returns an exact match count of zero
- **THEN** the table displays a no-results state and offers to clear the search to see all pending approvals
- **AND** the page does not suggest that other cursor pages remain unsearched.

#### Scenario: Supervisor opens an operational workspace

- **WHEN** a Supervisor uses the approvals action or shell navigation to open a dedicated operational route
- **THEN** the existing route retains its workflow, authorization, and server-authoritative behavior
- **AND** adding the overview presentation does not remove or duplicate operational functionality.
