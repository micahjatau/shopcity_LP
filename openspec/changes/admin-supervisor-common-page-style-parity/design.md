## Design

### Source of truth

Use the rendered Supervisor counterpart and existing rules in `apps/web/styles/supervisor-routes.css` and `apps/web/styles/supervisor-reports.css` as the visual reference. Reuse existing ShopCity tokens and components; do not invent a second visual language or edit Supervisor styling to make comparisons pass.

### Scope

The paired routes are `/admin` ↔ `/supervisor`, `/admin/transactions` ↔ `/supervisor/transactions`, `/admin/approvals` ↔ `/supervisor/approvals`, `/admin/fraud` ↔ `/supervisor/fraud`, `/admin/customers` ↔ `/supervisor/customers`, `/admin/cards` ↔ `/supervisor/cards`, and `/admin/reports` ↔ `/supervisor/reports`.

Match equivalent visual roles (page frame, heading hierarchy, supporting copy, controls, surface, table, pagination, dialog, loading/empty/error states, and responsive layout). Route content and DOM need not be identical when the operational job differs.

### Preserve Admin behavior

- Overview keeps the Admin-only metrics, report trends, freshness state, recent audit activity, and refresh behavior.
- Transactions keeps the Admin transaction search/detail and immutable compensating reversal flow.
- Approvals and Fraud retain their existing Admin data scopes, filters, decisions, and role authorization. Admin Approvals may opt into a presentation-only Supervisor split-pane layout, but its request parameters, client-side search, status and page-size controls, Admin decision/reason/note flow, and authorization must remain Admin-owned. Do not switch to a Supervisor behavior variant if that changes the available workflow.
- Admin Customers uses the same `SupervisorCustomerWorkflows` directory component and exact directory/table presentation as `/supervisor/customers`. The Admin register button routes to `/admin/customers/new`; customer-profile links resolve to `/admin/customers?id=<customerId>` and render `SupervisorCustomerProfile` with an Admin audience. The profile keeps the Supervisor layout while retaining Admin authorization, profile edits, customer status (including the Admin confirmation phrase), and linked-card management routed to `/admin/cards`.
- Admin Cards reuses the Supervisor issued-card directory and assignment-dialog structure with an Admin audience. Card-owner links target `/admin/customers?id=<customerId>&tab=virtual-card`; the Admin customer profile must honor that tab and retain the existing verified card replacement/status controls. Use the authenticated Admin API scope and do not hard-code Supervisor routes.
- The Supervisor/Admin `Manage customer card` popup is a focused action dialog, not a detail workspace: keep its width compact, place an accessible close icon at the top-right, and align status-appropriate lifecycle buttons directly beneath the heading/close area. Do not change the authoritative card/customer verification sequence, confirmation fields, or route/API behavior.
- Reports retains `audience="admin"`, tenant-wide/report selection behavior, and Admin-only controls.

Changes should be scoped to Admin route presentation and CSS. Presentation-only labels and duplicate prototype scaffolding may be adapted, while operational data, actions, and route destinations remain. Where a markup class or existing presentation-only prop is necessary, add regression coverage proving Admin-specific actions and scope remain unchanged. No API, data, authorization, or financial behavior changes are allowed.

### Verification

Use focused unit tests for Admin route behavior and CSS/DOM invariants. Compare paired routes at the same viewport and representative loading/populated states with Playwright; verify the shared header/surface/control treatments match while Admin-only actions remain present. Keep the existing Supervisor screenshots and styles untouched.
