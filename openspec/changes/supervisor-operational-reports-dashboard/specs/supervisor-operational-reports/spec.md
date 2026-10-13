# Role-Aware Operational Reports Specification

## Purpose

Define the shared period-based operational overview available to authorized Supervisors and Admins while preserving role-specific report scope, financial meaning, and detailed report-generation behavior.

## ADDED Requirements

### Requirement: Supervisor can select one shared reporting period

The `/supervisor/reports` route MUST offer Last 7 days, Last 30 days, and custom inclusive start/end dates. The selected period MUST be applied consistently to dashboard data requests and the detailed report builder. Custom ranges with a missing or later start date MUST NOT be applied.

#### Scenario: Supervisor changes a preset or custom period

- **WHEN** a Supervisor selects a supported preset or applies a valid custom range
- **THEN** dashboard requests use that range
- **AND** the detailed report builder uses the same start and end dates
- **AND** the selected range is clearly identified in the page

#### Scenario: Supervisor enters an invalid custom range

- **WHEN** the custom start date is missing or after the end date
- **THEN** the page explains that the range is invalid
- **AND** no requests are made for the invalid range
- **AND** the previously applied range remains in effect

### Requirement: Financial flow totals and outstanding snapshots remain distinct

The dashboard MUST sum daily loyalty purchase value, credit issued, and credit redeemed across available report dates in the selected period. Outstanding credit MUST use the latest available outstanding-liability snapshot in that period and MUST NOT be summed across dates. Every materialization MUST include the current as-of business date in daily financial summaries, even when that day has no reportable activity, so the closing-balance snapshot stays current. Values that are unavailable, invalid, or unsafe to aggregate MUST NOT be presented as zero.

#### Scenario: Supervisor reviews financial KPIs

- **WHEN** multiple daily financial report rows are available for the selected period
- **THEN** the three flow KPIs show the sum of their respective daily values
- **AND** outstanding credit shows the value from the latest report date only
- **AND** the outstanding-credit label identifies it as a closing balance and indicates its snapshot date when available

#### Scenario: A quiet day still receives a current closing-balance snapshot

- **GIVEN** a branch has prior loyalty activity but no reportable activity on the current business date
- **WHEN** the periodic report materialization completes
- **THEN** the current business date is present in the daily financial summaries
- **AND** its activity-flow values are zero while its outstanding-credit value reflects the current as-of balance
- **AND** its materialization timestamp identifies the completed refresh

### Requirement: Dashboard requests preserve role-authorized scope

The dashboard MUST use existing reporting APIs. Supervisor requests MUST NOT offer or send a client-selected branch identifier to widen access. Admin requests MAY use the existing branch filter for endpoints that support branch scope; absent that filter, Admin reports use the scope returned by the backend. Audit and pilot-operations endpoints remain tenant-wide because their existing APIs do not accept branch scope. Backend authorization and scope resolution remain authoritative for every reporting category and the detailed report builder.

#### Scenario: Supervisor views dashboard and report data

- **WHEN** a Supervisor loads or filters the dashboard and detailed report builder
- **THEN** requests use the existing Supervisor-authorized reporting endpoints
- **AND** returned report data remains limited to the Supervisor's authorized branch by the backend
- **AND** the UI does not infer broader access from an empty response or report error

### Requirement: Operational summaries follow the selected category and period

The dashboard MUST provide daily activity and category-filtered summaries for overall activity, cashier performance, redemptions, and SMS, using only report data returned for the selected period. A category-specific failure or empty result MUST be identified without implying an authoritative zero count.

#### Scenario: Supervisor changes the operational-summary category

- **WHEN** the Supervisor selects a summary category
- **THEN** the page shows insights derived from that category's report rows for the selected period
- **AND** the daily chart and report builder remain tied to the same selected period

### Requirement: Existing detailed report generation remains available

The dashboard MUST retain the existing detailed report-generation and export workspace below the operational overview. Its report filters MUST follow the dashboard's selected date range, and existing role permissions and report actions MUST remain unchanged.

#### Scenario: Supervisor generates or exports a detailed report

- **WHEN** the Supervisor uses the detailed report workspace
- **THEN** its date range matches the currently selected dashboard period
- **AND** supported report selection, generation, and export actions remain available under existing authorization

### Requirement: Operational reports reflow across viewport sizes

The dashboard filters, KPI cards, chart, summaries, and detailed report workspace MUST remain readable and operable at desktop, tablet, and phone widths without document-level horizontal overflow.

#### Scenario: Supervisor uses reports on a narrow viewport

- **WHEN** the route is rendered at a phone or tablet width
- **THEN** controls and report content reflow without clipping or horizontal page overflow
- **AND** all period and category controls remain operable

### Requirement: Report content uses the Approvals visual and accessibility system

