## Purpose

Give Supervisors and Admins a tenant-scoped inventory of previously issued cards in ACTIVE, BLOCKED, and REPLACED states, with search and filters plus an authoritative route to each owner's Virtual Card profile.

## ADDED Requirements

### Requirement: Supervisor Cards opens an issued-card directory

The Supervisor Cards route MUST display the issued-card directory by default without an Issued cards navigation button. A red primary Assign card action MUST open the existing assignment workspace; that workspace MUST provide a Back to cards action. Direct `?tab=assign` navigation MUST continue to open assignment, while legacy `?tab=manage`, `?tab=issued`, absent, and unsupported task values MUST show the directory. The directory MUST include columns in this order: Card number, Owner, Status, Date issued, and View card. It MUST include previously issued ACTIVE, BLOCKED, and REPLACED cards. The table MUST follow the Customers directory table styling and responsive layout, with a search field and status filter on the left and a date-issued range picker and Assign card action on the right. The date picker MUST open an accessible two-month calendar popover and show the selected range. On tablet and mobile widths the search field MUST be collapsed behind a search-icon button until requested. Assign card MUST open an assignment popup without navigating away; direct `?tab=assign` links MUST continue to open that popup. ACTIVE, BLOCKED, and REPLACED statuses MUST each have distinct status colors.

#### Scenario: Supervisor opens Cards from navigation

- **WHEN** an authorized Supervisor opens `/supervisor/cards` without a task tab
- **THEN** the issued-card table is shown without an Issued cards navigation button
- **AND** a red primary Assign card action is available.

#### Scenario: Supervisor opens assignment from the Cards directory

- **GIVEN** the Supervisor is viewing the issued-card directory
- **WHEN** they activate Assign card
- **THEN** the existing assignment workflow opens in a popup without changing the route
- **AND** closing the popup returns focus to the Assign card action.

#### Scenario: Issued card rows show authoritative fields

- **GIVEN** the tenant has previously issued ACTIVE, BLOCKED, and REPLACED cards
- **WHEN** a page of the directory is rendered
- **THEN** each row shows the authoritative card number, owner's name, distinctly color-coded status, issue date, and View card action as the final column
- **AND** the table follows the Customers directory table's styling and responsive layout
- **AND** each action uses the owner's stable customer ID rather than the displayed name.

#### Scenario: Directory has no active or blocked cards

- **GIVEN** the authenticated tenant has no issued cards in ACTIVE, BLOCKED, or REPLACED state
- **WHEN** the directory loads
- **THEN** it displays a truthful empty state.

### Requirement: Issued-card inventory is tenant-scoped and authorized

The issued-card collection endpoint MUST require SUPERVISOR or ADMIN authorization and derive tenant scope exclusively from authenticated context. It MUST return ACTIVE, BLOCKED, and REPLACED card records for that tenant, with card number, status, issued timestamp, and customer stable ID/name. It MUST support optional card-number/owner-name search, status selection, and inclusive issue-date range filters before pagination. It MUST NOT return customer phone/email, balances, audit/internal actor details, or data from another tenant. The endpoint MUST be read-only and MUST NOT change card lifecycle state.

#### Scenario: Authorized caller lists tenant cards

- **GIVEN** an authenticated Supervisor or Admin
- **WHEN** they request an issued-card page
- **THEN** the response contains only the authenticated tenant's ACTIVE, BLOCKED, and REPLACED cards matching the filters, with the documented minimal fields
- **AND** the request cannot select a different tenant.

#### Scenario: Unauthorized role requests cards

- **WHEN** a role other than Supervisor or Admin requests the issued-card collection
- **THEN** the server denies access and returns no card or customer data.

#### Scenario: Previously issued cards remain visible in every lifecycle state

- **GIVEN** the tenant has ACTIVE, BLOCKED, and REPLACED card records
- **WHEN** the issued-card collection is queried without a status filter
- **THEN** all three statuses are returned with the authoritative status value.

### Requirement: Issued-card search and filters apply before pagination

The directory MUST search card number and owner name, filter by any supported card status or all statuses, and filter by an inclusive issue-date range. Date-only range values MUST be interpreted using `SHOPCITY_TIMEZONE`. Changing a filter MUST reload the first page; continuation pages MUST retain the same filters and stable ordering. Filter controls MUST remain available alongside the search field and Assign card action.

#### Scenario: Search and status filters

- **WHEN** a Supervisor searches by card number or owner name and selects a status
- **THEN** matching cards of the selected status are displayed across cursor pages.

#### Scenario: Responsive search control

- **GIVEN** the directory is displayed at tablet or mobile width
- **THEN** the search field is collapsed behind a search-icon button
- **WHEN** the Supervisor activates the search icon
- **THEN** the search field is revealed and usable.

#### Scenario: Date-issued range filter

- **WHEN** a Supervisor sets an issue-date start and/or end date
- **THEN** only cards issued within the inclusive `SHOPCITY_TIMEZONE` calendar-date range are displayed, with the date filter applied before pagination.

### Requirement: Virtual Card preview remains free of decorative chip graphics

The profile's Virtual Card preview MUST NOT render a decorative chip element.

#### Scenario: Verified Virtual Card preview has no chip graphic

- **GIVEN** a Supervisor opens a verified customer's Virtual Card tab
- **THEN** the preview shows the owner name and card number without a decorative chip element.

### Requirement: Directory pagination and states remain complete

The issued-card table MUST load bounded cursor pages in stable issue-date-descending and card-ID-descending order and provide a way to load subsequent pages until all matching records are available. It MUST show truthful loading, empty, retryable error, and end-of-list states; a failed page request MUST NOT be presented as a successful empty result.

#### Scenario: More issued cards are available

- **GIVEN** more cards exist than fit in the current page
- **WHEN** the page loads
- **THEN** it returns bounded results with a continuation cursor and the UI offers Load more
- **AND** loading later pages appends unique cards in stable order.

#### Scenario: A page request fails

- **WHEN** the initial or continuation request fails
- **THEN** the UI announces a retryable error and preserves any previously loaded rows.

### Requirement: View card opens the owner's Virtual Card profile tab

Each directory row's View card action MUST navigate to the profile identified by the row's stable owner ID and request the Virtual Card tab using `tab=virtual-card`. The profile MUST select that tab on direct navigation and reload only after fetching and verifying the authoritative profile for the requested customer ID. Invalid or unsupported tab query values MUST fall back to Overview. The tab query MUST NOT supply card identity, status, or other authoritative data.

#### Scenario: View card follows the correct owner

- **GIVEN** a directory row has an owner stable ID
- **WHEN** the Supervisor activates View card
- **THEN** the matching owner's stable-ID profile route opens with `tab=virtual-card`
- **AND** the profile reloads authoritative card data for that owner before rendering the card.

#### Scenario: Virtual Card deep link is loaded directly

- **WHEN** the profile is opened or reloaded with `tab=virtual-card`
- **THEN** Virtual Card is selected after the requested customer's profile is verified
- **AND** invalid tabs fall back to Overview without trusting query values as profile data.
