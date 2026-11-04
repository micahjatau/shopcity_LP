## Reference and current-state audit

- Figma: file `7ijCPWMSg7W3PIK1wewgaN`, frame `487:2121` (rendered 1072×702 content frame).
- Reference structure: a row of six 172×121 KPI cards; two 532×300 cards; a 1072×265 Recent activity card with four sample rows. Light surfaces, thin neutral borders, 16px corner radius, Urbanist typography, dark-red KPI values, and red/blue chart lines.
- Current `/admin` content: Admin shell heading, route directory, scope/primary-lanes cards, AdminOperationsPanel. No requested KPI/chart/recent-activity composition.
- Preserve the application shell and navigation; only the route body changes.

## Data mapping and constraints

- KPI cards use report snapshots/rows for active customers, credit issued, credit redeemed, outstanding liability, and use the existing approvals list's exact pending count when available. The seven-day credit-flow cards reuse the Reports page's existing `sumReportField` helper and integer-kobo formatter exactly; do not introduce a new formula or financial calculation. The API does not provide a server-computed period total.
- Active virtual cards have no discovered tenant-wide active-card-count endpoint. Show unavailable, never a guessed/zero value.
- Executive daily summaries expose `registeredCustomers` as a cumulative point-in-time count, not new registrations per day. The chart must label this cumulative snapshot accurately; do not derive deltas or present it as new daily registrations.
- The backend audit endpoint is tenant-scoped and accepts optional `actorId`, but the generated client/OpenAPI contract currently declares `actorId` required. Pass the required empty filter to use the existing tenant feed; do not change generated/API contracts here. The endpoint returns at most 100 rows and has no paging/limit parameter; display only the first four/five and document response-size/pagination as a future contract improvement.
- Executive-summary rows can be sparse; a missing date/value is not an explicit zero. Align the seven-day chart to the requested Lagos business-date window and preserve gaps as missing values, with an accessible data table/tooltip instead of fabricated zeroes.
- Use the existing report materialization-state endpoint to display `materializedAt`/`updatedAt` when present and warn when status is not `COMPLETED`. The API does not provide a report-specific stale boolean or configured threshold, so do not invent one.
- On initial Overview load, request executive summary, tenant materialization state, exact pending approvals (`includeTotalCount=true`), and audit activity once each (four requests). Share only in-flight requests within the mounted hook to avoid duplicate StrictMode calls without caching user data across tenant sessions. Do not automatically retry 429; use `Retry-After` or a 30-second fallback cooldown, disable global refresh while a section is rate-limited, and show a per-section countdown. Refresh a session once after 401 then retry once; make at most one bounded retry on 5xx. No API polling.
- Validate the existing `{ success, data, meta }` success envelope and endpoint payloads at runtime. Normalize failures to a typed ProblemDetails-style error with safe code/title/detail/status/request ID/Retry-After, while tolerating the API's documented error-envelope shape.
- Recent activity action and entity labels are presentation-only. Unknown values use a readable fallback; actor IDs are not presented as human names.

## Responsive/accessibility

- KPI cards adapt from 6 columns to 3/2/1 as space narrows; charts become one column on narrow screens; activity metadata wraps without horizontal page overflow. Chart axes/labels must fit without horizontal page overflow at 320px.
- Use semantic headings, labeled chart summaries/data descriptions, focusable date points with keyboard navigation/tooltips, status/live regions for loading/errors, explicit empty states, keyboard-accessible audit reference disclosure, per-section rate-limit countdowns, visible focus, and reduced-motion-safe transitions.
- Preserve the Figma hierarchy/colors/type scale while using existing ShopCity tokens and project CSS conventions. Figma sample values are never runtime content.

## Out of scope

- Shared shell components/navigation, route changes, any API/OpenAPI/client generation, backend/report materialization, new business calculations, database schema, authorization, changes to other Admin or Supervisor routes. The existing shell stylesheet may receive only a minimal role-sidebar background fix for transparent rounded image corners.