The shared Supervisor and Admin reports content SHALL use the Approvals page's visual language, remain responsive, and preserve accessible keyboard focus, labels, and live status announcements. Styles SHALL be scoped to the operational reports content and MUST NOT change Admin Operations or unrelated Admin report consumers.

#### Scenario: Report page adapts to viewport size

- **WHEN** the reports page is viewed on desktop, tablet, or mobile
- **THEN** summary cards and report controls reflow without document-level horizontal overflow
- **AND** tables may scroll within their own responsive container
- **AND** controls remain keyboard-operable with visible focus indicators

### Requirement: Metrics explain definitions and data provenance

Each displayed KPI SHALL provide a concise definition. Period flow totals SHALL remain distinct from latest-snapshot stocks, and unavailable report values SHALL NOT be presented as zero. The page SHALL explain that ShopCity loyalty transaction value is not total POS sales.

#### Scenario: KPI definitions are available

- **WHEN** a user opens a metric's information control
- **THEN** its plain-language definition and reporting basis are available accessibly
- **AND** the dashboard includes a visible explanatory note near the summary metrics

### Requirement: Monetary and time values are display-safe and timezone-aware

Money SHALL be formatted from integer kobo without floating-point display conversion. Business dates and timestamps SHALL be presented for Africa/Lagos, and the selected period SHALL identify that timezone. The underlying API values and report calculations SHALL remain unchanged.

#### Scenario: API-provided monetary amounts are displayed

- **WHEN** a report value is an integer kobo amount
- **THEN** the page formats it as NGN with two decimal places without binary floating-point conversion
- **AND** it preserves a distinguishable missing-data state

#### Scenario: Report timestamps are displayed

- **WHEN** an API response includes a report timestamp or business date
- **THEN** the page displays it for Africa/Lagos
- **AND** the timezone is visible beside the reporting window

### Requirement: Detailed reports reflect role access and preserve scope

The report picker SHALL include only reports exposed to the current role. The workspace SHALL display server-returned scope and timezone, and show a configured branch name when available with the branch identifier as a fallback. Admin branch filters SHALL use existing API query parameters and be applied consistently to branch-capable dashboard and detailed-report requests. Audit and pilot-operations reports SHALL remain tenant-wide and display their server-defined scope. Supervisors SHALL NOT receive a client-selected branch filter. Actions unavailable to the current role SHALL not be presented as working actions.

#### Scenario: Supervisor views permitted report types

- **WHEN** a Supervisor opens the detailed report picker
- **THEN** only report types exposed to the Supervisor role are selectable
- **AND** Admin-only reports and actions are not offered as available Supervisor actions

#### Scenario: Admin views authorized report types

- **WHEN** an Admin opens the detailed report picker
- **THEN** audit and pilot-operations reports and materialization-state reporting are available
- **AND** the Admin can use the existing materialization refresh action
- **AND** those Admin-only reports and actions remain unavailable in the Supervisor presentation

#### Scenario: Admin selects a branch while viewing tenant-wide reports

- **WHEN** an Admin has selected a branch and opens Audit or Pilot Operations
- **THEN** the UI reports the tenant-wide scope returned by the existing API
- **AND** it does not imply that those reports were filtered to the selected branch

#### Scenario: Supervisor report response confirms branch scope

- **WHEN** a Supervisor report response includes branch scope metadata
- **THEN** the workspace labels that scope and displays the configured branch name when available
- **AND** it provides the branch identifier when no branch name is available
- **AND** it does not invent a branch name or send a client-selected branch identifier

### Requirement: The Admin reports route uses the shared operational page

The `/admin/reports` route MUST render the same operational overview and detailed report builder as `/supervisor/reports`, with Admin-specific route labels and role-authorized controls. Admin scope SHALL default to the server-authorized tenant scope; an Admin-selected branch filter SHALL be applied to branch-capable overview and detailed-report requests. Audit and pilot-operations remain tenant-wide under their existing API contracts. The selected reporting period SHALL remain shared by the overview and detailed report builder where supported by the selected report.

#### Scenario: Admin opens the shared reports page

- **WHEN** an Admin opens `/admin/reports`
- **THEN** the route shows the period controls, financial overview, daily trend, operational summaries, and detailed report workspace
- **AND** the default report scope is displayed from the server response
- **AND** any selected branch scope is reflected consistently in branch-capable dashboard and detailed-report responses
- **AND** tenant-wide reports retain and label their server-defined tenant scope

### Requirement: Report refresh actions follow role-authorized scope

The Admin presentation SHALL expose audit and pilot-operations reports and the existing Admin materialization refresh action. The Supervisor presentation SHALL continue to hide Admin-only reports and the Admin refresh action. Supervisors MAY request dashboard materialization only for the branch assigned to their authenticated session. The backend MUST derive the branch from that session, reject missing or invalid branch scope, and MUST NOT accept a client-selected branch or tenant-wide refresh scope. Supervisor refresh requests SHALL use the existing durable outbox/materializer pipeline, be audited, idempotent, and rate limited. After acceptance, the dashboard SHALL communicate progress and reload report data when branch materialization completes.

