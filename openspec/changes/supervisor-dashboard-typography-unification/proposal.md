# Unify typography across Supervisor pages

## Why

The customer profile now uses a readable, rem-based Inter hierarchy with near-black primary text and muted supporting labels. Other Supervisor pages still mix prototype display fonts, pixel-sized one-off declarations, and inconsistent heading/body weights. Extending the profile’s type system will make the Supervisor workspace feel coherent without redesigning its layouts or changing its workflows.

## What Changes

- Apply the profile’s Inter font family and rem-based type scale to all Supervisor dashboard routes, including the overview, approvals, cards, customers, customer profiles, fraud, reports, and transactions.
- Normalize page titles, section headings, body copy, labels, and metadata to a consistent hierarchy using the existing profile typography tokens.
- Keep the typography migration scoped to Supervisor page content; retain existing colors, component geometry, navigation, buttons, and page behavior.

## Non-goals

- No changes to Admin or Cashier page typography or shared workflow defaults.
- No changes to page layouts, spacing, colors, buttons/sidebar colors, copy, controls, business logic, API requests, permissions, or data.
- No edits to customer profile typography/layout already in place except where needed to keep its typography consistent with the shared scale.

## Impact

The change is presentation-only and is owned by `apps/web/styles/supervisor-routes.css` and `apps/web/styles/supervisor-reports.css`, using generated tokens sourced from `docs/frontend/design-system/tokens.json`. Route owners include `.supervisor-page`, `.supervisor-reports-page`, and the customer profile page. Shared primitives and Admin/Cashier consumers must retain their existing computed presentation.

GitNexus impact: `AppShellContent` is LOW (3 impacted symbols; one shell process). A `Button` lookup was ambiguous and included a CRITICAL candidate (80 dependants); no Button component changes are planned. The type rules will be scoped to Supervisor pages, and button/sidebar colors remain unchanged.

## Acceptance

- All Supervisor routes use Inter, rem-based profile-scale sizes, a consistent 400/500/600/700 weight hierarchy, near-black primary text, and muted supporting text.
- Small supporting type remains at least 0.75rem (12px at the default root size).
- Customer profile typography and layouts remain unchanged.
- Admin/Cashier route typography and shared workflow defaults remain unchanged.
- Existing Supervisor route behavior, colors, and geometry remain unchanged; no horizontal overflow is introduced at desktop, tablet, or phone widths.
- OpenSpec validation, token checks, focused route tests, typecheck/lint, and `git diff --check` pass.
