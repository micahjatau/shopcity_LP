## 1. Shell, session, and navigation registry

- [ ] 1.1 Add a typed navigation registry as the single source of truth for role navigation.
- [ ] 1.2 Refactor the app shell so sidebar, topbar, and mobile drawer composition is shared.
- [ ] 1.3 Move session bootstrap, route gating, logout, and shell-level sync status into the shell boundary.
- [ ] 1.4 Align active-state, breadcrumb, and page-title metadata with the registry.
- [ ] 1.5 Surface live public branch, timezone, policy, tenant, and device context in shell-level UI.
- [ ] 1.6 Keep SYSTEM out of the interactive human shell and fail closed on unsupported access.
- [ ] 1.7 Show branch/device summary in the sidebar footer or equivalent shell context area.
- [ ] 1.8 Define trustworthy sidebar badge sources and freshness/failure behavior for operational counts.
- [ ] 1.9 Decide whether collapsed sidebar state persists per user/session and implement if required.

## 2. Cashier workflow routing

- [ ] 2.1 Split Lookup into a dedicated cashier route.
- [ ] 2.2 Split Earn into a dedicated cashier route.
- [ ] 2.3 Split Redeem into a dedicated cashier route.
- [ ] 2.4 Keep `/cashier` as an overview/launchpad page.
- [ ] 2.5 Surface persistent cashier sync/branch/device context in the shell.
- [ ] 2.6 Rehydrate authoritative customer/card context from stable route identifiers before financial actions.

## 3. Supervisor/Admin workflow reuse

- [ ] 3.1 Extract shared workflow components for cross-role reuse.
- [ ] 3.2 Remove page-level reuse between roles where shared workflow components are available.
- [ ] 3.3 Keep backend authorization authoritative for all workflow actions.
- [ ] 3.4 Ensure unauthorized routes show an auth-aware fallback instead of rendering forbidden data.

## 4. Responsive navigation and accessibility

- [ ] 4.1 Implement desktop sidebar behavior.
- [ ] 4.2 Implement tablet collapsed rail behavior.
- [ ] 4.3 Implement accessible mobile drawer behavior.
- [ ] 4.4 Add focus management, Escape-to-close, and return-focus behavior for the drawer.
- [ ] 4.5 Preserve accessible names, `aria-current`, skip-link, and keyboard navigation behavior.
- [ ] 4.6 Ensure keyboard and focus styling remains visible against the red sidebar and neutral canvas.
- [ ] 4.7 Keep reduced-motion behavior and current-route indication accessible without relying on color alone.
- [ ] 4.8 Keep active and badge states distinguishable without relying on color alone.

## 5. Route cleanup and truthful UI

- [ ] 5.1 Remove page-local primary navigation blocks and back-link clusters where shell navigation now covers them.
- [ ] 5.2 Keep only context-specific next actions inside workflow pages.
- [ ] 5.3 Hide, disable, or replace placeholder controls that do not trigger real workflows.
- [ ] 5.4 Keep cashier/supervisor/admin overview pages focused on truthful operational context instead of decorative analytics.

## 6. Verification

- [ ] 6.1 Add route-visibility, role-gating, and auth-fallback tests.
- [ ] 6.2 Add active-state, breadcrumb, and navigation-metadata tests.
- [ ] 6.3 Add lookup → earn/redeem deep-link tests with authoritative rehydration.
- [ ] 6.4 Add Playwright coverage for desktop, tablet, mobile, and drawer focus behavior.
- [ ] 6.5 Add visual regression coverage for expanded sidebar, collapsed rail, and drawer states.
- [ ] 6.6 Add tests for SYSTEM denial and sidebar badge freshness/failure behavior.
- [ ] 6.7 Run lint, typecheck, build, and targeted browser checks.

## 7. Migration sequence

- [ ] 7.1 Add the navigation registry.
- [ ] 7.2 Add AppSidebar.
- [ ] 7.3 Add compact AppTopbar.
- [ ] 7.4 Add the mobile navigation drawer.
- [ ] 7.5 Refactor AppShell to use the new shell components.
- [ ] 7.6 Create `/cashier/lookup`, `/cashier/earn`, and `/cashier/redeem` routes.
- [ ] 7.7 Reduce `/cashier` to overview/launchpad behavior.
- [ ] 7.8 Move shared workflow logic out of page imports where needed.
- [ ] 7.9 Remove redundant page-local primary navigation blocks.
- [ ] 7.10 Update design-system/application-shell documentation to reflect implementation.
