## Why

The Supervisor issued-card table currently appends every fetched cursor page behind a Load more button, so the table grows without a clear page boundary and does not match the Supervisor transactions workflow. Supervisors need the same compact Previous / Page N / Next navigation while retaining server-authoritative cursor ordering and filters.

## What Changes

- Replace Load more with accessible Previous and Next controls and a live `Page N` indicator.
- Render one bounded 25-card cursor page at a time; preserve a cursor stack so previous pages can be requested with the active filters.
- Keep the current page visible if navigation fails and provide a retry for the failed page request.
- Reset navigation to page 1 when search, status, or issue-date filters change.

## Capabilities

### Modified Requirements

- `supervisor-issued-card-directory`: replace Load more interaction with cursor-backed page navigation while preserving the existing endpoint, filter semantics, stable order, loading/error states, and bounded page size.

## Impact

- `apps/web/components/workflows/supervisor-issued-card-directory.tsx` and its focused card-management tests.
- Scoped styles in `apps/web/styles/supervisor-routes.css`, reusing the Supervisor transactions pagination treatment.
- No API, database, generated-client, authorization, or card-lifecycle changes.
