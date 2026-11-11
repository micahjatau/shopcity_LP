# Admin/Supervisor Common-Page Style Parity

## Purpose

Require the seven common Admin destinations to use the existing Supervisor visual treatment for equivalent UI elements without replacing Admin workflows.

## ADDED Requirements

### Requirement: Common Admin pages match Supervisor presentation

The Admin pages `/admin`, `/admin/transactions`, `/admin/approvals`, `/admin/fraud`, `/admin/customers`, `/admin/cards`, and `/admin/reports` MUST match the corresponding Supervisor page's visual language for equivalent page chrome, typography, spacing, surfaces, controls, tables, pagination, dialogs, and responsive states. The existing Supervisor implementation is the style reference. Operational content, data scope, actions, role authorization, and route behavior MUST remain unchanged. Presentation labels and duplicate prototype scaffolding MAY be adapted to achieve parity.

#### Scenario: Admin views a common operational page

- **GIVEN** an authorized Admin opens one of the seven common Admin routes
- **WHEN** the page is compared with its Supervisor counterpart at the same viewport and equivalent state
- **THEN** equivalent headers, surfaces, controls, data tables, pagination, and interaction states use the same visual styling
- **AND** the Admin route retains its existing route, operational data source, content, and authorization.

#### Scenario: Admin customer directory matches Supervisor presentation

- **GIVEN** an authorized Admin opens `/admin/customers`
- **WHEN** the customer directory is rendered
- **THEN** it uses the same directory controls, table, pagination, and responsive styling as `/supervisor/customers`
- **AND** customer registration routes to the Admin registration flow
- **AND** opening a customer retains the existing Admin `canManage` profile and card-management actions.

#### Scenario: Admin approvals use the Supervisor presentation without Supervisor workflow

- **GIVEN** an authorized Admin opens `/admin/approvals`
- **WHEN** the approval queue is rendered
- **THEN** its page frame, filter controls, list surface, selected-item decision panel, and responsive split-pane use the Supervisor approval presentation
- **AND** Admin status/search/page-size behavior, request parameters, tenant scope, preset decision reasons, optional note, and approve/reject authorization remain unchanged
- **AND** Supervisor-only categories, customer-metric requests, and Supervisor customer links are not introduced.

#### Scenario: Admin Cards replicates the Supervisor issued-card workspace

- **GIVEN** an authorized Admin opens `/admin/cards`
- **WHEN** the issued-card directory and assignment action are rendered
- **THEN** the page uses the Supervisor Cards header, directory controls, issued-card table, pagination, and assignment dialog
- **AND** “View card” links to `/admin/customers?id=<customerId>&tab=virtual-card`
- **AND** the Admin profile opens its Virtual Card tab and retains verified replacement/status controls
- **AND** API authorization and data scope are determined by the signed-in Admin session, not by hard-coded Supervisor routing.

#### Scenario: Admin customer profile matches Supervisor presentation

- **GIVEN** an authorized Admin opens a customer from `/admin/customers`
- **WHEN** the profile is displayed
- **THEN** it uses the Supervisor customer-profile layout and presentation
- **AND** profile edits, Admin status confirmation, linked-card management, and Admin return/card destinations remain available
- **AND** the profile continues to use the authenticated Admin data scope.

#### Scenario: Admin-specific functionality remains available

- **GIVEN** the Admin is on a common page with role-specific actions
- **WHEN** styling parity is applied
- **THEN** Admin transaction reversals, approval and fraud decisions, customer/card management, and Admin report scope remain unchanged
- **AND** the page does not gain Supervisor-only actions or lose Admin controls.

#### Scenario: Responsive and state styling remains consistent

- **GIVEN** an Admin common page is loading, populated, empty, or in an error state
- **WHEN** the page is rendered at desktop, tablet, or mobile widths
- **THEN** its equivalent state and controls follow the paired Supervisor page's styling and responsive treatment
- **AND** existing Admin state handling and accessible behavior remain intact.
