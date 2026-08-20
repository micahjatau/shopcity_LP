# ShopCity Role-Aware Sidebar & Dedicated Workflow Routing Design

**Date:** 2026-08-20  
**Branch:** `frontend-development`  
**Status:** Approved design, pending implementation plan  
**Scope:** Frontend application shell, navigation, route composition, workflow-page decomposition, responsive navigation, route authorization, and associated tests.

## 1. Purpose

ShopCity's frontend has outgrown the current horizontal navigation model. Cashier, Supervisor, and Admin now expose enough distinct workflows that primary navigation wraps across the large red shell header, while the Cashier homepage still embeds several workflows that should be independently addressable.

This change introduces one role-aware application-shell architecture for all human roles:

- persistent sidebar navigation on desktop;
- collapsed navigation rail on tablet;
- mobile navigation drawer on small screens;
- dedicated workflow pages instead of oversized role homepages;
- a single navigation registry shared by visibility, route authorization, active state, breadcrumbs/page metadata, and mobile navigation;
- role-prefixed routes backed by reusable workflow components;
- lightweight cross-route workflow context that always rehydrates authoritative backend state before financial actions.

This design does not change backend authorization rules. Backend RBAC remains authoritative. Frontend role filtering prevents misleading or inaccessible controls and provides the correct user experience.

## 2. Goals

1. Make every major ShopCity workflow reachable from persistent role-appropriate navigation.
2. Move Cashier Earn and Redeem from the oversized `/cashier` page to dedicated workflow routes.
3. Keep the role homepages focused on operational overview and workflow launch rather than workflow execution.
4. Prevent navigation and route-authorization logic from drifting apart.
5. Reuse Supervisor/Admin workflow implementations without making role-specific pages import another role's page component.
6. Preserve ShopCity's red brand identity in navigation while keeping working surfaces neutral and legible.
7. Support desktop POS, supervisor tablet, and mobile oversight without squeezing a desktop sidebar into a narrow viewport.
8. Preserve deep linking, browser navigation, draft persistence, accessibility, and existing generated-client backend integration.

## 3. Non-goals

This design does not:

- redesign the loyalty business rules;
- change backend endpoint authorization;
- replace the generated OpenAPI client;
- introduce a large global-state framework solely for navigation;
- convert every existing workflow component during the first commit;
- add decorative analytics to the Cashier home screen;
- expose SYSTEM as an interactive navigation role;
- merge `frontend-development` into `master`.

## 4. Current-state problems

### 4.1 Horizontal navigation has exceeded its useful capacity

The current `AppShell` renders role routes as horizontal pills inside the large ShopCity red header. Supervisor and Admin already have seven or more destinations, causing the header to function simultaneously as brand header, navigation, session status, branch context, connection state, sync state, and logout surface.

This makes hierarchy weak and consumes vertical space on every operational page.

### 4.2 Cashier home is an oversized workflow container

The current `/cashier` page combines:

- branch/policy context;
- card lookup;
- Earn form;
- Redeem form;
- customer context and ledger information;
- sync/connection context.

The intended information architecture already defines separate Cashier destinations for Home, Earn, Redeem, Customers, and Sync. Earn and Redeem should therefore be independently navigable workflows.

### 4.3 Page-local route maps duplicate application navigation

Several Supervisor/Admin workflow pages contain `Back to ...` links and related-route link groups. Once persistent navigation exists, these duplicate the shell and make workflow pages behave like separate mini-sites.

### 4.4 Role reuse occurs at page level rather than workflow level

Some Supervisor routes currently reuse Cashier page modules. Shared business capability should instead live in a workflow component and be wrapped by role-specific pages that define permissions and surrounding context.

## 5. Chosen architecture

Use **role-prefixed dedicated routes backed by shared workflow components**, with one configuration-driven application shell.

```text
Authenticated session
        ↓
Navigation registry + role/capability filter
        ↓
AppShell
├── AppSidebar
├── AppTopbar
├── MobileNavigationDrawer
└── MainContent
        ↓
Role-specific route wrapper
        ↓
Shared workflow component
        ↓
Generated OpenAPI client
        ↓
Nest backend
```

### Why this approach

