## ADDED Requirements

### Requirement: Contract usage stays generated-client-first

The frontend SHALL continue to use the generated OpenAPI client as the source of truth for backend access.

#### Scenario: Workflow screens use generated client data

- **GIVEN** a workflow screen needs backend data
- **WHEN** it loads or submits
- **THEN** it uses the generated client or a minimal adapter around it
- **AND** the screen does not duplicate backend DTOs as permanent hand-written types

#### Scenario: True contract gaps are split out

- **GIVEN** a workflow cannot be completed because the backend response shape is insufficient
- **WHEN** the gap is discovered during implementation
- **THEN** the issue is recorded as a separate contract change rather than solved by inventing UI behavior

### Requirement: Accessibility and loading states remain correct

The frontend SHALL preserve accessible and usable states while the workflows are rebuilt.

#### Scenario: Keyboard and screen reader behavior remains intact

- **GIVEN** a user navigates with keyboard or assistive technology
- **WHEN** they move through the new workflow routes
- **THEN** focus order, labels, and announcements remain usable

#### Scenario: Loading and error states are actionable

- **GIVEN** a workflow is loading or fails
- **WHEN** the state is displayed
- **THEN** the UI offers a truthful and actionable fallback instead of a decorative shell

### Requirement: Quality gates prove the workflows are usable

The frontend SHALL be covered by route, accessibility, visual-regression, and e2e tests.

#### Scenario: Cashier flow is e2e-covered

- **GIVEN** the cashier workflow is implemented
- **WHEN** tests run
- **THEN** lookup → earn/redeem → result → customer detail is covered end to end

#### Scenario: Admin and supervisor workspaces are covered

- **GIVEN** the supervisor and admin workspaces are implemented
- **WHEN** tests run
- **THEN** transaction review, reversal, approvals, fraud, reports, users, devices, branches, audit, and pilot health are covered by appropriate regression tests
