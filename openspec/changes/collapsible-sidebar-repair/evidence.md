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

## Follow-up: automatic tablet collapse

- The real React collapse state now activates when resizing into 621–920px; it restores the saved manual preference above 920px and does not overwrite that preference during automatic collapse. Mobile navigation remains the existing drawer below 621px.
- Focused `app-shell.spec.tsx` passed (17 tests). The Playwright `repairs sidebar geometry, collapse state, and mobile drawer access` workflow passed with checks at 920px and 1024px, including the compact mark, accessible toggle state, preference restoration, and manual expansion at tablet width.
- Web typecheck, lint, strict OpenSpec validation, Prettier checks, and the production build passed. The build retains one existing React hook dependency warning in `supervisor-flagged-activity.tsx`.

## Follow-up: fixed-height sidebar and natural shell content flow

- `.shell-sidebar` now has border-box viewport height (`100vh` fallback, `100dvh` preferred), keeps sticky positioning, and uses its own vertical scroll when its contents exceed the viewport. The main column remains in normal document flow.
- Playwright coverage verifies that long shell content grows the main column/document while the sidebar remains 900px tall and sticky, and that the footer can be reached by scrolling the 420px-tall sidebar.
- Verification passed: `app-shell.spec.tsx` Jest, the focused sidebar Playwright workflow, web typecheck, targeted ESLint, Prettier checks, and strict OpenSpec validation. The Playwright run used installed Google Chrome 156 because the bundled headless-shell binary could not start (missing V8 startup snapshot); the full test including existing visual assertions passed under Chrome.
- No application build was rerun for this CSS-only follow-up; the browser test exercised the updated stylesheet. No shell state, navigation, API, or authorization code changed.

## Follow-up: hide the scrollbar and restore the compact logo size

- Kept the sticky sidebar at `100vh`/`100dvh` with `overflow-y: auto`, while hiding the visual scrollbar track using `scrollbar-width: none` and the WebKit scrollbar rule. Scrolling itself remains available.
- Removed only the extra inline padding from the resting rail's brand row so its existing 52×52 compact logo no longer shrinks to 28px; hover/focus and touch-expanded layouts retain their normal inset.
- Playwright asserts the hidden-scrollbar CSS, 52px computed compact-logo dimensions after the rail closes, and actual wheel scrolling at 768×420 with the sidebar still exactly viewport-height and its footer reachable. The hover/focus, touch-only tablet, mobile drawer, and Cashier/Admin artwork checks passed.
- Focused AppShell Jest, web typecheck, targeted ESLint, strict OpenSpec validation, Prettier, and `git diff --check` passed. Updated desktop/tablet rail, expanded, and Cashier/Admin artwork screenshots were reviewed.
- GitNexus impact for `AppSidebar` before this follow-up: LOW/exact, 4 impacted symbols, with ShellLayout and AppShellContent as affected flows; no HIGH/CRITICAL warning.
