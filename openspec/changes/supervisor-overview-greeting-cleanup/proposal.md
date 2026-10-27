## Why

The Supervisor overview currently duplicates every shell navigation destination, adds explanatory cards, and mounts approvals, fraud, and report workspaces on the landing route. This makes the page noisy and places operational actions in multiple locations. Supervisors already have persistent shell navigation and dedicated routes for those jobs.

## What Changes

- Replace the “Supervisor workspace” heading with a cashier-style `Hi, Supervisor!` greeting and concise welcome copy.
- Remove overview-only route cards, guide/review cards, and embedded approvals, fraud, and report workspaces.
- Keep the shell navigation, scanner lookup context, and all dedicated operational routes and their authorization/behavior unchanged.
- Add focused tests proving the overview is minimal and operational workflows remain available on their existing routes.

## Capabilities

### New Capabilities

- `supervisor-overview`: Defines the lightweight greeting-led Supervisor landing page and its non-goals.

### Modified Capabilities

None. Existing operational route capabilities remain unchanged.

## Impact

- `apps/web/app/(shell)/supervisor/page.tsx` and targeted frontend tests.
- No API, backend, database, RBAC, or operational workflow changes.
