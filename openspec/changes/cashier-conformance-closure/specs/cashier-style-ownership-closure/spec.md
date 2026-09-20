## Purpose

Provide an enforceable visual ownership contract so shared Cashier and shell controls have predictable appearance without allowing route composition styles to redefine them accidentally.

## ADDED Requirements

### Requirement: Canonical shared selectors have one declared owner

The system SHALL maintain a canonical registry for shared visual selector families, their owning stylesheet or component boundary, permitted variants, and documented exceptions.

#### Scenario: Production selector inventory has no undeclared duplicate owner

- **WHEN** the ownership check scans the production stylesheets
- **THEN** every canonical selector family is attributed to one owner or an explicit registered exception

#### Scenario: Intentional variant is registered

- **WHEN** a component variant changes layout or appearance intentionally
- **THEN** the variant is represented by a named modifier and recorded in the registry rather than by an undocumented ancestor override

### Requirement: Ownership checks reject competing visual definitions

The system SHALL fail validation when representative shared families for buttons, cards, inputs, forms, search, status, tables, dialogs, headers, flow panels, or shell controls are defined by competing owners without a registered exception.

#### Scenario: Duplicate selector fixture is introduced

- **WHEN** a test fixture defines the same canonical selector family in two non-owner stylesheets
- **THEN** the ownership check fails and identifies both conflicting owners

#### Scenario: Layout-only route rule is scanned

- **WHEN** a route stylesheet defines grid, flow, spacing, or breakpoint composition without redefining shared component material
- **THEN** the ownership check permits the rule

### Requirement: Cashier route styles preserve shared component ownership

The system SHALL keep route styles focused on composition and SHALL express legitimate component differences through explicit variants rather than scoped focus, heading, button, card, or control appearance overrides.

#### Scenario: Shared input is rendered in two Cashier workflows

- **WHEN** equivalent inputs appear in Capture Purchase and Redeem Credit
- **THEN** their shared visual properties come from the same input owner unless a documented variant applies

#### Scenario: Route layout changes

- **WHEN** a Cashier route changes its grid or panel arrangement
- **THEN** the change does not alter the shared appearance of buttons, inputs, cards, status, tables, dialogs, or headings
