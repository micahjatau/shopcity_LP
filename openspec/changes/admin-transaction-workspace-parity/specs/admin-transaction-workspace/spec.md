# Admin transaction workspace (delta)

## ADDED Requirements

### Requirement: Admin transaction listing is tenant-scoped

The API MUST provide a cursor-paginated transaction search for authenticated Admin users. It MUST derive the tenant from the authenticated session, include receipt-backed earn and redeem entries across that tenant's branches by default, and apply the supported optional branch, receipt, status, staff, and minimum-purchase filters before pagination. A supplied branch ID MUST be constrained by the authenticated tenant predicate and MUST NOT expose another tenant's data. The API MUST NOT accept a client-supplied tenant ID. Only Admin users may call this Admin listing contract. The existing Supervisor listing MUST remain Supervisor-only and scoped to the session branch.

#### Scenario: Admin lists tenant transactions

- **GIVEN** an authenticated Admin in a tenant with transaction receipts across multiple branches
- **WHEN** the Admin requests a transaction page without a receipt filter
- **THEN** the response contains only receipt-backed earn/redeem entries belonging to that Admin's tenant
- **AND** it may include entries from every branch in that tenant unless a branch filter is supplied
- **AND** a supplied branch filter returns only that tenant's branch entries
- **AND** cursor, branch, status, staff, and minimum receipt amount filters remain bounded and are applied server-side
- **AND** the response exposes only the existing search fields and no customer phone or card serial.

#### Scenario: Admin narrows results to one tenant branch

- **GIVEN** an authenticated Admin and a branch returned by the Admin's tenant-scoped branch list
- **WHEN** the Admin applies that branch filter
- **THEN** only matching receipts from that branch are returned
- **AND** the server still applies the authenticated tenant predicate before pagination
- **AND** a forged branch ID from another tenant cannot disclose transactions from that tenant.

### Scenario: Non-Admin cannot use the Admin listing

- **GIVEN** an authenticated user without the Admin role
- **WHEN** they call the Admin transaction listing
- **THEN** the route rejects the request
- **AND** the service independently rejects a non-Admin actor.

#### Scenario: Supervisor branch search remains isolated

- **GIVEN** an authenticated Supervisor with a session branch
- **WHEN** the Supervisor uses the existing transaction search route
- **THEN** results and staff options remain limited to that session branch
- **AND** the new Admin route does not grant tenant-wide access to the Supervisor endpoint.

### Requirement: Admin uses the complete transaction workspace

The `/admin/transactions` page MUST provide the Supervisor transaction workspace structure: a Transactions header and refresh action; branch, receipt, status, staff, and minimum-amount filters; an Admin filter-submit action labeled “Apply”; loading, empty, error, and result messaging; a resizable six-column transaction table; cursor pagination; and an accessible transaction-detail dialog with authoritative detail, timeline, and reversal request controls. The Admin page MUST use the Admin tenant-scoped listing contract rather than the Supervisor branch-scoped contract. Branch choices MUST come from the existing tenant-scoped Admin branch API and default to All branches; the page MUST NOT provide tenant switching.

#### Scenario: Admin searches and pages tenant transactions

- **GIVEN** an authorized Admin opens `/admin/transactions`
- **WHEN** the page loads, filters are applied, or the Admin moves between result pages
- **THEN** the page uses the Admin tenant-scoped list endpoint and cursor pagination
- **AND** the branch filter defaults to All branches and can select only a branch returned for the current tenant
- **AND** the header, filters, table, loading/empty/error states, and pagination match the Supervisor workspace structure
- **AND** tenant scope is derived only by the server from the authenticated Admin session.

#### Scenario: Admin inspects and requests a reversal

- **GIVEN** an Admin selects a result row
- **WHEN** the detail dialog opens
- **THEN** it fetches authoritative detail through the existing transaction-detail contract and verifies the selected transaction identity
- **AND** Admin-allowed reversal remains available only after detail loads, a reason is supplied, and the user types `REVERSE`
- **AND** the reversal request retains CSRF protection and an idempotency key
- **AND** the original transaction remains immutable and the current list/detail refresh after a confirmed reversal.

#### Scenario: Admin task navigation remains available

- **GIVEN** an Admin is on `/admin/transactions`
- **WHEN** the transaction header is rendered
- **THEN** useful links to Admin Approvals, Fraud, and Reports remain available
- **AND** no redundant `Back to admin` self-link is rendered.

#### Scenario: Workspace remains usable on narrow screens

- **GIVEN** an Admin views the transaction workspace on tablet or mobile
- **WHEN** the table and detail dialog are rendered
- **THEN** the workspace remains responsive, avoids page-level horizontal overflow, and retains accessible search, pagination, close, and dialog behavior.