It preserves clear URLs and backend-aligned role boundaries while preventing duplicated workflow implementations. It also makes the current app easier to test because route presence, role visibility, authorization, and active navigation can all derive from one registry.

## 6. Navigation registry

Create one typed navigation registry as the canonical frontend navigation source of truth.

Conceptually:

```ts
type HumanRole = 'CASHIER' | 'SUPERVISOR' | 'ADMIN';

type NavigationSection = {
  id: string;
  label: string;
  items: NavigationItem[];
};

type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  exact?: boolean;
  capability?: Capability;
  badge?: 'syncQueue' | 'approvalCount' | 'fraudCount';
};

const navigationByRole: Record<HumanRole, NavigationSection[]> = { ... };
```

The registry SHALL drive:

- desktop sidebar rendering;
- tablet rail rendering;
- mobile drawer rendering;
- active navigation state;
- role-aware route authorization;
- breadcrumb/page-title metadata where appropriate;
- optional navigation badges;
- future command-palette/search navigation if added later.

SYSTEM SHALL not have a navigation registry entry and SHALL never be treated as a human role.

### Route matching

A route item can be exact or hierarchical.

Examples:

```text
/cashier                exact home route
/cashier/customers      matches /cashier/customers/:id
/supervisor/transactions matches transaction detail descendants
```

Authorization must never interpret an empty route group as permission.

## 7. Role navigation model

### 7.1 Cashier

```text
WORKSPACE
Overview
Lookup
Earn
Redeem
Customers

OPERATIONS
Sync Queue
```

Routes:

```text
/cashier
/cashier/lookup
/cashier/earn
/cashier/redeem
/cashier/customers
/cashier/sync
```

Cashier navigation characteristics:

- transaction-first;
- fewer groups and lower visual density;
- one-click access to Earn and Redeem;
- persistent Sync Queue visibility;
- no Supervisor/Admin management actions;
- large enough targets for POS/touch use.

### 7.2 Supervisor

```text
WORKSPACE
Overview

CUSTOMERS
Customers
Cards

OPERATIONS
Transactions
Approvals
Fraud

INSIGHTS
Reports
```

Routes:

```text
/supervisor
/supervisor/customers
/supervisor/cards
/supervisor/transactions
/supervisor/approvals
/supervisor/fraud
/supervisor/reports
```

Supervisor navigation remains branch-operations focused.

### 7.3 Admin

```text
WORKSPACE
Overview

OPERATIONS
Operations
Transactions
Approvals
Fraud

LOYALTY
Customers
Cards
Adjustments

INSIGHTS
Reports
Audit

ACCESS & CONFIGURATION
Users
Devices
Branches
```

Target routes:

```text
/admin
/admin/operations
/admin/transactions
/admin/approvals
/admin/fraud
/admin/customers
/admin/cards
/admin/adjustments
/admin/reports
/admin/audit
/admin/users
/admin/devices
/admin/branches
```

Admin SHALL reuse shared operational workflow components where backend authorization already allows Admin. Admin does not need a parallel bespoke implementation of Supervisor-capable workflows.

## 8. Application shell composition

### 8.1 AppShell

`AppShell` owns:

- session bootstrap and route gating;
- navigation registry resolution;
- responsive shell composition;
- public tenant/branch/policy context;
- logout;
- rendering shell-level connection and sync status.

It should no longer contain all visual implementation details inline. The current monolithic shell should be decomposed.

### 8.2 AppSidebar

Responsibilities:

- ShopCity brand block;
- role-filtered navigation sections;
- active-route state;
- optional navigation badges;
- branch/device summary in footer;
- sign-out/user action access;
- expanded/collapsed desktop state.

Suggested desktop width:

```text
expanded: 240–260 px
collapsed rail: 68–76 px
```

Brand treatment:

- deep ShopCity red background;
- existing white ShopCity mark;
- white/neutral navigation text;
- brighter red/white active treatment;
- semantic status colors remain independent of brand red.

### 8.3 AppTopbar

The top bar becomes compact and operational rather than a second navigation area.

It may show:

- current page title/breadcrumb context;
- branch;
- registered device;
- connection status;
- sync status;
- user identity/role;
- mobile navigation trigger;
- contextual page-level action slot if needed.

Do not repeat the full navigation horizontally.

### 8.4 MobileNavigationDrawer

