# Admin Operations Workspace Specification

## Purpose

Define the tab structure, control destinations, and Admin navigation behavior of the existing Admin Operations route without changing its route, authorization, APIs, or dedicated workflows.

## ADDED Requirements

### Requirement: Admin Operations separates health, reports, and controls into tabs

The `/admin/operations` page MUST present the tabs **Overview**, **Reports**, and **Controls**, with Overview selected on initial entry. It MUST NOT show the removed static route/health badges, the `Back to admin` link, or the `Admin operations at a glance` alert/copy. In the Operations Overview panel, it MUST omit the pilot-health header and per-signal status pills. The panel heading MUST use a 16px type size; signal labels MUST use a consistent 12px type size; numeric values MUST use a clear 20px emphasis; and signal detail text and panel subtitle MUST use 12px regular text, a 1.45 line height, and readable secondary gray. It MUST show a `Needs attention` summary from known current API counts, the server-provided `generatedAt` timestamp, and available release metadata. Missing values MUST remain unavailable, not be presented as zero. The route, API contract, Admin role authorization, and dedicated workflows MUST remain unchanged.

#### Scenario: Admin opens Operations

- **WHEN** an authorized Admin opens `/admin/operations`
- **THEN** Overview is the selected tab
- **AND** the existing pilot-health card is shown in the Overview panel
- **AND** the outer health card matches the main Admin Overview panel surface (white, thin neutral border, 16px radius, no shadow)
- **AND** each health signal tile matches the main Admin Overview metric card surface (white, thin neutral border, 16px radius, no shadow)
- **AND** the pilot-health header and signal tiles contain no status pills
- **AND** the panel subtitle and signal detail text use 12px regular type, 1.45 line height, and `#676767` secondary text
- **AND** the attention summary reports only active conditions from known signal counts and identifies unknown signals as unavailable
- **AND** the timestamp uses the response's `generatedAt` value, and release version, SHA, and the Sentry DSN configuration state are labeled as configuration metadata
- **AND** Sentry metadata says whether a DSN is configured, not whether events are currently being received or processed
- **AND** no historical graph is shown from this point-in-time response
- **AND** hidden Reports and Controls content is not mounted before the user selects those tabs
- **AND** none of the removed badges, link, alert, or alert copy is shown.

#### Scenario: Other health-panel callers keep their default card styling

- **WHEN** `PilotHealthPanel` is rendered outside the Operations Overview without the optional card-surface variant
- **THEN** its existing default card styling, status pills, and subtext typography are retained
- **AND** Operations-only attention, timestamp, and release details are not added to that caller.

#### Scenario: Admin selects Reports

- **WHEN** an Admin selects the Reports tab
- **THEN** the existing `ReportsWorkspace` keeps its current Operations layout and is rendered within the established Reports-page style scope
- **AND** current-report status/filter context is combined with the summary items in one result surface rather than a separate current-report card
- **AND** summary items are presented in a semantic, paginated table using up to six populated, report-specific columns with human-readable headers and correctly formatted values, and selecting a row opens its existing detail information in a dialog with an accessible close button
- **AND** the dialog can also be dismissed with Escape or the backdrop, and there is no separate selected-item card
- **AND** the combined card is titled **Summary items**, with accurate filter context shown as supporting subtext rather than a separate **Current filters** alert
- **AND** status copy uses human-readable report names rather than internal report keys
- **AND** the card and dialog headings use the existing 16px Reports heading style, while filter subtext, table labels, and dialog table content use the Reports page's smaller supporting type scale
- **AND** numeric table values are right-aligned with tabular numerals, text/date values remain left-aligned, and wide tables scroll horizontally at narrow viewports
- **AND** the Load report primary button uses the sidebar-matched red-orange gradient, while other report actions and filters use the Supervisor Reports pill-shaped button/control treatment
- **AND** report status badges are omitted from this Operations-tab presentation
- **AND** its branch filter is a dropdown populated from the authenticated Admin's tenant-scoped branch list, with **All branches** as the default
- **AND** selecting a branch applies that branch's ID and configured timezone to reports that support branch scope, without exposing editable Branch ID or Timezone text fields
- **AND** audit and pilot-operations summary reports retain their existing tenant-wide behavior
- **AND** **All branches** omits branch and timezone overrides, preserving the tenant-wide default scope
- **AND** the Operations date filter offers **All dates**, **Last 7 days**, **Last 30 days**, and **Custom dates** using the Supervisor Reports period-button treatment, with a responsive select on narrow viewports
- **AND** **All dates** is initially selected and sends no date override, preserving the existing default report window
- **AND** the 7-day and 30-day presets calculate their date range in the selected branch timezone, or the Supervisor Reports default timezone when **All branches** is selected
- **AND** custom From/To inputs appear only for **Custom dates**, require a valid inclusive range before applying, and keep other report callers' existing From/To behavior unchanged
- **AND** a branch-list failure is reported honestly and does not invent branch options
- **AND** the dedicated Admin and Supervisor Reports routes remain unchanged
- **AND** other ReportsWorkspace callers retain their existing card-based summary and selected-item presentation unless they explicitly opt in.

#### Scenario: Admin opens Controls

- **WHEN** an Admin selects Controls
- **THEN** the panel provides links to `/admin/users`, `/admin/devices`, `/admin/branches`, `/admin/audit`, and `/admin/adjustments`
- **AND** each link displays a recognizable icon appropriate to its destination
- **AND** each link opens its existing dedicated workflow without embedding or duplicating its mutation form on the Operations page.

#### Scenario: Admin follows a Controls link

- **GIVEN** an authenticated Admin
- **WHEN** the Admin follows any Controls link to its dedicated route
- **THEN** the selected page remains at that route and is not redirected to the Admin overview
- **AND** the Admin shell recognizes the route under Operations without adding a separate sidebar link
- **AND** the route remains unavailable to Cashier and Supervisor sessions

### Requirement: Admin Control destinations are consolidated under Operations

The Admin sidebar MUST NOT contain separate links to Users, Devices, Branches, Audit, or Adjustments because those destinations are available under Operations → Controls. The Operations sidebar entry and the dedicated routes MUST remain available.

#### Scenario: Admin opens a control workflow from Operations

- **GIVEN** an authorized Admin
- **WHEN** the Admin opens Operations → Controls
- **THEN** the Users, Devices, Branches, Audit, and Adjustments destinations remain available there
- **AND** the Admin sidebar contains no separate links to those five destinations
- **AND** their direct routes and role authorization remain unchanged.

#### Scenario: Admin navigates tabs with a keyboard

- **WHEN** a keyboard user focuses the Operations tab list
- **THEN** each tab exposes its selected state and controls a labeled tab panel
- **AND** ArrowLeft/ArrowRight move focus and selection between tabs with wraparound
- **AND** Home/End select the first/last tab
- **AND** only the active tab is in the sequential keyboard tab order.
