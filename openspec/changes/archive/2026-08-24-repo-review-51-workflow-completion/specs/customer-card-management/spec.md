## ADDED Requirements

### Requirement: Customer search and detail are first-class workflows

The frontend SHALL expose customer search, list, and detail views instead of only descriptive placeholders.

#### Scenario: Cashier can search customers

- **GIVEN** the cashier opens the customer workspace
- **WHEN** the cashier searches by customer identity or phone
- **THEN** matching customers are listed with enough context to choose the right account

#### Scenario: Customer detail shows balance and activity context

- **GIVEN** a customer is selected
- **WHEN** the customer detail view loads
- **THEN** the user can see balance, status, linked cards, and recent transaction history where available

### Requirement: Customer create, edit, and status changes are role-aware

The frontend SHALL expose customer creation, edit, and status workflows only to roles that are allowed to perform them.

#### Scenario: Authorized staff can create a customer

- **GIVEN** a supervisor or admin is on the customer workspace
- **WHEN** they open the create form and submit valid data
- **THEN** the new customer is created and shown in the UI

#### Scenario: Unauthorized staff cannot change customer status

- **GIVEN** a cashier opens a customer status control
- **WHEN** the status-changing action would exceed cashier permissions
- **THEN** the action is hidden or blocked with an authorization-aware explanation

### Requirement: Card management supports lookup, assignment, replacement, and status

The frontend SHALL expose card management flows that match the existing backend capabilities.

#### Scenario: Card lookup reveals card and customer state

- **GIVEN** a user enters a card serial number
- **WHEN** the lookup action runs
- **THEN** the UI shows the card status, assigned customer, and available balance context

#### Scenario: Card replacement is a deliberate workflow

- **GIVEN** a supervisor or admin starts a replacement
- **WHEN** the replacement is reviewed
- **THEN** the UI shows the current card, replacement consequence, and confirmation step before submission

#### Scenario: Card status changes remain visible

- **GIVEN** a card is blocked, unblocked, or otherwise status-changed
- **WHEN** the workflow completes
- **THEN** the resulting state is reflected immediately in the card and customer views
