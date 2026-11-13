# Change: Admin Device and Branch Management Workflows

## Why

Admin Operations → Controls already links to Devices and Branches, but their dedicated pages are dense management surfaces rather than a consistent browse → create → profile workflow. Device provisioning, branch edits, and device security controls are difficult to find in a directory, and neither resource has a direct per-record profile route. Admins need a predictable Customer-style list table, focused creation form, and navigable profile for each resource.

## Goals

- Make `/admin/devices` and `/admin/branches` searchable, filterable, responsive directories with clear row-level profile navigation.
- Add dedicated creation routes at `/admin/devices/new` and `/admin/branches/new`.
- Add per-record management routes at `/admin/devices/[deviceId]` and `/admin/branches/[branchId]`.
- Reuse current Admin tenant-scoped list/create/update APIs and preserve all device pairing, credential, session-revocation, and audit behavior.
- Keep these route families reachable through Operations → Controls and the Admin shell, without adding duplicate sidebar links.

## Non-goals

- Do not change device pairing protocols, credential handling, POS authentication, branch/device authorization scope, or Supervisor device workflows.
- Do not add branch deletion, branch activation/deactivation, or device reassignment; the current branch update API does not support these operations.
- Do not add new backend endpoints, database fields/migrations, device inventory, or card-stock behavior unless implementation discovery proves the existing contracts insufficient and a separately reviewed scope is approved.
- Do not add separate Devices or Branches entries to the shared Admin sidebar.

## Impact

- Admin device and branch route families and their directory/create/profile presentation.
- Existing Operations → Controls destinations, retained without duplication.
- Existing branch/device APIs are reused: `GET/POST/PATCH /api/v1/branches`, `GET/POST/PATCH /api/v1/devices`, and existing device credential/pairing operations.
- No API, authorization, database, migration, or financial-source-data changes are planned.
