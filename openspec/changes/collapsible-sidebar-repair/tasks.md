## 1. Baseline and shell contract

- [x] 1.1 Capture current branch/status, inspect supplied screenshot/reference assets, and record unrelated dirty files that must remain untouched.
- [x] 1.2 Run GitNexus impact for `AppShell`, `AppSidebar`, and navigation consumers; record LOW blast radius before edits. `AppTopbar` was inspected as a direct shell child; no symbol edit was required.
- [x] 1.3 Validate the proposal/spec/design and freeze deterministic Cashier shell fixtures; existing Supervisor/Admin fixtures remain canonical.

## 2. Sidebar state and presentation

- [x] 2.1 Pass `onToggleCollapse` from `AppShell` into `AppSidebar`, implement accessible collapse/expand icons, labels, `aria-expanded`, and explicit persistence with mobile isolation.
- [x] 2.2 Refactor sidebar presentation ownership into brand/header, navigation, and footer regions; remove competing shell/sidebar declarations.
- [x] 2.3 Implement 244px/76px state-driven desktop/tablet columns, grouped canonical navigation, active pills, compact queue badge, centered collapsed mark, 44px targets, and accessible collapsed tooltips/labels.
- [x] 2.4 Preserve role-aware routes, active matching, logout, Help & Training, and queue behavior for Cashier, Supervisor, and Admin.
- [x] 2.5 Constrain the desktop/tablet sidebar to viewport height with reachable internal overflow; keep main content in natural document flow.

## 3. Responsive shell and topbar

- [x] 3.1 Remove the 84px tablet override and viewport-only label hiding; verify 1024px, 768px, 390px, and 375px geometry without overflow.
- [x] 3.2 Add Help & Training and Logout to the mobile drawer while preserving inertness, focus trap, Escape, close restoration, and keyboard navigation.
- [x] 3.3 Verify topbar session/device diagnostics are visually hidden but accessible; inspect viewport meta and mobile topbar sizing.
- [x] 3.4 Add 200–240ms width/content motion and reduced-motion overrides without animating icons or nav spacing.
- [x] 3.5 Automatically enter the actual collapsed state when resizing into 621–920px, restore the explicit preference above 920px, and keep manual tablet overrides usable.

## 4. Tests and visual evidence

- [x] 4.1 Update Jest shell tests for real toggle behavior, persistence, accessible state, role destinations, footer actions, and mobile isolation.
- [x] 4.2 Add Playwright geometry/accessibility coverage at 1440px, 1024px, 920px, 768px, 390px, and 375px for expanded/collapsed/drawer and resize transitions.
- [x] 4.3 Capture and inspect expanded, collapsed, tablet, and mobile screenshots against approved ShopCity appearance; do not blindly update baselines.
- [x] 4.4 Run affected workflow/accessibility tests and confirm financial controllers, APIs, and RBAC are unchanged.
- [x] 4.5 Verify long main content grows the document without stretching the sidebar, and short viewports can scroll the sidebar footer into view.

## 5. Final verification and delivery

- [x] 5.1 Run lint, typecheck, build, Semgrep, OpenSpec validation, and affected Jest/Playwright suites.
- [x] 5.2 Run GitNexus detect_changes and inspect affected flows, expected files, unrelated dirty files, and residual risk; analyzer refresh was blocked by a pre-existing FTS index inconsistency, documented in evidence.
- [x] 5.3 Document changed-file rationale, route authority preservation, screenshot evidence, unsupported changes, and final verification results.
- [ ] 5.4 Use the approved icon asset for the collapsed sidebar and global favicon; verify collapsed/expanded rendering and metadata.
- [x] 5.5 Run focused shell/browser verification and document fixed-height sidebar evidence without altering unrelated dirty files.

## 6. Hover-expandable sidebar follow-up

- [x] 6.1 Remove the click toggle, React collapse/preference state, and tablet state listener; establish a 76px resting rail.
- [x] 6.2 Add hover/focus overlay expansion without shifting main content and preserve expanded navigation on touch-only desktop/tablet viewports.
- [x] 6.3 Update AppShell Jest and browser coverage for no toggle, hover/focus, touch fallback, short heights, and mobile drawer; review changed screenshots.
- [x] 6.4 Update OpenSpec design/spec/evidence and run focused verification without changing unrelated worktree files.
- [x] 6.5 Hide the visible sidebar scrollbar while preserving overflow scrolling; verify the 52×52 compact logo is restored on the resting rail.
