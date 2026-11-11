## Why

The Admin and Supervisor sidebars expose seven comparable destinations, but Admin pages use a mix of prototype scaffolding, inline styles, and different page chrome. This makes the same operational areas feel unrelated. Admin still needs its own permissions, data scope, reversal/decision controls, and management actions.

## What Changes

- Match the visual treatment of the shared destinations to the existing Supervisor pages: **Overview, Transactions, Approvals, Fraud, Customers, Cards, and Reports**.
- Align comparable page headers, widths, spacing, surface/card treatments, controls, tables, pagination, focus states, and responsive behavior using the existing Supervisor styling as the source of truth.
- Preserve each Admin page's role-specific operational data, endpoints, management and reversal/decision actions, tenant scope, and Admin authorization. Presentation labels and duplicate prototype scaffolding may be simplified or adapted to match the shared page chrome; retain operational content and route destinations. Use existing presentation props only where source review confirms they do not change workflow capabilities.
- Keep Supervisor routes and behavior unchanged. Do not introduce new APIs, data, actions, or role permissions.

## Capabilities

### Modified Capabilities

- `admin-supervisor-common-page-style-parity`: Admin counterparts visually align with Supervisor counterparts for shared destinations while retaining Admin-specific functionality.

## Impact

- Frontend: Admin route wrappers and scoped styles for `/admin`, `/admin/transactions`, `/admin/approvals`, `/admin/fraud`, `/admin/customers`, `/admin/cards`, and `/admin/reports`.
- Existing Supervisor route styling is the reference; no Supervisor routes are to be changed.
- No API, backend, schema, authorization, financial, or operational behavior changes.
