## ADDED Requirements

### Requirement: Supervisor pages share the customer-profile typography system

Every Supervisor dashboard route and the Supervisor customer profile SHALL use the Inter font family and a consistent rem-based hierarchy based on the existing customer-profile typography tokens. Route titles SHALL use the page-title role; section headings SHALL be subordinate; body/value text SHALL use primary neutral text; supporting labels and metadata SHALL use muted neutral text. Font weights SHALL use the existing regular, medium, semibold, and bold tokens. Supporting text SHALL NOT be smaller than 0.75rem.

#### Scenario: Supervisor navigates between dashboard pages

- **WHEN** a Supervisor route is rendered
- **THEN** its page title, section headings, body, labels, and metadata follow the shared profile typography hierarchy
- **AND** typography uses the existing rem-based profile tokens and Inter font family
- **AND** primary text is near-black and supporting text is muted

#### Scenario: Dense labels and metadata are rendered

- **WHEN** a table, status, form, or metadata label is rendered on a Supervisor page
- **THEN** its font size is at least 0.75rem
- **AND** text remains legible without changing the component's layout or color

### Requirement: Typography unification preserves role isolation and page behavior

The Supervisor typography migration SHALL be scoped to Supervisor route content and SHALL NOT alter Admin or Cashier route typography, shared workflow defaults, button/sidebar colors, page geometry, copy, controls, business logic, data, or API behavior.

#### Scenario: Shared workspace is rendered outside the Supervisor role

- **WHEN** an Admin or Cashier route renders a shared workspace component
- **THEN** its typography and available presentation remain unchanged

#### Scenario: Supervisor route is rendered at supported viewport widths

- **WHEN** a Supervisor page is rendered at desktop, tablet, or phone width
- **THEN** it retains its existing layout and color styling
- **AND** typography does not cause clipping or document-level horizontal overflow
