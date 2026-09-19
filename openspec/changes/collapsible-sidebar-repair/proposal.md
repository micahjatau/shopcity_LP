# Change: Repair and Implement Collapsible Sidebar

## Why

The shared ShopCity shell currently permits a desktop icon-only rail at phone scale, lacks a usable collapse control, separates navigation items excessively, and leaves footer actions difficult or impossible to access. Session/device diagnostics also leak visibly into the topbar. This harms role navigation, responsive usability, keyboard access, and visual parity with the approved ShopCity design.

## What changes

- Implement the existing `sidebarCollapsed` state as a real persisted collapse/expand interaction in `AppShell` and `AppSidebar`.
- Add an accessible brand/header toggle with `Collapse sidebar` and `Expand sidebar` labels plus accurate `aria-expanded` state.
- Make `AppSidebar` the single owner of sidebar presentation with explicit brand, navigation, and footer regions.
- Enforce 244px expanded and 76px collapsed desktop widths, grouped navigation, stable active pills, compact queue badges, usable touch targets, and accessible collapsed-item labels/tooltips.
- Use the existing mobile drawer at phone widths instead of a permanent icon-only rail; preserve drawer focus management, Help & Training, Logout, keyboard navigation, and role-aware destinations.
- Remove conflicting tablet sizing and viewport-only label hiding; resize main content without horizontal overflow.
- Hide session/device diagnostics visually while retaining screen-reader access and verify topbar viewport behavior/meta configuration.
- Add 200–240ms shell width/content transitions using existing motion tokens and honor reduced-motion preferences.
- Add deterministic Jest/Playwright/accessibility/visual coverage at desktop, tablet, breakpoint, and mobile widths without changing financial controllers, backend authorization, or transaction APIs.

## Scope

In scope: `AppShell`, `AppSidebar`, topbar presentation, shared shell CSS/tokens, role navigation presentation, responsive drawer behavior, and affected shell tests/screenshots.

Out of scope: backend/database/API contracts, RBAC authority, financial controllers, transaction workflows, or changes to `shellNavigationByRole` route data beyond presentation requirements.

## Acceptance criteria

- Expanded and collapsed controls work, persist across reload/navigation, expose correct labels and `aria-expanded`, and do not interfere with mobile drawer state.
- Desktop widths are 244px/76px; navigation stays grouped at the top; footer remains at the bottom; main content never horizontally overflows.
- All Cashier, Supervisor, and Admin destinations remain role-authoritative and correctly highlighted.
- Collapsed navigation remains identifiable, keyboard accessible, minimum 44px targets, and retains Sync Queue counts plus accessible footer actions.
- Mobile 390px/375px use the drawer, including Help & Training and Logout; drawer focus/escape behavior remains accessible.
- Diagnostics are visually hidden but available to assistive technology; topbar remains usable at all required widths.
- Reduced-motion behavior disables or minimizes shell transitions.
- Required Jest, Playwright, accessibility, visual, lint, typecheck, build, and CI checks pass with reviewed screenshots.
