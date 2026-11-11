# Change: Cashier Find Customer pagination

## Goal

Allow Cashiers to move through every authorized customer result page on the shell's Find Customer route without changing how card verification gates financial actions.

## Scope

- Add Previous/Next pagination to the recent-customer table and directory search results at `/cashier/lookup`.
- Use the existing bounded `GET /api/v1/customers` cursor contract (`limit`, `cursor`, `nextCursor`, `hasMore`); do not add a new endpoint or fetch unbounded customer data.
- Display the current page number without inventing a total page count.
- Match the Cashier Transactions page's existing pagination controls and chevron icons.
- Keep current rows visible if a page request fails and offer a retry for that destination.

## Non-goals

- Do not change customer search semantics, tenant authorization, masked projections, customer profile links, or API contracts.
- Do not make a directory result sufficient for Earn/Redeem. Exact active-card verification remains authoritative.
- Do not change financial records or Cashier Earn/Redeem workflows.

## Acceptance criteria

- Recent and searched customer lists expose cursor-backed pages only when the API indicates a continuation cursor.
- Previous/Next controls have accessible names, match existing Cashier pagination icons, and disable at the first/last page or while loading.
- Changing the search query or submitting a fresh search resets search results to page 1.
- Pagination never displays a fabricated total or exposes customer identifiers.
