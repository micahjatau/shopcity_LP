# Design: Shared Collapsible Sidebar Repair

## Context

`AppShell` currently owns shell layout/state while `AppSidebar` owns most sidebar markup and styles, but `AppShell` duplicates shell/sidebar CSS and does not pass a collapse handler. Tablet CSS currently forces a 76px rail and hides labels without updating React's `sidebarCollapsed` state, so the brand mark, toggle label, and accessible state can disagree with the visual rail. Mobile correctly has a drawer, but its footer only exposes branch metadata; Help & Training and Logout remain in the desktop sidebar. The topbar already marks session/device diagnostics `sr-only`, so verification must cover the compiled visual result and any responsive overflow.

## Decisions

1. **Persist explicit user intent in localStorage.** Read a validated boolean preference on mount and write on toggle. Keep the mobile drawer independent; mobile never renders the permanent sidebar and does not rewrite the desktop preference.
2. **Make `AppSidebar` the presentation owner.** `AppShell` supplies sections, state, and callbacks; `AppSidebar` owns brand/toggle/navigation/footer markup and its scoped styles. Remove duplicate sidebar/nav style declarations from `AppShell` where they compete.
3. **Use the real collapsed state for tablet resizing.** At 621–920px, a `matchMedia` listener sets the existing sidebar state to collapsed, so the DOM, accessible toggle, icon asset, and `76px minmax(0, 1fr)` grid all match the manual collapse presentation. Keep the saved explicit preference separate: restore it when leaving tablet range, and do not persist an automatic collapse. A manual toggle remains effective until the viewport crosses the breakpoint again. Below 621px the body is one column and the permanent sidebar is hidden; the mobile drawer remains independent.
4. **Use an explicit mobile action footer.** The mobile drawer renders Help & Training and Logout through the same callbacks/links as the desktop sidebar, preserving dialog focus trapping and close restoration.
5. **Preserve one canonical navigation source.** `shellNavigationByRole` remains the route/order authority. AppSidebar and mobile navigation consume the same sections and active matcher.
6. **Accessibility is state-aware.** Collapsed links retain `aria-label`/`title`, icons remain at least 44px targets, toggle exposes `aria-expanded`, and footer icon buttons retain accessible names. Labels are hidden only under `.shell-sidebar--collapsed`, never solely by viewport.
7. **Motion uses shell tokens with a reduced-motion override.** Width and main-column transitions are 220ms; reduced motion disables transitions. Individual nav links retain only subtle color transitions.

## Risks

- Existing tests currently expect expanded React state at tablet widths even though CSS forces a pseudo-collapsed rail. Update them to assert real state transitions at the 920px breakpoint and preference restoration above it.
- Session storage currently contains the preference key; read a legacy session value as a migration fallback, then persist the user’s next explicit choice in localStorage.
- Inline shell styles make accidental duplicate selectors easy; visual and geometry tests must inspect all required widths.

## Verification

Run affected Jest and Playwright shell/navigation suites, browser accessibility checks, and visual checks at 1440/1024/920/768/390/375. Verify entering 621–920px updates the actual state and restores the saved preference above 920px. Run typecheck, lint, build, Semgrep, and OpenSpec validation; inspect screenshots rather than accepting baseline updates blindly.
