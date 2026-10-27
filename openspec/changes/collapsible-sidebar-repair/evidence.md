# Sidebar Repair Evidence

## Scope and impact

- Branch: `workflow-states-implementation`.
- Existing unrelated dirty files were preserved; no backend, database, financial controller, generated API, or RBAC changes were made.
- GitNexus impact before edits: `AppShell` LOW (1 direct upstream consumer), `AppSidebar` LOW (3 impacted candidates), `shellNavigationByRole` LOW, `RootLayout` LOW.
- GitNexus was repaired by deleting the corrupt `.gitnexus` index and rebuilding with `npx gitnexus analyze`. The index is now up-to-date at `9f971dc` with 12,559 nodes, 20,649 edges, 393 clusters, and 300 flows. Current `detect_changes` reports 12 files, 15 symbols, 6 affected processes, and HIGH aggregate risk because unrelated dirty `AGENTS.md`, `CLAUDE.md`, admin/supervisor, and `next.config.mjs` changes remain mixed with this work.

## Implementation evidence

- `AppShell` now passes `onToggleCollapse`; the toggle exposes `Collapse sidebar` / `Expand sidebar` and `aria-expanded`, and persists explicit state in localStorage with sessionStorage compatibility.
- `AppSidebar` owns brand/toggle/navigation/footer presentation. Expanded/collapsed desktop columns are 244px/76px, with labels hidden only for the collapsed modifier.
- Cashier navigation remains the canonical six-item order from `shellNavigationByRole`; Supervisor/Admin route data is untouched.
- Collapsed navigation retains accessible link labels/titles, active white pills, 44px targets, compact queue badge positioning, and accessible Help & Training/Logout icon controls.
- Mobile drawer retains focus trapping/inert shell/Escape restoration and now includes Help & Training and Logout.
- Root layout explicitly sets `viewport: { width: 'device-width', initialScale: 1 }`; session/device diagnostics remain `sr-only` in the topbar.
- Shell grid transition is 220ms and reduced-motion overrides remove the transition.

## Reviewed screenshots

- `apps/web/tests/workflow-routes.spec.ts-snapshots/sidebar-expanded-desktop-linux.png`: 1440px expanded sidebar, grouped navigation, footer, 244px rail, and no visible diagnostics leak.
- `apps/web/tests/workflow-routes.spec.ts-snapshots/sidebar-collapsed-desktop-linux.png`: 1440px collapsed 76px rail, centered mark, active icon pill, accessible icon-only footer controls.
- `apps/web/tests/workflow-routes.spec.ts-snapshots/sidebar-collapsed-tablet-linux.png`: 1024px collapsed tablet state without horizontal overflow.
- `apps/web/tests/workflow-routes.spec.ts-snapshots/sidebar-mobile-drawer-linux.png`: 390px mobile drawer with all six destinations, Help & Training, Logout, and focusable close control.

## Verification

- Focused Jest shell/navigation suites: passed.
- Affected Playwright workflow and browser accessibility suites: 17/17 passed.
- Web typecheck: passed.
- Web lint: passed.
- Web build: passed.
- Semgrep targeted shell scan: 0 findings.
- OpenSpec validation: valid.
- Prettier check for affected files and new artifacts: passed.

## Intentional limitations

- The mobile Help/Logout actions use existing supported routes/callbacks; no new backend capability was introduced.
- GitNexus aggregate scope remains contaminated by unrelated dirty files, and analyzer repair is outside this frontend change.
