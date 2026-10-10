# Design: Supervisor issued-card directory

## Existing architecture

`/supervisor/cards` renders `SupervisorCardWorkflows`, whose URL-selected tasks currently show Assign card or the Issued cards directory. No collection API or cards method exists in the web client. The existing management lookup is read-only and tenant-scoped, but only accepts a serial and cannot safely enumerate cards. The customer profile route currently accepts only the return-search query; its Virtual Card tab is local component state.

## Decisions

- Keep `/supervisor/cards` and the Assign card workflow. The issued-card directory is the default and has no Issued cards navigation button. A red primary Assign card action opens the existing assignment workflow in a controlled popup without changing the route. Direct `tab=assign` remains supported by opening that popup; legacy `tab=manage`, `tab=issued`, absent, and unsupported task values resolve to the directory.
- Add `GET /api/v1/cards/management/issued?limit=&cursor=&q=&status=&issuedFrom=&issuedTo=` for Supervisor/Admin only. Always pass `tenantId` from authenticated request context; accept no tenant selector. Return all previously issued ACTIVE, BLOCKED, and REPLACED cards, ordered by `issuedAt DESC, id DESC`. Apply optional case-insensitive card-number/owner-name search, exact lifecycle status, and inclusive date-only issue-date range in `SHOPCITY_TIMEZONE` before cursor pagination. Use the shared bounded cursor utilities, with a default page size of 25 and maximum 100.
- Keep the response allowlist small: `items: [{ cardNumber, status, issuedAt, customer: { id, fullName } }]`, `nextCursor`, and `hasMore`. Do not return card/customer internal IDs except the stable customer ID required for the profile link, or any phone, email, balance, tenant, actor, or audit fields. No database/schema migration or lifecycle write is needed.
- The toolbar replaces the Issued cards title: search and status filters are on the left; a two-month issue-date range calendar popover and Assign card action are on the right. Changing a filter fetches a new first page; continuation requests retain the active filters. On tablet/mobile, collapse search behind a search-icon toggle and reveal the input on demand.
- The table starts with an authoritative page request, renders accessible loading/empty/retryable error states, and appends continuation pages through Load more. Keep existing rows on continuation failure and avoid duplicates. Match the Customers directory by reusing its table/wrapper classes and responsive data-label layout; put View card last and use distinct status badge tones for ACTIVE, BLOCKED, and REPLACED.
- A row's View card link navigates to `/supervisor/customers/{customerId}?tab=virtual-card`. The profile route maps the supported `virtual-card` query to its local Virtual Card selection; absent or invalid tabs default to Overview. The customer profile still fetches and verifies the profile projection for the stable ID before showing card details. Query data only chooses presentation; it does not supply card identity or status. The Virtual Card graphic omits the decorative chip element.
- Preserve the existing per-serial management lookup and lifecycle actions in the in-profile management dialog. The issued inventory itself remains read-only. The assignment popup retains the existing eligibility dialog as a second step; Escape closes only the topmost eligibility dialog before the assignment popup.

## Data and ordering

The card table queries `Card` with `tenantId` from session and `status IN (ACTIVE, BLOCKED, REPLACED)`. Select only `barcodeValue`, `status`, `issuedAt`, and the related customer's `id` and `fullName`; map `barcodeValue` to the API's `cardNumber`. Cursor order is issue time descending with ID descending as tie-breaker. Decode and validate both cursor components, and apply an issue-time/ID keyset predicate so cursor pagination does not depend on exposing a database ID or require the prior row to remain present.

## Verification

- Service/controller tests cover ACTIVE/BLOCKED/REPLACED inclusion, filtered search/status/date queries, authenticated tenant scoping, field minimization, stable cursor ordering, bounded limits, and invalid cursors/date ranges.
- HTTP integration tests cover Supervisor/Admin authorization and Cashier/unauthorized denial for the new route, lifecycle statuses, filters, pagination, tenant isolation, and unchanged cashier serial lookup.
- Frontend tests cover default/assigned task tabs and legacy `tab=manage`, initial/continuation loading, empty/error/retry states, append behavior, row fields, stable-ID View card URLs, and profile selection from `tab=virtual-card` after authoritative identity verification.
- Regenerate OpenAPI and the generated client with repository scripts. No generated artifact is hand-edited.
