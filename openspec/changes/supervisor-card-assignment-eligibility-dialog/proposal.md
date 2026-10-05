## Why

The Supervisor Assign card tab currently divides its space between a narrow customer search column and a persistent Assignment eligibility panel. This makes search feel cramped and leaves eligibility details and issuance controls dispersed across the page. Supervisors should search across the full workspace, select a customer, and review the authoritative eligibility and assignment steps in one focused dialog.

## What Changes

- Make customer search and results span the Assign card tab's available content width, with a full-width query field and readable result rows.
- After an explicit customer selection or supported ID deep link, open a focused Assignment eligibility dialog while authoritative details load; show identity and eligibility only after the returned ID matches the requested customer.
- Present customer identity, customer status, current-card status, eligibility reason, and the blank new-serial field in a conventional dialog hierarchy.
- Keep the existing serial-review step inside that dialog, with a clear Back to details action and an explicit Assign card confirmation.
- Preserve the existing API calls, backend eligibility authority, CSRF/idempotency behavior, conflict handling, authoritative refresh, deep-link identity semantics, and truthful ineligible states.

This is a dedicated assignment/eligibility dialog, not a generic customer-selection preview. It does not revive the removed customer-preview component or alter Manage customers.

## Capabilities

### New Capabilities

- `supervisor-card-assignment-eligibility`: Defines the full-width Assign card search and authoritative eligibility/serial-review dialog.

### Modified Capabilities

- `supervisor-customer-registration-review`: Clarify the no-generic-preview requirement so Manage customers remains direct while Assign card uses the new assignment-specific eligibility dialog. Existing card eligibility and API behavior remain unchanged.

## Impact

- `apps/web/components/workflows/supervisor-card-assignment.tsx` and route-scoped styles in `apps/web/styles/supervisor-routes.css`.
- Focused assignment component tests and responsive/accessibility browser coverage.
- No backend/API/OpenAPI, database, RBAC, status-policy, or generated-client changes.

## Proposal-time impact

`SupervisorCardAssignment`: LOW risk, exact GitNexus impact; 4 impacted symbols, 1 direct dependant, 1 affected process (`SupervisorCardsPage`) in the Workflows module. The result is recorded in `docs/development/gitnexus-impact-tracker.md`.
