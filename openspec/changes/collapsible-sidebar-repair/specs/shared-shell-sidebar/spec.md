# Shared Shell Sidebar Specification

## ADDED Requirements

### Requirement: Sidebar collapse is explicit and persistent

The shared shell MUST expose a real collapse/expand control backed by `sidebarCollapsed`, with accessible state and persistence across navigation and reloads.

#### Scenario: Expanded sidebar can collapse

- **GIVEN** an authenticated desktop shell with the sidebar expanded
- **WHEN** the user activates the control labelled `Collapse sidebar`
- **THEN** the sidebar changes to the collapsed presentation
- **AND** the control exposes `aria-expanded="false"` and `aria-label="Expand sidebar"`
- **AND** the main content resizes without horizontal overflow

#### Scenario: Collapsed sidebar can expand

- **GIVEN** an authenticated desktop shell with a collapsed sidebar
- **WHEN** the user activates the control labelled `Expand sidebar`
- **THEN** navigation labels and the expanded layout return
- **AND** the control exposes `aria-expanded="true"` and `aria-label="Collapse sidebar"`

#### Scenario: Preference survives reload without affecting mobile

- **GIVEN** a user has explicitly chosen a sidebar state
- **WHEN** the user navigates or reloads at a desktop/tablet viewport
- **THEN** the chosen state is restored
- **AND** at a phone viewport the mobile drawer remains the navigation surface and the stored desktop preference does not hide drawer controls

### Requirement: Desktop shell widths and layout are state-driven

The desktop shell MUST use a 244px expanded sidebar and 76px collapsed sidebar, keep the navigation grouped beneath the brand, and place the footer at the bottom without stretching navigation items.

#### Scenario: Expanded desktop geometry

- **GIVEN** a 1440px or 1024px viewport and an expanded state
- **WHEN** the shell renders
- **THEN** the sidebar width is 244px
- **AND** all role-allowed labels are visible in canonical order
- **AND** the main content has no horizontal overflow

#### Scenario: Collapsed desktop geometry

- **GIVEN** a 1440px, 1024px, or 768px viewport and a collapsed state
- **WHEN** the shell renders
- **THEN** the sidebar width is 76px
- **AND** the brand is centered
- **AND** icons remain grouped near the top with usable touch targets
- **AND** footer controls remain available as accessible icon buttons

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

Collapsed links MUST retain accessible names, active state, queue badge information, and canonical `shellNavigationByRole` destinations for Cashier, Supervisor, and Admin.

#### Scenario: Collapsed navigation remains identifiable

- **GIVEN** a collapsed sidebar
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

### Requirement: Shell motion respects reduced motion

Sidebar width and corresponding content resizing MUST transition over 200–240ms in normal mode and avoid animated transitions when `prefers-reduced-motion: reduce` is active.

#### Scenario: Reduced motion

- **GIVEN** the user prefers reduced motion
- **WHEN** the sidebar changes state
- **THEN** width/content transitions are disabled or minimized
- **AND** navigation remains usable without animated icon movement
