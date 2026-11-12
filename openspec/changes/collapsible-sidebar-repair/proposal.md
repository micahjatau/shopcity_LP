# Change: Repair and Implement Collapsible Sidebar

## Why

The shared ShopCity shell currently permits a desktop icon-only rail at phone scale, lacks a usable collapse control, separates navigation items excessively, and leaves footer actions difficult or impossible to access. Session/device diagnostics also leak visibly into the topbar. This harms role navigation, responsive usability, keyboard access, and visual parity with the approved ShopCity design.

## What changes

- Present a 76px resting navigation rail on hover-capable desktop/tablet viewports, with temporary 244px hover/focus expansion over the main content.
- Remove the click-to-collapse button, React collapse state, viewport state listener, and persisted sidebar preference; keyboard focus within the rail also reveals its labels.
- Use `apps/web/public/brand/supervisor/icon.png` as the resting rail mark and reveal the full wordmark on hover/focus; retain the global favicon.
- Make `AppSidebar` the single owner of sidebar presentation with explicit brand, navigation, and footer regions.
- Keep the main column fixed in place while the 76px rail overlays it at 244px on hover/focus; retain grouped navigation, active pills, queue badges, touch targets, and accessible labels/tooltips.
- Keep touch-only desktop/tablet sidebars expanded when hover is unavailable; keep the mobile drawer independent below 621px.
- Use the existing mobile drawer at phone widths instead of a permanent icon-only rail; preserve drawer focus management, Help & Training, Logout, keyboard navigation, and role-aware destinations.
- Remove conflicting tablet sizing and viewport-only label hiding; resize main content without horizontal overflow.
- Keep the sticky desktop/tablet sidebar at viewport height, hide its visible scrollbar track without disabling overflow scrolling, and allow the main shell/document height to follow its content.
- Hide session/device diagnostics visually while retaining screen-reader access and verify topbar viewport behavior/meta configuration.
- Add 200–240ms sidebar width/shadow transitions using existing motion preferences; never resize the main column when the rail expands.
- Add deterministic Jest/Playwright/accessibility/visual coverage at desktop, tablet, breakpoint, and mobile widths without changing financial controllers, backend authorization, or transaction APIs.

## Scope

In scope: `AppShell`, `AppSidebar`, topbar presentation, shared shell CSS/tokens, role navigation presentation, responsive drawer behavior, and affected shell tests/screenshots.

Out of scope: backend/database/API contracts, RBAC authority, financial controllers, transaction workflows, or changes to `shellNavigationByRole` route data beyond presentation requirements.

## Acceptance criteria

- Hover-capable desktop/tablet viewports show a 76px rail by default; pointer hover or keyboard focus temporarily expands it to 244px over the main column, then restores the rail without shifting content. No collapse/expand button or saved sidebar preference remains.
- Touch-only viewports at 621px and wider show the full 244px sidebar; hover-capable viewports use the 76px rail and hover/focus expansion. Neither mode causes horizontal overflow.
- The desktop/tablet sidebar remains exactly viewport-height; long main content grows the document without stretching it, overflow remains reachable without a visible scrollbar, and the compact 52×52 logo returns when the rail closes.
- All Cashier, Supervisor, and Admin destinations remain role-authoritative and correctly highlighted.
- Collapsed navigation remains identifiable, keyboard accessible, minimum 44px targets, and retains Sync Queue counts plus accessible footer actions; its brand mark uses the approved icon asset.
- The approved icon asset is declared as the favicon globally, including routes outside the authenticated shell.
- Mobile 390px/375px use the drawer, including Help & Training and Logout; drawer focus/escape behavior remains accessible.
- Diagnostics are visually hidden but available to assistive technology; topbar remains usable at all required widths.
- Reduced-motion behavior disables or minimizes shell transitions.
- Required Jest, Playwright, accessibility, visual, lint, typecheck, build, and CI checks pass with reviewed screenshots.
