## Why

ShopCity's frontend shell has outgrown the current horizontal navigation model. The approved frontend design-system document (`docs/frontend/design-system/04-workflows-and-application-shells.md`) and the dedicated sidebar/workflow routing design from the current branch both point to the same problem set:

- cashier workflows are still concentrated in oversized pages instead of dedicated routes;
- supervisor/admin navigation is too dense for the current header-first shell;
- route visibility, active state, and authorization can drift apart when each page owns its own navigation logic;
- role-specific pages sometimes reuse another role's page component instead of sharing a workflow component;
- mobile, tablet, and desktop shell behavior is not yet explicitly modeled as one navigation system.

This change formalizes a role-aware shell architecture and dedicated workflow routing so the frontend can be organized around real workflows instead of shell-local page clusters.

## What Changes

- Introduce one typed navigation registry as the source of truth for route visibility, active state, breadcrumbs/page metadata, and shell rendering.
- Replace the current horizontal shell nav with a role-aware application shell that supports desktop sidebar, tablet rail, and mobile drawer behavior.
- Keep the cashier shell transaction-first with persistent connection/sync state, branch/device context, and one-click access to Earn and Redeem.
- Split cashier Earn and Redeem into dedicated workflow routes while keeping `/cashier` as an operational overview/launchpad.
- Keep Supervisor and Admin routes role-prefixed and backed by shared workflow components rather than copying whole pages across roles.
- Preserve backend authorization as the source of truth; frontend filtering only improves UX and route presentation.
- Carry only stable identifiers in cross-route workflow context and rehydrate authoritative backend state before financial actions.

## Non-goals

- No backend RBAC or endpoint authorization changes.
- No GraphQL, microservices, or navigation-specific global state framework.
- No redesign of loyalty business rules, money math, or persistence contracts.
- No attempt to fully rewrite every existing workflow on the first pass.
- No merge of `frontend-development` into `master`.

## Design Summary

- Use role-prefixed routes such as `/cashier/earn`, `/cashier/redeem`, `/supervisor/...`, and `/admin/...`.
- Keep a single navigation registry that drives sidebar, rail, drawer, route metadata, and route matching.
- Use shared workflow components for cross-role capability reuse.
- Keep the app shell compact and operational, with the brand/header separated from navigation density while still surfacing role/branch/device context.
- Make mobile navigation accessible via a drawer rather than shrinking desktop sidebar patterns into unreadable columns.

## Impact

Proposal-time GitNexus analysis on `apps/web/components/app-shell.tsx:AppShell` returned:

- Risk: LOW
- Impacted count: 2
- Direct dependants: 2
- Affected process: `ShellLayout`

This is a narrow but cross-cutting frontend shell change. The main regression risks are route visibility drift, broken active-state logic, and incorrect role-specific navigation exposure.

## Rollout / Verification

1. Add or update the navigation registry and shell composition first.
2. Split cashier Earn/Redeem into dedicated routes and keep `/cashier` as overview.
3. Reuse shared workflow components for supervisor/admin where possible.
4. Add route visibility, active-state, and accessibility tests for desktop/tablet/mobile behaviors.
5. Verify with frontend lint, typecheck, build, and targeted Playwright coverage.

## Open Questions

1. Should collapsed sidebar state persist per user/session?
2. Should the cashier overview preserve a last-used card/customer context in the URL or keep it purely session-scoped?
3. Which supervisor/admin routes should be migrated in the first implementation slice versus a follow-up pass?
