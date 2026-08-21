## 1. Shell, session, and navigation registry

- [x] 1.1 Add a typed navigation registry as the single source of truth for role navigation.
- [x] 1.2 Refactor the app shell so sidebar, topbar, and mobile drawer composition is shared.
- [x] 1.3 Move session bootstrap, route gating, logout, and shell-level sync status into the shell boundary.
- [x] 1.4 Align active-state, breadcrumb, and page-title metadata with the registry.
- [x] 1.5 Surface live public branch, timezone, policy, tenant, and device context in shell-level UI.
- [x] 1.6 Keep SYSTEM out of the interactive human shell and fail closed on unsupported access.
- [x] 1.7 Show branch/device summary in the sidebar footer or equivalent shell context area.
- [ ] 1.8 Define trustworthy sidebar badge sources and freshness/failure behavior for operational counts.
- [ ] 1.9 Decide whether collapsed sidebar state persists per user/session and implement if required.

## 2. Cashier workflow routing

- [x] 2.1 Split Lookup into a dedicated cashier route.
- [x] 2.2 Split Earn into a dedicated cashier route.
- [x] 2.3 Split Redeem into a dedicated cashier route.
- [x] 2.4 Keep `/cashier` as an overview/launchpad page.
- [x] 2.5 Surface persistent cashier sync/branch/device context in the shell.
- [x] 2.6 Rehydrate authoritative customer/card context from stable route identifiers before financial actions.

## 3. Supervisor/Admin workflow reuse

- [x] 3.1 Extract shared workflow components for cross-role reuse.
- [x] 3.2 Remove page-level reuse between roles where shared workflow components are available.
- [x] 3.3 Keep backend authorization authoritative for all workflow actions.
- [x] 3.4 Ensure unauthorized routes show an auth-aware fallback instead of rendering forbidden data.

## 4. Responsive navigation and accessibility

- [x] 4.1 Implement desktop sidebar behavior.
- [x] 4.2 Implement tablet collapsed rail behavior.
- [x] 4.3 Implement accessible mobile drawer behavior.
- [x] 4.4 Add focus management, Escape-to-close, and return-focus behavior for the drawer.
- [x] 4.5 Preserve accessible names, `aria-current`, skip-link, and keyboard navigation behavior.
- [x] 4.6 Ensure keyboard and focus styling remains visible against the red sidebar and neutral canvas.
- [x] 4.7 Keep reduced-motion behavior and current-route indication accessible without relying on color alone.
- [x] 4.8 Keep active and badge states distinguishable without relying on color alone.

## 5. Route cleanup and truthful UI

- [x] 5.1 Remove page-local primary navigation blocks and back-link clusters where shell navigation now covers them.
- [x] 5.2 Keep only context-specific next actions inside workflow pages.
- [ ] 5.3 Hide, disable, or replace placeholder controls that do not trigger real workflows.
- [x] 5.4 Keep cashier/supervisor/admin overview pages focused on truthful operational context instead of decorative analytics.

## 6. Verification

- [x] 6.1 Add route-visibility, role-gating, and auth-fallback tests.
- [x] 6.2 Add active-state, breadcrumb, and navigation-metadata tests.
- [x] 6.3 Add lookup → earn/redeem deep-link tests with authoritative rehydration.
- [ ] 6.4 Add Playwright coverage for desktop, tablet, mobile, and drawer focus behavior.
- [x] 6.5 Add visual regression coverage for expanded sidebar, collapsed rail, and drawer states.
- [ ] 6.6 Add tests for SYSTEM denial and sidebar badge freshness/failure behavior.
- [x] 6.7 Run lint, typecheck, build, and targeted browser checks.

## 7. Migration sequence

- [x] 7.1 Add the navigation registry.
- [ ] 7.2 Add AppSidebar.
- [x] 7.3 Add compact AppTopbar.
- [x] 7.4 Add the mobile navigation drawer.
- [x] 7.5 Refactor AppShell to use the new shell components.
- [x] 7.6 Create `/cashier/lookup`, `/cashier/earn`, and `/cashier/redeem` routes.
- [x] 7.7 Reduce `/cashier` to overview/launchpad behavior.
- [x] 7.8 Move shared workflow logic out of page imports where needed.
- [x] 7.9 Remove redundant page-local primary navigation blocks.
- [x] 7.10 Update design-system/application-shell documentation to reflect implementation.
