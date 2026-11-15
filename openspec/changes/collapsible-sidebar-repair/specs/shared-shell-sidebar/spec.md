# Shared Shell Sidebar Specification

## ADDED Requirements

### Requirement: Sidebar expands on pointer hover and keyboard focus

On hover-capable desktop/tablet viewports, the shared shell MUST show a 76px rail by default and temporarily expand it to 244px over the main column when hovered or focused. The main column MUST NOT shift. The shell MUST NOT expose a click-to-collapse button or persist a manual sidebar preference.

#### Scenario: Pointer hover expands and leaving restores the rail

- **GIVEN** an authenticated hover-capable desktop/tablet shell at its 76px resting rail
- **WHEN** the pointer enters the sidebar
- **THEN** the sidebar expands to 244px and reveals the full wordmark and navigation labels
- **AND** the main column remains at its original horizontal position
- **WHEN** the pointer leaves the sidebar and it has no keyboard focus
- **THEN** the sidebar returns to the 76px rail
- **AND** the 52×52 compact brand mark is restored

#### Scenario: Keyboard focus expands navigation

- **GIVEN** an authenticated desktop/tablet shell at its 76px resting rail
- **WHEN** keyboard focus enters a sidebar link or action
- **THEN** the sidebar expands and reveals the navigation labels
- **AND** each destination retains an accessible name and title
- **WHEN** focus leaves the sidebar
- **THEN** the sidebar returns to the resting rail

#### Scenario: Touch-only desktop/tablet does not require hover

- **GIVEN** a touch-only viewport at least 621px wide
- **WHEN** the shell renders
- **THEN** the full 244px sidebar and navigation labels remain visible
- **AND** no collapse/expand button is required
- **AND** at phone widths the existing mobile drawer remains the navigation surface

### Requirement: Desktop and tablet rail geometry preserves content layout

On hover-capable desktop/tablet viewports, the resting sidebar MUST be 76px wide and MUST overlay, rather than resize, the main column when temporarily expanded to 244px. Touch-only viewports at least 621px wide MUST use the full 244px sidebar. Navigation MUST remain grouped beneath the brand, with footer actions at the bottom and no stretched navigation items.

#### Scenario: Hover-capable rail geometry

- **GIVEN** a 1440px, 1024px, 920px, or 768px hover-capable viewport
- **WHEN** the pointer is outside the sidebar and it has no keyboard focus
- **THEN** the resting rail is 76px wide
- **AND** icons remain grouped near the top with usable touch targets
- **AND** footer controls remain available with accessible names

#### Scenario: Expanded overlay geometry

- **GIVEN** a hover-capable viewport with the sidebar hovered or focused
- **WHEN** the sidebar expands
- **THEN** the sidebar is 244px wide and its labels are visible
- **AND** the main column remains at its resting horizontal position
- **AND** the page has no horizontal overflow

#### Scenario: Touch-only desktop/tablet geometry

- **GIVEN** a touch-only viewport at least 621px wide
- **WHEN** the shell renders
- **THEN** the sidebar is 244px wide
- **AND** all role-allowed labels are visible in canonical order
- **AND** the main content has no horizontal overflow

### Requirement: Sidebar height follows the viewport while shell content flows naturally

The desktop and tablet sidebar MUST remain viewport-height and independently scrollable when its navigation exceeds the available space. Its visible scrollbar track MUST be hidden without disabling wheel, touch, or keyboard scrolling. The main column MUST remain in normal document flow and determine page height from its content; sidebar height MUST NOT grow with a long page.

#### Scenario: Long shell content does not stretch the sidebar

- **GIVEN** a desktop or tablet viewport with shell content taller than the viewport
- **WHEN** the user scrolls the page
- **THEN** the sidebar remains sticky at the top and exactly viewport-height
- **AND** the main column and document grow to fit their content
- **AND** the main content remains vertically scrollable without horizontal overflow

#### Scenario: Sidebar navigation remains accessible on a short viewport

- **GIVEN** a desktop or tablet viewport whose height is shorter than the sidebar's combined navigation and footer content
- **WHEN** the shell renders
- **THEN** the sidebar remains viewport-height
- **AND** its visible scrollbar track is hidden
- **AND** its overflowing content remains reachable by wheel, touch, or keyboard scrolling within the sidebar

### Requirement: Tablet presentation follows available input

At tablet widths from 621px through 920px, the shell MUST use the same hover/focus rail behavior as desktop when hover is available, and MUST keep the full sidebar expanded when hover is unavailable. The layout MUST NOT depend on persisted manual collapse state.

#### Scenario: Resizing across desktop and tablet widths

- **GIVEN** a hover-capable shell at a desktop or tablet viewport
- **WHEN** the viewport is resized across 920px while remaining at least 621px wide
- **THEN** the 76px resting rail and hover/focus expansion remain available
- **AND** the main column does not shift when the sidebar expands

#### Scenario: Touch-only tablet remains readable

- **GIVEN** a touch-only viewport from 621px through 920px
- **WHEN** the shell renders or resizes within that range
- **THEN** the full sidebar labels remain visible without requiring hover or a toggle

### Requirement: Mobile uses an accessible drawer

At 390px and 375px widths the permanent sidebar MUST be hidden and the existing mobile drawer MUST provide all role navigation plus Help & Training and Logout.

#### Scenario: Mobile drawer contents

- **GIVEN** a phone viewport
- **WHEN** the user opens the mobile navigation drawer
- **THEN** all role-allowed destinations appear in canonical order
- **AND** Help & Training and Logout are reachable
- **AND** the close control receives focus

#### Scenario: Mobile drawer keyboard lifecycle

- **GIVEN** the mobile drawer is open
- **WHEN** the user presses Escape or closes it
- **THEN** the drawer closes
- **AND** focus returns to the menu button
- **AND** the shell content is no longer inert

### Requirement: Sidebar identity and role authority are preserved

Rail links MUST retain accessible names, active state, queue badge information, and canonical `shellNavigationByRole` destinations for Cashier, Supervisor, and Admin.

#### Scenario: Resting rail remains identifiable

- **GIVEN** the resting 76px rail
- **WHEN** a keyboard or assistive-technology user inspects navigation
- **THEN** each icon link has an accessible label and tooltip/equivalent title
- **AND** the active route remains represented by the approved white pill/circle
- **AND** the Sync Queue count remains available in a compact accessible form

### Requirement: Topbar diagnostics do not leak visually

Session and device diagnostics MUST remain available to assistive technology while being visually hidden, and the topbar MUST remain usable without overflow at required viewport widths.

#### Scenario: Diagnostic copy is screen-reader-only

- **GIVEN** an authenticated shell
- **WHEN** the topbar renders
- **THEN** session/device diagnostic text is not visible in the visual layout
- **AND** it remains exposed to assistive technology

### Requirement: Sidebar motion respects reduced motion

Sidebar overlay width and shadow MUST transition over 200–240ms in normal mode and avoid animated transitions when `prefers-reduced-motion: reduce` is active. Expanding the sidebar MUST NOT animate or resize the main column.

#### Scenario: Reduced motion

- **GIVEN** the user prefers reduced motion
- **WHEN** the sidebar expands or returns to the rail
- **THEN** width and shadow transitions are disabled or minimized
- **AND** navigation remains usable without animated icon movement
