## Design Read

Build a compact supervisor operations overview from the supplied SVGs as design templates, not page content. Preserve the native HTML/CSS hierarchy, restrained red/orange accents, light neutral surfaces, subtle borders, and rounded geometry. The shared application shell already renders navigation and the top bar, so the overview must not embed the full-page PNG or duplicate shell chrome.

## Composition

- Constrain the overview body to the reference's desktop width and retain the existing greeting, right-aligned Open Approvals action, Today's Activity heading, four metric cards, and approvals panel.
- Keep the four cards in one row on desktop and reflow them at tablet/mobile widths. Keep the wide table in its own keyboard-scrollable region to avoid page-level horizontal overflow.
- Populate transaction count, credit issued, and credit redeemed from the latest executive snapshot only when its `reportDate` matches the current business date computed using the snapshot response's `timezone`. Format monetary values from integer kobo.
- Populate pending approvals from the approvals list using `status=PENDING`, a page limit of five, an opt-in server-computed exact count, and a server search query. Do not send a branch ID from the browser; rely on the existing authenticated API scope.
- Apply the normalized search term to the caller-authorized pending approvals query before cursor pagination. Search fields mirror the visible row context: customer name, requester username, reason, receipt/reference, request type, and amount. Keep cursor history associated with the active query; changing the query resets to the first result page, while Previous/Next retain the query. Right-align the pagination status and icon-only Previous/Next controls as one group, with accessible names and server-derived disabled states.
- Distinguish the exact match count from the unfiltered pending count. The metric card always reports the latter; the table summary and page controls report matches for the active query.
- Debounce text input briefly to avoid issuing a request for every keystroke, expose a searching state, and do not present stale rows as matches for a changed query.
- Show the report's `materializedAt` value and state that daily report values are materialized and may lag. A missing row for today is unavailable, not zero and not permission to reuse an older day's figures.
- Table rows use the API's customer name, request amount, requester username, requested time, reason/receipt reference, and a Review link to `/supervisor/approvals`. The complete approvals workflow remains on its dedicated route.
- Remove all hard-coded sample metric values and approval rows. Keep scanner lookup context, shared-shell navigation, and dedicated operational routes unchanged.

## Data and State

- Fetch the report snapshot and approvals list independently on mount and on explicit Refresh. Each section owns its loading, error, and successful empty states so one API failure does not hide the other section.
- Keep prior successful data only if its freshness remains visible when a refresh fails; otherwise show unavailable values. Never infer a zero from a missing report row, omitted count, invalid integer, or failed request.
- The approvals list's exact `totalCount` counts matches after status, authorized scope, and optional search filters. Its exact `scopeTotalCount` counts the same authorized scope and status without search, so filtering does not change the pending metric. Both counts are returned only when requested by the overview.
- The search query is optional, trimmed, length-limited, and applied by the server before cursor pagination and count calculation. Cursor ordering, tenant/branch scoping, status filter, and financial decision behavior remain unchanged.
- Pagination uses existing API `cursor`, `nextCursor`, and `hasMore` fields; no new endpoint, database table, migration, ledger mutation, role change, or production configuration is needed.

## Verification

Check desktop and narrow viewport layout, branch-scope-safe request parameters, report freshness and current business-date matching, exact filtered and unfiltered counts, server search across later pages, cursor request sequences, query reset/retention behavior, independent loading/error/empty states, accessible status/search/table controls, and preserved dedicated approvals behavior. Run focused frontend/backend tests, OpenAPI lint and client generation, typecheck/lint, OpenSpec validation, and `git diff --check`; repeat the responsive browser route verification.