On small screens the same navigation registry is rendered in an accessible drawer/sheet.

Requirements:

- focus moves into drawer when opened;
- focus is trapped while open;
- Escape closes;
- focus returns to trigger;
- current route is indicated without relying only on color;
- navigation closes after route selection;
- background content is not interactable while drawer is open.

## 9. Responsive behavior

### Desktop — 1200 px and above

- expanded fixed sidebar by default;
- compact top bar;
- content area uses remaining width;
- optional user-controlled sidebar collapse;
- workflow max widths remain constrained for legibility.

### Tablet — 768–1199 px

- collapsed icon rail by default;
- icon labels exposed through tooltip and accessible name;
- rail can expand when appropriate;
- supporting workflow details may move into responsive sheets or stacked cards.

### Mobile — below 768 px

- no fixed sidebar;
- top-bar menu trigger opens mobile drawer;
- main workflow becomes full-width;
- dense tables use existing responsive strategies rather than horizontal shell compression.

The desktop sidebar SHALL never simply shrink into a narrow unreadable column.

## 10. Dedicated Cashier workflow decomposition

### 10.1 `/cashier` — Overview

The Cashier homepage becomes a launchpad and current-work context screen.

Show only truthful operational information:

- cashier identity;
- branch;
- registered device;
- online/offline state;
- queue count/state;
- quick action: Earn;
- quick action: Redeem;
- quick action: Lookup/customer search;
- recent local/current-shift activity only when supported by authoritative data.

Do not embed the full Earn or Redeem forms.

### 10.2 `/cashier/lookup`

Purpose: identify a card/customer before beginning another task.

Workflow:

```text
scan/type card serial
      ↓
backend lookup
      ↓
customer identity
card state
available balance
expiring credit where available
      ↓
[Earn] [Redeem] [View customer]
```

The Earn/Redeem links SHALL carry a lightweight identifier, preferably card serial, rather than copying a stale customer object between routes.

Example:

```text
/cashier/earn?card=CARD-001
```

### 10.3 `/cashier/earn`

The page owns workflow composition, while `EarnTransactionForm` remains responsible for the financial submission itself.

Page composition:

```text
Page header
Lookup/customer-card context
Branch/policy context
EarnTransactionForm
Persistent result/next action
```

If `?card=` exists, the page re-fetches current card/customer state from the backend before enabling the financial workflow.

The route SHALL preserve the existing persisted financial draft/idempotency behavior.

### 10.4 `/cashier/redeem`

Parallel structure to Earn:

```text
Page header
Lookup/customer-card context
Available balance
Redemption policy context
RedeemTransactionForm
Confirmation/result
```

If a card identifier is supplied in the URL, authoritative data is reloaded rather than trusting client-only navigation state.

### 10.5 `/cashier/customers`

Remain read-only for Cashier except role-authorized workflow handoff actions.

### 10.6 `/cashier/sync`

Remain dedicated to offline Earn reconciliation. Sidebar may surface queue count as a badge.

## 11. Shared workflow components

Role routes should not import another role's page component.

Preferred structure:

```text
components/workflows/
├── customer-workspace/
├── card-management-workspace/
├── transaction-workspace/
├── approvals-workspace/
├── fraud-workspace/
├── reports-workspace/
├── earn-workspace/
└── redeem-workspace/
```

Examples:

```text
/supervisor/customers ─┐
                       ├─ CustomerManagementWorkspace
/admin/customers ──────┘
```

Role-specific wrappers provide capabilities:

```tsx
<CustomerManagementWorkspace
  canEditCustomer={true}
  canChangeCustomerStatus={true}
  canAssignCard={true}
  canReplaceCard={true}
/>
```

For Cashier:

```tsx
<CustomerWorkspace
  canEditCustomer={false}
  canChangeCustomerStatus={false}
  canAssignCard={false}
  canReplaceCard={false}
/>
```

Backend authorization remains the final authority.

## 12. Cross-route context and data flow

Do not introduce a global store just to move one selected card/customer between workflow pages.

Preferred hierarchy:

1. stable identifiers in route/search parameters;
2. authoritative backend rehydration on destination page;
3. persisted financial drafts remain in their dedicated draft persistence mechanism;
4. transient UI-only state remains local to the workflow component.

Example:

