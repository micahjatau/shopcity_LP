## Purpose

Provide reproducible evidence that Cashier workflows and shared shell roles preserve visual, accessibility, and interaction conformance across required routes, states, viewports, and motion preferences.

## ADDED Requirements

### Requirement: Required route and shell states are evidenced

The system SHALL define and execute a conformance matrix covering Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, Sync Queue, and Cashier, Supervisor, and Admin shell consumers.

#### Scenario: Required route state is applicable

- **WHEN** a route/state/viewport row is marked required
- **THEN** the evidence includes the required workflow assertion, computed-style capture, accessibility result, and visual artifact for that row

#### Scenario: Route state is not applicable

- **WHEN** a documented product contract makes a matrix row inapplicable
- **THEN** the row records the reason and does not invent unsupported UI behavior

### Requirement: Equivalent shared controls have comparable computed styles

The system SHALL compare equivalent component variants across required routes for typography, colors, borders, radii, dimensions, spacing, focus treatment, and documented tolerances.

#### Scenario: Equivalent controls match

- **WHEN** equivalent controls are captured in two required workflows under the same viewport and state
- **THEN** their computed-style report passes the canonical expected values or records an approved variant difference

#### Scenario: Shared control drifts

- **WHEN** a shared control differs outside the documented tolerance without an approved variant
- **THEN** conformance fails and identifies the route, state, property, and expected-versus-observed values

### Requirement: Conformance evidence covers responsive and motion conditions

The system SHALL cover desktop, tablet, and mobile viewports and SHALL verify reduced-motion behavior for animated surfaces where applicable.

#### Scenario: Responsive route remains usable

- **WHEN** a required route is rendered at each supported viewport
- **THEN** content remains usable without prohibited overflow, clipped controls, or inaccessible interaction targets

#### Scenario: Reduced motion is requested

- **WHEN** the browser prefers reduced motion
- **THEN** applicable transitions and animations are suppressed or reduced while required content and interaction remain available

### Requirement: Functional regressions block visual acceptance

The system SHALL not report design-system conformance as complete while required workflow, accessibility, or route-state tests fail.

#### Scenario: Required Playwright test fails

- **WHEN** a required route-state assertion, screenshot assertion, focus assertion, or request assertion fails
- **THEN** the conformance result is failed or blocked and the failure is recorded against the candidate revision

#### Scenario: All required evidence passes

- **WHEN** all required matrix rows and protected workflow checks pass
- **THEN** the report records the candidate revision, environment, commands, artifacts, accepted deviations, and residual risks
