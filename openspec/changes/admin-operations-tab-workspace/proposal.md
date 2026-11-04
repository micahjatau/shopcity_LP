## Why

The Admin Operations page mixes pilot health, a partial route map, a full reports workspace, generic notes, badges, and navigation back to the Admin root. It duplicates sidebar navigation while omitting several routes and does not provide a clear separation between operational health, reports, and administrative controls.

## What Changes

- Remove the `7 routes`, `Health + reports`, and `Route-backed` badges; the `Back to admin` link; and the `Admin operations at a glance` alert and its route-backed-surface copy.
- Organize `/admin/operations` into three tabs: **Overview**, **Reports**, and **Controls**.
- Make Overview the initial tab and show the existing pilot-health signals there, using the card surface style from the main Admin Overview, omitting the header and per-signal status pills, and applying a readable supporting-text type scale.
- Add an attention summary, last-checked time, and release/Sentry configuration metadata using the existing pilot-operations summary response only; don't synthesize historical chart data.
- Put the existing `ReportsWorkspace` in Reports; it is the reports component already embedded on the Operations page.
- Put route cards for existing Users, Devices, Branches, Audit, and Adjustments pages in Controls.
- Keep the current page URL, shell/sidebar navigation, role authorization, route implementations, and backend contracts unchanged.

## Capabilities

### Modified Capabilities

- `admin-operations-workspace`: Organize the existing Admin Operations surface into clear health, reporting, and controls tabs with accessible navigation to existing workflows.

## Impact

- Frontend: `apps/web/app/(shell)/admin/operations/page.tsx`, a page-local tab/workspace component and styles, the Operations-only `PilotHealthPanel` presentation variant, and focused tests.
- Existing frontend components only: pilot health and the Admin operational reports dashboard.
- No shared navigation changes, route changes, API/schema/auth/backend changes, or financial behavior changes.
