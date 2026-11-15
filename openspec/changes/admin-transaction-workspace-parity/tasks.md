## 1. Plan and API contract

- [x] 1.1 Record GitNexus impact and preserve the existing dirty worktree. Refreshed the index and logged the LOW/MEDIUM findings before drafting; left inherited changes untouched.
- [x] 1.2 Add an Admin-only tenant-scoped transaction search controller/provider without modifying the Supervisor search endpoint or `LoyaltyService`.
- [x] 1.3 Add service tests for Admin authorization, tenant isolation, cross-branch inclusion, filters, and cursor bounds/order.
- [x] 1.4 Add controller role/delegation coverage and regenerate/lint OpenAPI plus generated clients.
- [x] 1.5 Add an optional tenant-safe `branchId` query filter to the Admin contract/service and test forged cross-tenant IDs cannot escape tenant scope.

## 2. Admin workspace

- [x] 2.1 Reuse the Supervisor transaction workspace structure in `/admin/transactions` with the Admin list endpoint and tenant-specific copy.
- [x] 2.2 Preserve Admin Approvals/Fraud/Reports links, existing detail authorization, CSRF/idempotency reversal behavior, and no `Back to admin` link.
- [x] 2.3 Add frontend tests for Admin endpoint selection, table/filter/pagination states, detail dialog, and reversal flow.
- [x] 2.4 Add responsive Playwright coverage for the Admin workspace.
- [x] 2.5 Label the Admin filter-submit action “Apply” while retaining Supervisor search labels.
- [x] 2.6 Load tenant-scoped branch choices in the Admin workspace; add an All branches selector and reset cursor state when branch selection changes.
- [x] 2.7 Test branch filter API parameters and options while preserving the Supervisor filter/search behavior.

## 3. Verify

- [x] 3.1 Run focused backend and web Jest tests. The Admin service/controller tests, existing Supervisor branch-search tests, and Admin/Supervisor workspace tests pass.
- [x] 3.2 Run API/OpenAPI/client checks, web typecheck/lint/build, Prettier, strict OpenSpec validation, and `git diff --check`. Nest/web builds, root/web/client typechecks, OpenAPI export/lint, and targeted changed-source ESLint passed. A temporary valid `TERMII_SENDER_ID` was supplied to local OpenAPI commands; no configuration file was changed.
- [x] 3.3 Run affected Admin Playwright tests and review the final diff for tenant/branch boundaries and unrelated changes. Browser coverage passed at desktop and mobile with no horizontal overflow; the Admin route calls `/api/v1/admin/transactions`. The existing Supervisor route and `LoyaltyService` remain unchanged.
- [x] 3.4 Regenerate the client and rerun Admin service/controller, workspace tests, OpenAPI checks, typechecks, and Admin browser coverage for the branch filter.
