# Design: Admin navigation icons and live Overview card metric

## Sidebar icon mapping

- Keep the shared navigation component and existing role-specific route table.
- Use a system activity/pulse glyph for Admin Operations, a receipt glyph for Transactions, and a shield-alert glyph for Fraud. Existing Customers/users, Cards/credit-card, Approvals/check, Reports/chart, and Policies/sliders mappings already fit their destinations.
- Keep visible labels and accessible link names as the source of route meaning. Keep branch, device, user, audit, and adjustment destinations under Operations → Controls; do not add sidebar links or change route aliases.
- Supervisor Fraud continues using the shared shield-alert drawing; all other Supervisor icons and route behavior remain unchanged.

## Overview metric contract

- Add a `GET /api/v1/reports/admin-overview-metrics` route guarded by `@Roles(UserRole.ADMIN)` and repeat Admin enforcement in the service.
- Derive tenant scope exclusively from `AuthContext.user.tenantId`; count `Card` records where both `tenantId` matches and `status` is `ACTIVE`. Return a non-negative integer `activeVirtualCardCount` in the standard success envelope.
- Do not rely on materialized report rows for this live count, and do not count cards from other tenants. Keep money in integer kobo and leave all existing report fields and registration snapshot semantics unchanged.
- Add an independent Overview section state for this request. Validate the success envelope, response property, and safe non-negative integer at runtime. Render a valid zero as zero; on request/contract failure render unavailable with the existing contextual error/retry pattern, never a fabricated zero.
- The Overview's report charts continue using the existing reports API and preserve gaps/cumulative registration snapshots. No cron job configuration or production credentials are modified by this code change.

## Verification

- Test controller role metadata/delegation and service Admin rejection plus tenant/status filters.
- Test runtime parsing and the Overview's loading, zero, error, cooldown, and retry behavior.
- Test Admin icon names/route mapping and SVG shapes without changing the shell route allowlist.
- Regenerate OpenAPI/client from Nest metadata and run focused tests, typecheck, formatting, and OpenSpec validation.