```text
/cashier/lookup
      ↓ card CARD-001
/cashier/earn?card=CARD-001
      ↓
GET current card/customer context
      ↓
Earn form receives authoritative context
```

This provides useful deep links and prevents stale balance/customer data from becoming the source of truth.

## 13. Page-local navigation cleanup

Once sidebar navigation is active, remove most duplicated page navigation such as:

- `Back to cashier`;
- `Back to supervisor`;
- `Back to admin`;
- local "route map" sections containing sibling primary routes.

Keep only context-specific navigation that is part of the workflow itself, such as:

- `View customer` from a confirmed Earn result;
- `View transaction` from an approval;
- `Back to results` inside a detail workflow where browser back is insufficient;
- related entity links.

Primary application navigation belongs to the shell.

## 14. Page anatomy

Dedicated workflow pages should use a consistent hierarchy:

```text
Page title + concise description
Context/identity block
Primary workflow
Persistent result/error state
Contextual next actions
```

Avoid generic "Route map", "Notes", and demo-status cards when they do not help the operator complete a task.

## 15. Visual design

### Sidebar

Use ShopCity's existing brand system:

- `#530001` / `#6F0101` range for deep sidebar background;
- `#B10000` / `#D00607` for active/accent states where contrast permits;
- white mark/text;
- subtle border/separation from content canvas;
- restrained diagonal motif only in brand tile if desired, not behind every nav item.

### Main canvas

Operational content remains neutral:

- light neutral background;
- white cards/panels;
- semantic status colors independent of ShopCity red;
- primary red actions reserved for meaningful CTAs.

### Active navigation

Active state must be distinguishable through more than color alone. Use a combination such as:

- contrasting background;
- left indicator/border;
- font weight;
- `aria-current="page"`.

## 16. Accessibility

The shell SHALL preserve the existing WCAG 2.2 AA target.

Required behaviors:

- sidebar navigation uses semantic `<nav>` and lists;
- every icon-only collapsed item has an accessible name;
- active item uses `aria-current`;
- keyboard tab order follows visual hierarchy;
- focus indicators remain visible against red and neutral backgrounds;
- sidebar collapse control is keyboard accessible;
- mobile drawer follows accessible dialog/sheet focus behavior;
- a skip link allows keyboard users to jump to main content;
- focus is not hidden behind fixed top/sidebar regions;
- reduced-motion preferences are honored;
- navigation badges do not convey state through color alone.

## 17. Error and permission behavior

Navigation visibility is a UX layer; backend authorization remains authoritative.

If session bootstrap resolves to:

- `CASHIER`: only Cashier routes are visible/authorized by the shell;
- `SUPERVISOR`: only Supervisor routes are visible/authorized by the shell;
- `ADMIN`: only Admin routes are visible/authorized by the shell;
- `SYSTEM`: interactive shell content is denied and redirected away from human workflows;
- unauthenticated: redirect to `/login`.

If a backend endpoint returns a permission error despite visible navigation, the workflow must show the domain/access error rather than treating it as success.

## 18. Sidebar badges

Badges are allowed only for operationally useful counts with trustworthy sources.

First useful badge:

```text
Sync Queue  3
```

Future candidates:

- pending approvals;
- high-severity/open fraud.

Do not add arbitrary unread counts simply because they are visually attractive. Badge sources must define freshness and failure behavior.

## 19. Performance

Navigation itself should not introduce heavy data dependencies.

- registry is static configuration;
- shell context uses existing session/public configuration data;
- optional badges may subscribe to existing lightweight local/session sources;
- expensive workflow data loads only on its dedicated route;
- splitting Cashier workflows should reduce the amount of UI/data work performed on `/cashier`.

No new global query/store framework is required solely for this architecture.

## 20. Testing strategy

### 20.1 Unit/component tests

Test:

- navigation registry role filtering;
- route matching;
- empty/unsupported route groups fail closed;
- active item behavior;
- collapsed state accessibility labels;
- sidebar badge rendering;
- mobile drawer open/close/focus behavior where component-test tooling supports it.

### 20.2 Playwright route tests

For each role:

- only permitted sidebar sections/items are visible;
- disallowed role routes redirect to role home;
- current route has correct active state;
- navigation works by keyboard;
- mobile drawer exposes the same allowed routes;
- SYSTEM does not reach a human shell.

