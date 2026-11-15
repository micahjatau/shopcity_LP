# Design: Hover-Expandable Shared Sidebar

## Context

The shared shell previously exposed a persistent click-to-collapse control and used React state plus local/session storage to switch between 244px and 76px layouts. The requested interaction is a compact navigation rail that expands on hover, without moving the main column. The mobile drawer remains the phone navigation surface, and touch-only tablet users must not depend on hover to see labels. The sidebar also remains viewport-height while page content flows naturally.

## Decisions

1. **Use a 76px resting rail on hover-capable desktop/tablet viewports.** Remove the collapse button, React collapse state, resize listener, and local/session preference reads/writes. Ignore any legacy `shopcity:shell:sidebar-collapsed` value.
2. **Expand temporarily over the main column.** At pointer hover or keyboard `:focus-within`, widen the sidebar to 244px with a shadow and visible labels. Keep the shell grid at 76px so the main column does not shift. Restore the rail when the pointer and focus leave.
3. **Keep touch-only desktop/tablet navigation expanded.** At widths of 621px and above with `(hover: none)`, use the 244px layout and show navigation labels and the full wordmark. This avoids a hover-only control surface for touch users.
4. **Keep interaction and presentation in CSS.** `AppSidebar` owns two responsive brand images, canonical role navigation, active state, footer actions, and accessible link labels/titles. No new button or sidebar-specific React state is introduced.
5. **Preserve the mobile drawer.** Below 621px, hide the permanent sidebar and leave drawer open/close, focus trap, inertness, Help & Training, Logout, and focus restoration unchanged.
6. **Preserve one canonical navigation source.** `shellNavigationByRole` remains authoritative for route order, role visibility, and active matching.
7. **Keep sidebar height independent of page content.** The sticky sidebar remains viewport-height with internal vertical overflow; long main content grows the document without stretching the sidebar. Hide the scrollbar track visually but retain wheel, touch, and keyboard scrolling for overflow.
8. **Respect accessibility and reduced motion.** Keyboard focus expands the rail until focus leaves; collapsed links retain `aria-label`/`title`; footer controls retain accessible names. The width/shadow transition remains 220ms and is disabled for reduced motion.

## Risks

- The 244px hover panel overlays the left side of the main column. A clear shadow and stable main-column position signal that this is temporary without causing layout shift.
- Touch-only tablet layouts use the full 244px sidebar because hover is unavailable; verify no horizontal overflow at 621–920px.
- Two logo assets are present in markup; CSS must ensure only the appropriate one is visible in each interaction/input mode.
- Sidebar overflow and hover expansion must remain usable at short viewport heights.

## Verification

Run focused AppShell Jest and shell/navigation Playwright tests. Verify the 76px resting rail and no collapse button, pointer hover expansion and collapse on leave, focus-within expansion, unchanged main-column x-position, touch-only tablet fallback, 100vh sidebar/page-content behavior, hidden scrollbar with wheel-scrollable overflow, 52×52 compact logo restoration, mobile drawer behavior, and reduced motion. Inspect updated desktop/tablet screenshots. Run typecheck, targeted lint, Prettier, and strict OpenSpec validation; preserve unrelated dirty files.
