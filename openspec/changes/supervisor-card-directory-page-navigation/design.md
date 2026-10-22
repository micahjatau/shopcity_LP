## Context

The issued-card directory already loads bounded API cursor pages of 25 records and exposes a Load more action that appends unique records. The Supervisor transactions table uses a cursor stack with Previous / Page N / Next controls. The cards directory should use the same navigation affordance without changing its generated API contract or filter scope.

## Goals / Non-Goals

**Goals:**

- Display one API cursor page at a time with Previous, Page N, and Next controls styled like Supervisor transactions pagination.
- Keep cursor navigation bounded and preserve the active search, status, and issue-date filters for every request.
- Keep the currently displayed page and page number when a navigation request fails; let the user retry that same destination.
- Reset to page 1 when the effective filters change.

**Non-Goals:**

- No backend pagination, endpoint, or generated-client changes.
- No total-count query, page-size selector, card lifecycle, or row-content changes.
- No changes to Admin card behavior or other Supervisor tables.

## Decisions

- Keep a stack of cursors for the start of each visited page and a zero-based page index, following the transactions dashboard pattern. The first request continues to use an empty cursor.
- Store only the currently displayed response page in the table. A successful Previous/Next request replaces the page rows and updates the cursor stack, next cursor, and page number together.
- Do not advance the visible page until its request succeeds. On failure, retain the current rows and page indicator and show an inline retry action for the failed destination.
- Reuse `.supervisor-transaction-pagination` and button/status classes for the visible control treatment, with a scoped Cards container rule for alignment and keyboard focus.
- Keep Previous disabled on page 1; disable both navigation buttons while the initial/page request is in flight; disable Next when there is no continuation cursor.

## Risks / Trade-offs

- [A cursor page can fail while moving forward or backward] → Keep the current page, announce the failed navigation, and retry the stored target cursor.
- [A filter change could reuse a cursor from another result set] → Reset the cursor stack and page index whenever effective filters change.
- [No total count exists] → Show only `Page N`; do not invent a total.

## Migration Plan

Deploy as a client-only UI change. The existing cursor endpoint and its stable ordering remain unchanged; rollback by reverting the scoped component, style, and test changes.
