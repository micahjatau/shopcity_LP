## ADDED Requirements

### Requirement: Customer search, list, and detail are first-class workflows

The frontend SHALL expose customer search and list views instead of only descriptive labels.

#### Scenario: Search returns matching customers

- **GIVEN** a cashier, supervisor, or admin opens customer search
- **WHEN** they search by identity, phone, or other supported lookup term
- **THEN** matching customers are listed with enough context to pick the right account

#### Scenario: Detail shows balance and activity

- **GIVEN** a customer is selected
- **WHEN** the detail view loads
- **THEN** the user sees customer status, balance, linked cards, and recent transaction history where available

### Requirement: Customer create, edit, and status changes are role-aware

The frontend SHALL expose customer create, edit, and status workflows only to allowed roles.

#### Scenario: Authorized staff can create or edit a customer

- **GIVEN** a supervisor or admin opens customer management
- **WHEN** they submit valid create or edit data
- **THEN** the customer is saved and the detail view reflects the new state

#### Scenario: Unauthorized status change is blocked

- **GIVEN** a cashier attempts to open a customer status action
- **WHEN** the workflow evaluates permissions
- **THEN** the status change is hidden or rejected with an authorization-aware explanation

### Requirement: Customer detail includes balance and transaction history

The frontend SHALL show the customer context that cashiers and supervisors need to make decisions.

#### Scenario: Detail includes financial history

- **GIVEN** a customer has prior earn or redeem activity
- **WHEN** the detail view renders
- **THEN** the balance, transaction history, and linked card information are visible

### Requirement: Card lookup and management are real workflows

The frontend SHALL expose card lookup, assignment, replacement, blocking/unblocking, and status changes.

#### Scenario: Lookup reveals card and customer context

- **GIVEN** a user enters a card serial number
- **WHEN** the lookup action runs
- **THEN** the UI shows the card status, assigned customer, and available balance context

#### Scenario: Replacement is deliberate and consequential

- **GIVEN** a supervisor or admin starts card replacement
- **WHEN** the replacement is reviewed
- **THEN** the UI shows the current card, replacement consequence, and confirmation step before submission

#### Scenario: Blocking and unblocking remain visible

- **GIVEN** a card is blocked or unblocked
- **WHEN** the workflow completes
- **THEN** the resulting state is reflected immediately in both card and customer views
