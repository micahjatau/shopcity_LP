## ADDED Requirements

### Requirement: Cashier lookup resolves identity and policy context before mutation

The cashier workflow SHALL let the user scan or type a card or receipt identifier and resolve customer and card context before earn or redeem submission.

#### Scenario: Lookup returns actionable context

- **GIVEN** a cashier enters a valid card or receipt identifier
- **WHEN** the lookup action runs
- **THEN** the UI displays customer identity, card status, balance, and relevant policy context
- **AND** earn/redeem actions become available from that context

#### Scenario: Lookup failure stays within the cashier flow

- **GIVEN** an identifier cannot be resolved
- **WHEN** the lookup action fails
- **THEN** the cashier sees a recoverable error state
- **AND** no transaction draft is silently discarded

### Requirement: Earn and redeem are review-and-confirm workflows

The cashier workflow SHALL require a review step that shows the consequences of the transaction before submission.

#### Scenario: Earn shows expected outcome before submit

- **GIVEN** the cashier has resolved a customer and enters a purchase amount
- **WHEN** the earn draft is complete
- **THEN** the UI shows expected credit, new balance, expiry context, and any approval or SMS status that may result
- **AND** the cashier confirms before submission

#### Scenario: Redeem shows allowed amount before submit

- **GIVEN** the cashier has resolved a customer and enters a basket amount
- **WHEN** the redeem draft is complete
- **THEN** the UI shows the available balance, allowed redemption limit, and resulting balance
- **AND** the cashier confirms before submission

### Requirement: Transaction drafts reuse the same logical idempotency context

The cashier workflow SHALL preserve the same logical draft across refreshes and retries.

#### Scenario: Retry does not create a new logical transaction

- **GIVEN** a cashier has already prepared an earn or redeem draft
- **WHEN** the user retries after a network failure or refreshes the page
- **THEN** the workflow reuses the same logical draft context
- **AND** the backend does not receive an accidental duplicate transaction identity

### Requirement: Transaction results are rich and navigable

The cashier workflow SHALL present the backend result in a form the cashier can act on.

#### Scenario: Success result shows customer and transaction details

- **WHEN** an earn or redeem request succeeds
- **THEN** the result view shows the customer, transaction identifier, amount, balance effect, and status
- **AND** the user can navigate to customer detail or start a new transaction
