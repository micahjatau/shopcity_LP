# Design: Admin transaction workspace parity

## Existing behavior

- `/supervisor/transactions` renders `SupervisorTransactionsDashboard` in `apps/web/components/workflows/supervisor-transactions-dashboard.tsx`.
- `GET /api/v1/transactions` is a Supervisor-only receipt-backed search. Both its controller and `LoyaltyService.searchTransactionsByReceipt` enforce Supervisor role and a required session branch.
- `GET /api/v1/transactions/:id` and the reversal endpoint already allow Admin, enforce tenant/read scope, and are used by the Admin transaction-ID workspace.
- `/admin/transactions` currently renders `TransactionWorkspace`, which has an ID lookup, raw detail, reversal preview, and Admin task links.

## API and authorization

- Add `AdminTransactionsController` and `AdminTransactionSearchService` as isolated classes registered in `LoyaltyModule`.
- Add `GET /api/v1/admin/transactions`, guarded by `@Roles(UserRole.ADMIN)`. The service also checks `actor.user.role === ADMIN` and takes `tenantId` only from authenticated request context.
- Query receipt-backed EARN/REDEEM ledger entries with a tenant predicate on both ledger and receipt relations. The Admin scope is tenant-wide by default; when `branchId` is supplied, add it to the tenant-scoped receipt predicate before cursor pagination. Never accept a tenant ID from the client. Keep optional receipt number, status, staff, and minimum receipt purchase filters server-side and before cursor pagination.
- Preserve the current 10-item default, bounded cursor parsing, stable `(effectiveAt desc, id desc)` ordering, response shape, and non-sensitive fields. Staff filter options are tenant-scoped by default and branch-scoped when a branch filter is active. A foreign or nonexistent branch ID must not return data outside the authenticated tenant.
- The separate controller/provider intentionally avoids changing the MEDIUM-impact `LoyaltyService` class and keeps the existing Supervisor endpoint/service contract untouched. Do not modify source financial entries or introduce a migration.
- Describe the new route with OpenAPI decorators and regenerate the OpenAPI/client artifacts using repository scripts.

## Frontend

- Extend the existing transaction workspace presentation component with an `ADMIN` audience and keep the existing `SupervisorTransactionsDashboard` default/callers unchanged.
- Export `AdminTransactionsDashboard` for `/admin/transactions`. Admin uses the new generated Admin search client; Supervisor continues using the existing generated Supervisor search client.
- Load branch choices from the existing authenticated Admin branch-list endpoint. Show an All branches default plus branches returned for the current tenant; do not provide tenant switching. Apply the selected branch together with other filters and reset cursor pagination when it changes.
- Adapt only scope-specific copy/accessible table caption (`tenant` vs `branch`) and API selection. Keep the same filters, result columns, resizers, cursor behavior, dialog lifecycle, verified detail loading, and reversal safeguards.
- Keep Admin Approvals/Fraud/Reports links alongside the refresh action. Do not render an Admin overview self-link.
- Keep financial values in integer kobo at the API boundary; format only for display.

## Verification

- Unit-test the Admin service query for tenant predicates, optional tenant-safe branch restriction, status/staff/minimum filters, cursor order/limits, and Admin-only enforcement.
- Test the Admin controller's Admin-role metadata and parameter delegation; preserve Supervisor query and branch tests.
- Regenerate OpenAPI/client; lint the contract and typecheck the generated client.
- Add frontend tests proving Admin calls its endpoint, preserves task links, renders the complete workspace, and keeps Admin detail/reversal protections.
- Add Playwright checks at desktop and mobile for the Admin route, filter/table structure, dialog/reversal flow, and no page-level overflow.
