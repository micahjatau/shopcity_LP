## Why

Supervisors currently have to know an individual card serial to inspect or manage a card. A tenant-scoped issued-card directory gives them an at-a-glance inventory and a stable route from a card row to its owner's verified Virtual Card profile tab.

## What Changes

- Replace the Cards route's Manage cards workspace with a default issued-card table, remove the Issued cards navigation button, and keep Assign card available through a red primary action.
- Add a read-only, Supervisor/Admin-only, tenant-scoped cursor-paginated API for previously issued ACTIVE, BLOCKED, and REPLACED cards, with stable owner ID, owner name, number, status, issue date, search, status, and issue-date filters.
- Match the Customers page table's responsive styling, place View card last, color-code every lifecycle status, add card/owner search plus status and inclusive issue-date filters, and collapse search behind an icon on tablet/mobile; retain loading, empty, retryable error, and Load more states.
- Add a View card action that opens the owner's stable-ID profile with Virtual Card selected, including support for direct load/reload of that tab.
- Open Assign card in a popup without navigating away, preserve the existing protected assignment lifecycle, and remove the decorative chip graphic from the profile's Virtual Card preview.

## Capabilities

### New Capabilities

- `supervisor-issued-card-directory`: defines the Cards route table, API authorization/data scope, card status inclusion, and profile deep link.

### Modified Capabilities

- `bounded-list-endpoints`: add stable bounded cursor pagination requirements for the issued-card collection.

## Impact

- Backend: `CardsController` and `CardsService`, using existing tenant context, roles, Card records, and cursor pagination; no schema migration.
- API contract: OpenAPI and generated TypeScript client, regenerated using repository CLIs.
- Frontend: Supervisor Cards route/workflow, customer profile route/query handling, profile tab selection, and focused tests.
