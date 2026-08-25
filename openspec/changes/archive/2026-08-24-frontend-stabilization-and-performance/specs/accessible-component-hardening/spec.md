## MODIFIED Requirements

### Requirement: Interactive shell controls are keyboard and screen-reader complete

The frontend SHALL provide semantic names, visible focus, keyboard operation, and appropriate state announcements for shell controls, mobile drawer controls, cashier task actions, loading states, errors, and confirmations.

#### Scenario: Keyboard user opens mobile navigation

- **WHEN** a keyboard user activates the navigation trigger
- **THEN** focus moves into the drawer
- **AND** the drawer has a labelled dialog/navigation region
- **AND** focus cannot escape until dismissal

#### Scenario: Cashier action is pending

- **WHEN** a cashier submits Lookup, Earn, or Redeem
- **THEN** the initiating control communicates its busy/disabled state
- **AND** the result or error is announced in an appropriate live region

### Requirement: Responsive states preserve usable targets and contrast

The frontend SHALL maintain readable labels, visible focus rings, WCAG AA contrast, and touch targets of at least 44 CSS pixels for shell and cashier controls across desktop, tablet, and mobile layouts.

#### Scenario: Collapsed rail renders

- **WHEN** the sidebar is collapsed
- **THEN** icon controls retain accessible labels or tooltips
- **AND** the rail does not rely on color alone to communicate the active route

#### Scenario: Mobile cashier workflow renders

- **WHEN** a cashier uses Lookup, Earn, or Redeem on a narrow viewport
- **THEN** controls do not clip or require horizontal scrolling
- **AND** primary actions remain reachable without a desktop-only hover interaction

### Requirement: Motion respects user preferences

Non-essential UI motion MUST be disabled or reduced when `prefers-reduced-motion: reduce` is active.

#### Scenario: Reduced motion is enabled

- **WHEN** the shell drawer or workflow transition occurs
- **THEN** content changes remain understandable without animated movement
- **AND** no perpetual animation is required to understand status

### Requirement: UI states provide actionable loading, empty, and error feedback

Interactive components SHALL render shape-matched loading states, useful empty states, and inline actionable errors rather than blank regions or generic decorative spinners.

#### Scenario: Lookup returns no customer

- **WHEN** the lookup completes with no match
- **THEN** the page explains what was searched
- **AND** it provides a retry or corrected-input action
