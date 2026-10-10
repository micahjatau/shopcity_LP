## 1. Define issued-card collection contract

- [x] 1.1 Add a Supervisor/Admin read-only, authenticated-tenant collection endpoint returning previously issued cards in ACTIVE, BLOCKED, and REPLACED states with stable owner ID/name and minimal fields.
- [x] 1.2 Implement bounded, stable cursor pagination ordered by issue time descending then ID descending; validate cursors and limits.
- [x] 1.3 Add service/controller tests for response allowlist, tenant scope, status inclusion/exclusion, pagination, and malformed cursors.
- [x] 1.4 Add HTTP authorization/tenant/pagination tests, preserve existing lookup behavior, and regenerate OpenAPI and client with repo CLIs.

## 2. Restructure Supervisor Cards route

- [x] 2.1 Replace Manage cards with the default Issued cards tab; keep Assign card; accept legacy `tab=manage` as an Issued cards alias.
- [x] 2.2 Implement the issued cards table with Card number, Owner, Status, View card, and Date issued columns using the generated endpoint.
- [x] 2.3 Implement truthful loading, empty, retryable initial/continuation errors, and Load more while preserving rows and avoiding duplicates.
- [x] 2.4 Link View card using stable customer ID to the profile `tab=virtual-card` deep link.
- [x] 2.5 Test directory columns, API calls, statuses, loading/empty/retry/pagination, tab defaults/legacy URL, and profile link target.

## 3. Support the profile Virtual Card deep link

- [x] 3.1 Read `tab=virtual-card` on the stable-ID customer profile route and initialize the Virtual Card tab; use Overview for missing/invalid values.
- [x] 3.2 Keep profile and card identity sourced from the authenticated, same-ID verified APIs, not URL values.
- [x] 3.3 Test direct load/reload, invalid tab fallback, and stable customer identity verification before rendering Virtual Card.

## 4. Verify and close

- [x] 4.1 Run focused backend and frontend tests, lint, typecheck, OpenSpec validation, and `git diff --check`.
- [x] 4.2 Review only task-owned diff and preserve all existing dirty/untracked paths; run GitNexus detect-changes before any commit.

## 5. Refine Cards directory navigation and table styling

- [x] 5.1 Remove the Issued cards navigation button; keep the directory as default and make the existing assignment workspace reachable through a red Assign card action with a Back to cards return action.
- [x] 5.2 Reuse Customers table styling and responsive layout, move View card to the last column, and color-code Active/Blocked status using existing badges.
- [x] 5.3 Update focused unit and route coverage; run frontend tests, lint/typecheck, strict OpenSpec validation, formatting, and `git diff --check`.

## 6. Add historical card visibility and directory filters

- [x] 6.1 Include REPLACED cards in the tenant-scoped issued-card API and document all ACTIVE, BLOCKED, and REPLACED statuses.
- [x] 6.2 Add validated API search, status, and inclusive issue-date filters; preserve filters across cursor pagination and regenerate OpenAPI/client artifacts.
- [x] 6.3 Add left-side search/status controls and right-side date range/Assign card controls; remove the Issued cards heading and color-code all status values.
- [x] 6.4 Add service/controller/UI tests for replaced-card inclusion, filters, pagination, and status colors; run relevant verification.

## 7. Polish the date, assignment, and responsive card controls

- [x] 7.1 Replace native issue-date fields with an accessible two-month calendar range popover that updates the existing filtered API query.
- [x] 7.2 Open Assign card in a controlled popup without navigating away; keep direct `?tab=assign` compatibility and ensure Escape closes the topmost eligibility dialog first.
- [x] 7.3 Collapse the search input behind a search-icon button on tablet and mobile, revealing it on demand.
- [x] 7.4 Remove the decorative chip graphic from the Virtual Card preview and update focused tests/spec verification.
