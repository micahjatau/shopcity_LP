## ADDED Requirements

### Requirement: Cashier lookup is the entry point for money-moving work

The cashier workflow SHALL let the user scan or type a card serial or receipt identifier and resolve usable context before earn or redeem.

#### Scenario: Lookup returns identity, balance, and policy context

- **GIVEN** a cashier enters a valid identifier
- **WHEN** the lookup action runs
- **THEN** the UI shows customer identity, card status, customer balance, expiring credit, and relevant policy context
- **AND** the workflow can proceed directly into earn, redeem, or customer detail

#### Scenario: Lookup failure stays recoverable

- **GIVEN** the identifier cannot be resolved
- **WHEN** the lookup action fails
- **THEN** the cashier sees a recoverable error state
- **AND** the previously entered draft context is not lost silently

### Requirement: Earn is a reviewed, confirmable workflow

The cashier workflow SHALL require a review step before earn submission.

#### Scenario: Earn preview shows expected credit and outcome

- **GIVEN** the cashier has selected a customer and entered a purchase amount
- **WHEN** the draft is complete
- **THEN** the UI shows the expected credit, new balance, expiry context, and any approval or SMS status the backend may return
- **AND** the cashier must confirm before submission

#### Scenario: Earn success shows rich transaction detail

- **WHEN** an earn request succeeds
- **THEN** the result view shows customer, card, transaction identifier, purchase amount, credited amount, balance effect, and status
- **AND** the user can navigate to customer detail or start a new transaction

### Requirement: Redeem is a reviewed, confirmable workflow

The cashier workflow SHALL require a review step before redeem submission.

#### Scenario: Redeem preview shows allowed amount and consequence

- **GIVEN** the cashier has selected a customer and entered a basket amount
- **WHEN** the draft is complete
- **THEN** the UI shows available balance, calculated maximum redemption, minimum redemption context, and resulting balance
- **AND** the cashier must confirm before submission

#### Scenario: Redeem success shows rich transaction detail

- **WHEN** a redeem request succeeds
- **THEN** the result view shows customer, card, transaction identifier, redeemed amount, balance effect, and status
- **AND** the user can navigate to customer detail or start a new transaction

### Requirement: Draft state and idempotency survive retry and refresh

The cashier workflow SHALL preserve the logical transaction draft long enough for a safe retry.

#### Scenario: Retry reuses the same logical draft

- **GIVEN** a cashier has already prepared an earn or redeem draft
- **WHEN** the page refreshes or the request is retried after a transient failure
- **THEN** the workflow restores the same logical draft context
- **AND** the backend does not receive a new accidental transaction identity for the same user intent

### Requirement: Customer detail is reachable from cashier outcomes

The cashier workflow SHALL let the user move from a transaction result into the related customer record.

#### Scenario: Result links into customer detail

- **GIVEN** an earn or redeem has completed
- **WHEN** the user selects the customer link
- **THEN** the customer detail view opens with balance and recent transaction context

### Requirement: Offline capture is visible inside cashier

The cashier workflow SHALL expose pending offline records and a path into sync.

#### Scenario: Offline badge links to sync queue

- **GIVEN** the browser has pending offline earn records
- **WHEN** the cashier opens the offline area
- **THEN** they can see the pending records and navigate into the sync queue
