# Admin Device and Branch Management Specification

## Purpose

Define consistent Admin browse → create → profile workflows for POS devices and branches linked from Operations → Controls, without changing authorization, APIs, or device-security semantics.

## ADDED Requirements

### Requirement: Admins can browse devices and branches from Operations Controls

The Admin Operations → Controls destinations SHALL open `/admin/devices` and `/admin/branches` as searchable, filterable, responsive directories. Each directory SHALL use the Customer/Staff directory presentation conventions, provide a dedicated create action and per-row **View profile** action, and expose loading, empty, request-error, and retry states. Device rows SHALL include name, branch, status, binding/pairing state, and last-seen time. Branch rows SHALL include name, status, timezone, receipt-week start day, and assigned-device count. Search/filter changes SHALL return pagination to the first page. The current array responses MAY be filtered and sliced client-side into five-row pages; the UI SHALL NOT represent the page count as a backend total or cursor guarantee. These routes and their nested paths SHALL remain Admin-authorized through Operations without creating duplicate sidebar links.

#### Scenario: Admin opens a directory

- **GIVEN** an authenticated Admin
- **WHEN** they open Devices or Branches from Operations → Controls
- **THEN** they see only records returned by the existing tenant-scoped endpoint
- **AND** each record has a direct profile link
- **AND** no separate Devices or Branches sidebar link is introduced.

#### Scenario: Admin searches, filters, and pages

- **GIVEN** the authorized directory response has loaded
- **WHEN** an Admin searches or changes a supported status/binding filter
- **THEN** the visible rows match the selected criteria
- **AND** pagination resets to the first page
- **AND** the interface distinguishes an empty result from a failed request.

### Requirement: Admins can create devices and manage their profiles

The dedicated `/admin/devices/new` flow SHALL collect a device name and a required branch selected from the Admin's tenant-scoped branch list. It SHALL use the existing Admin-authorized `POST /devices` operation with CSRF and idempotency protection. The UI SHALL navigate to `/admin/devices/{deviceId}` only after a confirmed response containing a stable ID, and SHALL clearly communicate that a newly created device is unpaired until pairing succeeds. The profile SHALL resolve only a device in the authenticated Admin's existing tenant-wide device-list response and display its branch, status, binding/pairing state, credential state, and available last-seen/account timestamps. It SHALL support device-name updates through the existing update API and retain the existing status, authorized-browser pairing/enrollment, token reset, credential revocation, and legacy HMAC rotation actions and safeguards. A missing or out-of-scope ID SHALL show an unavailable state without leaking another tenant's data.

#### Scenario: Admin registers a device

- **GIVEN** an Admin can access one or more tenant branches
- **WHEN** they submit a device name and selected branch
- **THEN** the existing idempotent device-create operation creates an unpaired device in that branch
- **AND** the browser opens the new profile only after the response includes its ID.

#### Scenario: Admin manages a device

- **GIVEN** an Admin opens an in-scope device profile
- **WHEN** they rename, activate/deactivate, pair, reset, revoke, or rotate a supported credential
- **THEN** the existing endpoint, explicit confirmation where required, authorized target-browser checks, audit, and session-invalidation behavior remain authoritative
- **AND** the refreshed profile reflects confirmed server state.

#### Scenario: Device credential or secret is managed

- **GIVEN** a credential action is available on an in-scope device
- **WHEN** the Admin pairs or rotates/revokes the credential
- **THEN** raw credentials are never placed in URLs, persistent browser storage, logs, or ordinary profile data
- **AND** pairing remains restricted to the authorized target POS browser
- **AND** the one-time legacy HMAC secret, if returned by the existing operation, is transiently disclosed only with secure-provisioning guidance.

### Requirement: Admins can create branches and manage branch profiles

The dedicated `/admin/branches/new` flow SHALL collect a required branch name, timezone, and receipt-week start day constrained to 0–6, using existing defaults where appropriate. It SHALL use the existing Admin-authorized, session-tenant-derived `POST /branches` operation and SHALL navigate to `/admin/branches/{branchId}` only after a confirmed response containing a stable ID. Because the create endpoint does not consume idempotency keys, the UI SHALL prevent concurrent submissions and SHALL refresh the authoritative branch list before offering retry after an ambiguous network failure. The profile SHALL display persisted branch fields and devices associated by `branchId`; it SHALL allow editing only name, timezone, and receipt-week start day through the existing Admin-authorized `PATCH /branches/{id}` operation, with CSRF protection and explicit update confirmation. Because this endpoint does not consume idempotency keys, the UI SHALL prevent concurrent submissions and SHALL refresh authoritative branch state before offering retry after an ambiguous network failure. Branch status and device association SHALL remain read-only because the existing update API does not support changing them. The profile SHALL link to associated device profiles and provide a safe unavailable state for missing/out-of-scope records.

#### Scenario: Admin creates a branch

- **GIVEN** an authenticated Admin
- **WHEN** they submit a valid name, timezone, and week-start day
- **THEN** the existing API creates a branch in the authenticated tenant
- **AND** navigation to its profile occurs only after a confirmed response with its ID
- **AND** after an ambiguous network failure, the UI refreshes the authoritative branch list before enabling retry, rather than claiming server idempotency.

#### Scenario: Admin updates branch configuration

- **GIVEN** the Admin opens a branch profile in their tenant
- **WHEN** they confirm changes to name, timezone, or receipt-week start day
- **THEN** the existing update endpoint persists only those supported fields
- **AND** the profile refreshes with server-confirmed values
- **AND** branch status and assigned-device relationships remain unchanged
- **AND** an ambiguous failure causes the UI to refresh before retry rather than claiming the update was idempotent.

### Requirement: Tenant scope and device-security behavior remain backend-owned

The workflows SHALL use the existing APIs and SHALL NOT trust client-supplied tenant or branch identifiers for authorization. Branch list/create/update operations SHALL remain tenant-scoped and Admin-only. Admin device operations SHALL retain existing tenant-wide scope; Supervisor device routes SHALL retain their existing assigned-branch scope and behavior. The workflows SHALL NOT widen device projections or expose credential material, attestation secrets, fingerprint hashes, or unrelated backend response data. The change SHALL NOT add branch deletion, branch activation/deactivation, or device reassignment.

#### Scenario: Admin opens nested routes directly

- **GIVEN** an authenticated Admin
- **WHEN** they directly open or refresh a device/branch create or profile route
- **THEN** the Admin shell authorizes the route under Operations and displays the requested workflow
- **AND** the shared sidebar gains no duplicate control link.

#### Scenario: Non-Admin requests an Admin route

- **GIVEN** a Cashier or Supervisor session
- **WHEN** they request an Admin device or branch route
- **THEN** Admin route protection denies access
- **AND** backend tenant/branch authorization remains unchanged.
