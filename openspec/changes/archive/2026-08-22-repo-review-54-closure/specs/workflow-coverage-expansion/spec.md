## ADDED Requirements

### Requirement: Shared workflows must replace cross-role page reuse

The frontend SHALL implement Customer, Card, Transaction, Approval, and Fraud workflows as shared workspaces that are wrapped by role-specific pages rather than imported from another role's page file.

#### Scenario: Supervisor and admin pages render the same shared workspace

- **WHEN** a supervisor or admin opens a shared operational surface
- **THEN** the page composes a shared workspace with explicit capabilities
- **AND** it does not import a cashier page as its implementation

### Requirement: Cashier routes must be focused workflow compositions

The cashier overview SHALL launch dedicated Lookup, Earn, and Redeem routes that each render a focused workflow instead of a shared megascreen.

#### Scenario: Cashier opens Lookup

- **WHEN** the cashier opens the lookup route
- **THEN** the page renders customer/card lookup and result context
- **AND** it does not require the full Earn or Redeem forms to load

#### Scenario: Cashier opens Earn or Redeem

- **WHEN** the cashier opens Earn or Redeem
- **THEN** the page renders the focused workflow for that action
- **AND** the page does not duplicate the primary sidebar route grid

### Requirement: Normal cashier login must support device-bound Offline Earn

The cashier login flow SHALL surface a usable authenticated device identity so Offline Earn can operate through the normal UI path instead of a manual test-only workaround.

#### Scenario: A cashier signs in through the real form

- **WHEN** the cashier submits the normal login form
- **THEN** the resulting session provides a usable device identity for Offline Earn
- **AND** the workflow does not rely on a null or fabricated browser-local device fallback

#### Scenario: Offline Earn is attempted after login

- **WHEN** the cashier opens Offline Earn after signing in
- **THEN** the workflow can build its queue record from the authenticated session/device context