#### Scenario: Admin uses a role-authorized report action

- **WHEN** an Admin selects an audit or pilot-operations report, or requests materialization refresh
- **THEN** the UI invokes the corresponding Admin report endpoint
- **AND** existing Admin authorization, auditing, idempotency, and refresh behavior remain authoritative

#### Scenario: Supervisor refreshes dashboard reports for the assigned branch

- **WHEN** a Supervisor selects Refresh dashboard data
- **THEN** the UI requests a Supervisor dashboard refresh and displays that the refresh is queued or processing
- **AND** the backend derives the branch only from the authenticated Supervisor session and enqueues an audited, idempotent branch-scoped materialization request
- **AND** the dashboard reloads its report data after that branch materialization completes

#### Scenario: Supervisor cannot widen refresh scope

- **WHEN** a Supervisor has no valid assigned branch or attempts to use an Admin refresh/report action
- **THEN** the refresh is rejected without creating a tenant-wide or client-selected branch materialization request

### Requirement: Report loading, empty, and error states are explicit

The dashboard and detailed report workspace SHALL distinguish loading, successful empty data, missing/unmaterialized data, and request failures. A 403 SHALL explain that access is unavailable; a 429 SHALL show a retry countdown and temporarily disable report actions. Error states SHALL display a human-readable title/detail and a copyable request reference when the response contains one. Existing API calls, authorization, and existing report fields SHALL remain unchanged; the explicitly scoped `customerName` and `cashierEmail` fields MAY be added to detailed report rows.

#### Scenario: A report is still loading

- **WHEN** a report request is pending
- **THEN** the affected section presents a loading state
- **AND** actions that would duplicate the in-flight request are unavailable

#### Scenario: An accessible report has no materialized rows

- **WHEN** the API successfully returns no rows or a KPI cannot be calculated from available rows
- **THEN** the UI presents an explicit empty or “No data yet” state
- **AND** it does not substitute a numeric zero

#### Scenario: A report request is forbidden

- **WHEN** an endpoint returns HTTP 403
- **THEN** the affected section explains that the current role cannot access the report
- **AND** it provides a copyable request reference when available

#### Scenario: A report request is rate limited

- **WHEN** an endpoint returns HTTP 429
- **THEN** the UI shows a retry countdown and disables Load, Refresh, and Export actions until the cooldown ends
- **AND** it provides a copyable request reference when available

### Requirement: Current report omits the combined freshness badge

The current report panel SHALL NOT display a badge combining a freshness classification with an expected cadence (for example, “Fresh · Daily snapshot”). Available materialization state and update timestamps SHALL remain visible in report metadata.

#### Scenario: A report includes freshness metadata

- **WHEN** a report response includes materialization state or update timestamps
- **THEN** the metadata remains available in the current report panel
- **AND** no combined freshness-and-cadence badge is displayed beside the report title

### Requirement: Customer and cashier report rows use recognizable identities

Customer-performance rows SHALL include the tenant- and branch-scoped customer's full name when the customer record is available. Cashier-activity rows SHALL include the tenant- and branch-scoped cashier email from the cashier user's email-backed username when that user record is available. The UI SHALL show the name or email instead of the corresponding ID when available and SHALL fall back to the ID when the lookup is unavailable. Existing IDs SHALL remain in the API response for stable identification and export compatibility. Name lookups MUST be constrained to tenant and report branch scope.

#### Scenario: A customer or cashier identity is available

- **WHEN** a customer-performance or cashier-activity row refers to an entity with an available scoped record
- **THEN** the response includes the customer name or cashier email
- **AND** the report table and row-details popup display that readable identity instead of the entity ID

#### Scenario: A customer or cashier identity is unavailable

- **WHEN** a report row's entity record is missing from the authorized lookup
- **THEN** the report continues to include the row
- **AND** the UI falls back to the existing entity ID rather than inventing a name

### Requirement: Detailed report rows are readable and selectable

Loaded report rows SHALL be presented in a responsive table with formatted monetary/date fields and explicit pagination over the loaded result set. Selecting a row SHALL reveal its populated fields in a two-column definition list, not as serialized JSON. Export SHALL be disabled when there are no loaded rows or a report is still loading.

#### Scenario: A report row is selected

- **WHEN** the user selects a row with mouse or keyboard
- **THEN** the row is visibly selected
- **AND** its available fields are shown in a labeled definition list

#### Scenario: Report rows are paginated

- **WHEN** the loaded report contains more rows than the selected page size
- **THEN** pagination controls show the visible range and number of loaded rows
- **AND** pagination does not claim a server total that the API did not provide
