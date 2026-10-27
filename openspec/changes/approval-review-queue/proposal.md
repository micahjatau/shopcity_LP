# Change: Approval review queue and decision dialog

## Why

The Supervisor and Admin approval panels currently mix selected-record details and decision controls inline, render only a subset of records, and filter only the current cursor page. Staff need a complete, paginated approval queue with clear pending/history views and a focused review dialog before recording a decision.

## What Changes

- Present approval records in a clean, paginated list; clicking a record opens an accessible dialog with transaction/approval context and approve/reject controls.
- Require an explicit decision reason selected from sensible presets; allow an optional concise note where supported by the current string reason contract.
- Add server-side status filtering for pending, approved/executed, and rejected approvals, preserving tenant/branch authorization and cursor pagination.
- Add refresh to retrieve newly submitted approvals, and reset cursor state whenever filters/page size change.
- Preserve existing CSRF, idempotency, decision endpoint, and backend policy checks. Do not alter financial effects or approval authority.
- Apply to both Supervisor and Admin because both routes share `ApprovalsPanel`.

## Capabilities

### New Capabilities

- `approval-review-queue`: Role-authorized staff can browse, filter, refresh, paginate, inspect, and decide approval records.

### Modified Capabilities

- `bounded-list-endpoints`: Approval list supports bounded server-side status filtering before cursor pagination.

## Impact

- `apps/web/components/workflows/approvals-panel.tsx` and Supervisor/Admin approval routes.
- Approval list DTO/controller/service and Loyalty query filtering.
- Generated OpenAPI/client artifacts through repository CLIs, plus focused frontend/backend tests.
- No schema/migration, decision-policy, ledger, RBAC, or tenant-scope changes.
