## Implementation

- [x] Rebuild the Supervisor overview as native HTML metric cards and a semantic approvals table, using the supplied SVGs as visual references only and retaining scanner context.
- [x] Match the reference's restrained colors, spacing, borders, typography, data hierarchy, and responsive behavior; retain the accessible approvals link to the dedicated route.
- [x] Update focused tests to assert semantic cards/table and responsive behavior.
- [x] Extend the approvals API additively with an opt-in exact pending count and scoped customer/requester display fields; update the OpenAPI contract and regenerate the client.
- [x] Replace illustrative overview metrics and rows with the branch-scoped executive snapshot and five-row pending-approvals page; display report freshness and avoid fabricating unavailable values.
- [x] Add focused API and frontend tests for branch scope, count correctness, loading/error/empty/refresh states, and full-queue search disclosure.
- [x] Update accessibility and workflow-route coverage for the live data behavior.
- [x] Run focused tests, OpenAPI lint and breaking-diff checks, typecheck/lint, OpenSpec validation, and `git diff --check`.
- [x] Verify the live-data route in the local browser preview at port 6767; the targeted responsive Playwright route passed.
- [x] Add cursor-based previous/next controls using five-row pages and preserve the global pending count.
- [x] Update focused tests and route mocks for cursor navigation, current-page search, disabled states, and page transitions.
- [x] Run focused frontend tests/lint/typecheck, OpenSpec validation, and `git diff --check`.
- [x] Verify the paginated overview in the local browser preview; the Supervisor route test passed at port 6767.
- [x] Add an optional bounded search query to the approvals API and filter within tenant/role/branch/status scope before cursor pagination.
- [x] Return the exact filtered result count separately from the unfiltered pending-scope count; update OpenAPI and regenerate the API client using repository CLIs.
- [x] Update the Supervisor overview to debounce global search, reset cursors when the query changes, retain the query while paging, and preserve the global pending metric.
- [x] Add API/UI tests for full-queue matches beyond the initial page, count semantics, authorization scope, query bounds, errors, and no matches.
- [x] Run focused backend/frontend tests, OpenAPI lint, client generation checks, typecheck/lint, OpenSpec validation, and `git diff --check`.
- [x] Verify the full-queue search and pagination in the local browser preview.
- [x] Right-align pagination status and switch Previous/Next controls to accessible icons only.
- [x] Verify right alignment and icon-only control labels at desktop and mobile widths; the focused route test passed.

### Verification Note

`npm run openapi:diff` exits nonzero because `docs/api/openapi.base.json` predates the current API and reports many repository-wide additions, including the already-existing approvals route. Current approvals changes are additive; use `oasdiff breaking` for compatibility validation. The baseline was not rewritten as part of this focused feature.
