## ADDED Requirements

### Requirement: Admin shell pages omit overview self-links

No Admin shell page MUST render a link or button labeled **Back to admin** that navigates to `/admin`. This applies to `/admin`, `/admin/transactions`, `/admin/approvals`, `/admin/fraud`, `/admin/customers`, `/admin/customers/new`, `/admin/cards`, `/admin/reports`, `/admin/operations`, `/admin/policies`, `/admin/users`, `/admin/devices`, `/admin/branches`, `/admin/audit`, and `/admin/adjustments`. Meaningful task navigation, the persistent Admin shell navigation, and Operations → Controls links MUST remain available. Supervisor and Cashier behavior MUST remain unchanged.

#### Scenario: Admin opens any dedicated route

- **GIVEN** an authorized Admin opens any route in the Admin shell
- **WHEN** the page header and route controls are rendered
- **THEN** no **Back to admin** self-link or button is shown
- **AND** the Admin shell continues to provide Overview navigation
- **AND** links to other task routes remain available.

#### Scenario: Admin opens a control destination

- **GIVEN** an authorized Admin opens Users, Devices, Branches, Audit, Adjustments, or Policies
- **WHEN** the route page is rendered
- **THEN** it does not show a **Back to admin** self-link
- **AND** its direct route and Operations → Controls entry remain unchanged.

#### Scenario: Non-Admin navigation is unchanged

- **GIVEN** a Supervisor or Cashier uses a shared component also rendered for Admin
- **WHEN** its page header is shown
- **THEN** its existing role-appropriate content and navigation remain unchanged.
