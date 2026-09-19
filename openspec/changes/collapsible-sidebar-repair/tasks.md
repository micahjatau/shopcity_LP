## 1. Baseline and shell contract

- [x] 1.1 Capture current branch/status, inspect supplied screenshot/reference assets, and record unrelated dirty files that must remain untouched.
- [x] 1.2 Run GitNexus impact for `AppShell`, `AppSidebar`, and navigation consumers; record LOW blast radius before edits. `AppTopbar` was inspected as a direct shell child; no symbol edit was required.
- [x] 1.3 Validate the proposal/spec/design and freeze deterministic Cashier shell fixtures; existing Supervisor/Admin fixtures remain canonical.

## 2. Sidebar state and presentation

- [x] 2.1 Pass `onToggleCollapse` from `AppShell` into `AppSidebar`, implement accessible collapse/expand icons, labels, `aria-expanded`, and explicit persistence with mobile isolation.
- [x] 2.2 Refactor sidebar presentation ownership into brand/header, navigation, and footer regions; remove competing shell/sidebar declarations.
- [x] 2.3 Implement 244px/76px state-driven desktop/tablet columns, grouped canonical navigation, active pills, compact queue badge, centered collapsed mark, 44px targets, and accessible collapsed tooltips/labels.
- [x] 2.4 Preserve role-aware routes, active matching, logout, Help & Training, and queue behavior for Cashier, Supervisor, and Admin.

## 3. Responsive shell and topbar

- [x] 3.1 Remove the 84px tablet override and viewport-only label hiding; verify 1024px, 768px, 390px, and 375px geometry without overflow.
- [x] 3.2 Add Help & Training and Logout to the mobile drawer while preserving inertness, focus trap, Escape, close restoration, and keyboard navigation.
- [x] 3.3 Verify topbar session/device diagnostics are visually hidden but accessible; inspect viewport meta and mobile topbar sizing.
- [x] 3.4 Add 200–240ms width/content motion and reduced-motion overrides without animating icons or nav spacing.

## 4. Tests and visual evidence

- [x] 4.1 Update Jest shell tests for real toggle behavior, persistence, accessible state, role destinations, footer actions, and mobile isolation.
- [x] 4.2 Add Playwright geometry/accessibility coverage at 1440px, 1024px, 768px, 390px, and 375px for expanded/collapsed/drawer states.
- [x] 4.3 Capture and inspect expanded, collapsed, tablet, and mobile screenshots against approved ShopCity appearance; do not blindly update baselines.
- [x] 4.4 Run affected workflow/accessibility tests and confirm financial controllers, APIs, and RBAC are unchanged.

## 5. Final verification and delivery

- [x] 5.1 Run lint, typecheck, build, Semgrep, OpenSpec validation, and affected Jest/Playwright suites.
- [x] 5.2 Run GitNexus detect_changes and inspect affected flows, expected files, unrelated dirty files, and residual risk; analyzer refresh was blocked by a pre-existing FTS index inconsistency, documented in evidence.
- [x] 5.3 Document changed-file rationale, route authority preservation, screenshot evidence, unsupported changes, and final verification results.
