## ADDED Requirements

### Requirement: All Supervisor pages share the Cashier page-title hierarchy

The seven Supervisor routes (`/supervisor`, `/supervisor/approvals`, `/supervisor/cards`, `/supervisor/customers`, `/supervisor/fraud`, `/supervisor/reports`, and `/supervisor/transactions`) SHALL use the shared Cashier page-title and description typography. Each route SHALL have one clear H1 followed by subordinate section headings and readable body copy. Supervisor-scoped styles SHALL NOT alter Admin or Cashier consumers of shared workspaces.

#### Scenario: Supervisor navigates among page workspaces

- **WHEN** any of the seven Supervisor routes is rendered
- **THEN** its title and description use the same computed font family, size, weight, line height, and color as the Cashier workflow page header
- **AND** its section headings are visibly subordinate to the H1 and body copy is subordinate to section headings
- **AND** the route has exactly one H1

### Requirement: Supervisor copy is concise, role-specific, and truthful

Supervisor page titles and supporting copy SHALL explain the job of each route in language appropriate to a supervisor. Copy SHALL preserve the distinction between finding customers, managing cards, reviewing approvals, investigating fraud, reading reports, and inspecting/reversing transactions. It SHALL NOT imply authority or outcomes beyond the existing backend data and actions.

#### Scenario: Supervisor reviews a decision or investigation

- **WHEN** the Approvals or Fraud workspace is displayed
- **THEN** copy describes reviewing available decision/evidence details and submitting an existing action
- **AND** copy does not claim that selection or submission guarantees an accepted decision or resolved fraud finding

#### Scenario: Supervisor reads reports or transaction detail

- **WHEN** Reports or Transactions is displayed
- **THEN** copy describes the available report/transaction task and relevant limits without claiming unknown freshness or changing reversal semantics

#### Scenario: Supervisor manages customers or cards

- **WHEN** Customers or Cards is displayed
- **THEN** copy clearly distinguishes customer profile work from card assignment, replacement, and status work
- **AND** all current search, profile, card, and role-gated actions remain unchanged

### Requirement: Presentation-only migration preserves shared workflow behavior

The Supervisor typography/copy migration SHALL preserve data requests, data scope, status derivation, authorization, available controls, controller state, and API behavior. Any shared workspace presentation change SHALL be explicitly opt-in for Supervisor routes, leaving Admin/Cashier defaults intact.

#### Scenario: Shared workspace is rendered for another role

- **WHEN** `CustomerWorkspace` or `TransactionWorkspace` is rendered by an Admin or Cashier route
- **THEN** its default presentation and supported actions remain unchanged by the Supervisor-specific variant
- **AND** existing role and workflow regression tests continue to pass

### Requirement: Supervisor copy and layout reflow responsively

The title, description, supporting copy, and actions SHALL remain readable and operable at desktop, tablet, and phone workspace widths without document-level horizontal overflow.

#### Scenario: Supervisor page renders at desktop, tablet, and phone widths

- **WHEN** each Supervisor route is rendered at 1440, 768, and 375 CSS pixels
- **THEN** the shared page heading remains visible and correctly ordered
- **AND** page content reflows without clipping or document-level horizontal overflow
