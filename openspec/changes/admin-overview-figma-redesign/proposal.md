## Why

The Admin Overview route currently renders a route directory and generic operations cards. It does not provide the KPI, trend, registration, and activity overview in Figma frame `487:2121` (file `7ijCPWMSg7W3PIK1wewgaN`). Replace only the route content with a responsive, data-backed view that preserves the shell, route, existing API contracts, and authoritative calculations.

## What Changes

- Replace only the content of the `/admin` Overview page with six KPI cards, two 7-day charts, and a Recent activity panel.
- Read current data using existing admin-authorized executive-summary, report materialization-state, approvals, and audit endpoints. Do not change generated clients, backend contracts, or financial/report calculations.
- Add a small action/entity label dictionary for audit activity; unknown actions remain legible via a safe fallback.
- Implement independent loading, empty, unavailable, and error states; use API-provided materialization status/timestamps for freshness context, plus retry/cooldown and responsive/accessibility behavior.
- Clearly indicate unavailable metrics where no existing API provides trustworthy values; do not use Figma sample values.
- Record live-vs-Figma differences, data/API gaps, and open questions in the implementation changelog.

## Capabilities

### Modified Capabilities

- `admin-overview`: Replace the route-directory overview with a Figma-aligned, responsive, read-only operational overview backed by existing authorized data sources.

## Impact

- Frontend: `apps/web/app/(shell)/admin/page.tsx`, a page-local Overview component/style, and focused frontend tests.
- Existing read APIs only: executive summary, report materialization state, pending approvals, and tenant-scoped audit listing.
- No shell behavior, routing, API contract, schema, authorization, backend, financial calculation, or other admin-route changes. A narrowly scoped background-color CSS adjustment is allowed to prevent role-sidebar artwork transparency from filling rounded right corners with the fallback brand color.