### 20.3 Cashier workflow routing tests

Test:

```text
Lookup card
→ choose Earn
→ /cashier/earn?card=...
→ authoritative lookup context loads
```

and:

```text
Lookup card
→ choose Redeem
→ /cashier/redeem?card=...
→ current balance/policy context loads
```

Persisted draft/idempotency tests must continue to pass after route splitting.

### 20.4 Shared-role workflow tests

Verify shared components expose the correct actions for each wrapper/capability set:

- Cashier customer view is read-only;
- Supervisor customer/card actions are available;
- Admin shared operational actions match backend authorization.

### 20.5 Visual regression

Add screenshots for:

- Cashier desktop expanded sidebar;
- Supervisor desktop expanded sidebar;
- Admin desktop expanded sidebar;
- tablet collapsed rail;
- mobile drawer;
- active, focus, badge, offline, and long-label states.

### 20.6 Accessibility

Run the existing browser axe suite against representative shell routes and the mobile drawer. Do not rely solely on JSDOM for navigation contrast/focus behavior.

## 21. Migration sequence

Implementation should be incremental and keep routes usable throughout.

1. Add typed navigation registry.
2. Add AppSidebar.
3. Add compact AppTopbar.
4. Add mobile navigation drawer.
5. Refactor AppShell to use registry + new shell components.
6. Preserve existing routes while sidebar lands.
7. Create `/cashier/lookup`.
8. Create `/cashier/earn`.
9. Create `/cashier/redeem`.
10. Reduce `/cashier` to overview/launchpad.
11. Move shared workflow logic out of role page imports where needed.
12. Add Admin wrappers for shared operations authorized to Admin.
13. Remove redundant page-local primary navigation blocks.
14. Add route/deep-link/responsive/a11y tests.
15. Update design-system/application-shell documentation to reflect implementation.

## 22. Files expected to change

Likely new/modified frontend areas:

```text
apps/web/
├── app/(shell)/cashier/page.tsx
├── app/(shell)/cashier/lookup/page.tsx
├── app/(shell)/cashier/earn/page.tsx
├── app/(shell)/cashier/redeem/page.tsx
├── app/(shell)/supervisor/**
├── app/(shell)/admin/**
├── components/app-shell.tsx
├── components/navigation/
│   ├── app-sidebar.tsx
│   ├── app-topbar.tsx
│   ├── mobile-navigation-drawer.tsx
│   ├── navigation-registry.ts
│   └── navigation-types.ts
├── components/workflows/**
└── tests/**
```

Exact filenames may vary during implementation, but responsibilities should remain separated.

## 23. Acceptance criteria

The architecture is complete when all of the following are true:

1. Cashier, Supervisor, and Admin use the same sidebar-shell architecture.
2. Desktop primary navigation no longer lives as a wrapping horizontal pill list in the red header.
3. Cashier has dedicated Overview, Lookup, Earn, Redeem, Customers, and Sync routes.
4. `/cashier` no longer embeds full Earn and Redeem forms.
5. Sidebar items are role/capability correct and derive from one typed registry.
6. Route authorization uses the same role/navigation source and fails closed.
7. SYSTEM has no interactive sidebar or workflow route access.
8. Lookup → Earn and Lookup → Redeem deep links rehydrate authoritative backend context.
9. Supervisor/Admin shared business workflows use shared components rather than importing another role's page component.
10. Page-local duplicate primary-navigation blocks are removed.
11. Desktop, tablet, and mobile navigation behavior matches this specification.
12. The mobile drawer satisfies focus, Escape, return-focus, and keyboard requirements.
13. Existing financial draft/idempotency behavior continues to work across route splitting.
14. Existing backend-generated-client integrations remain authoritative.
15. Role-route, deep-link, responsive, accessibility, and visual-regression tests pass.
16. `frontend-development` remains isolated; no implementation is merged into `master` without a separate explicit decision.

## 24. Deferred follow-up

The sidebar work should not obscure remaining non-navigation operational concerns. In particular, device-bound browser authentication/offline Earn must continue to be validated independently before pilot release.

This design does not declare the whole frontend release-ready; it defines the next frontend architecture change while preserving existing workflow correctness work.
