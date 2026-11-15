## Why

Supervisor list tables currently switch to stacked label/value cards on phone widths, unlike the desktop-table treatment now used in Admin. Keeping the same table language on mobile makes records easier to scan and compare while preserving the established workflows.

## What Changes

- Keep Supervisor customer, card, transaction, and flagged-activity tables as tables at narrow widths, with headers and cells visible and horizontal scrolling contained within each table wrapper.
- Preserve usable mobile filters, all desktop styling, existing data/actions, and role authorization.
- Leave already-contained Supervisor report and device credential tables intact.

## Capabilities

### New Capabilities

- `supervisor-mobile-table-parity`: Defines responsive table presentation for Supervisor list workflows.

### Modified Capabilities

- None.

## Impact

- Affected: `apps/web/styles/supervisor-routes.css` and targeted Supervisor browser coverage.
- No API, data, authorization, or dependency changes.
