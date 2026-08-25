## ADDED Requirements

### Requirement: Thirty-day reminder eligibility uses authoritative lot state

The system SHALL derive reminder eligibility from authoritative lot expiry state rather than cached balances or prior reminder output.

#### Scenario: Reminder window uses authoritative expiresAt

- **GIVEN** a lot has positive remaining credit
- **WHEN** its `expiresAt` falls exactly within the configured reminder horizon
- **THEN** the lot is eligible for reminder aggregation
- **AND** the reminder decision uses the authoritative `expiresAt` and current remaining amount

#### Scenario: Future or already expired lots are excluded

- **GIVEN** a lot expires outside the configured reminder horizon or is already expired
- **WHEN** the reminder sweep runs
- **THEN** that lot is excluded from the reminder payload

### Requirement: Reminder delivery is one customer-day and replay-safe

The system SHALL create at most one reminder intent per tenant, customer, and reminder date.

#### Scenario: One customer-day reminder aggregates multiple lots

- **GIVEN** one customer has multiple positive-balance lots expiring on the same reminder date
- **WHEN** the reminder sweep runs
- **THEN** the system creates one reminder intent for that customer/day
- **AND** the payload aggregates the total expiring amount plus earliest and latest expiry dates

#### Scenario: Repeat sweep does not create duplicate reminder work

- **GIVEN** a reminder intent already exists for the tenant, customer, and reminder date
- **WHEN** the same sweep is retried or another worker observes the same eligibility window
- **THEN** no second reminder intent, outbox event, or SMS work item is created

### Requirement: Reminder delivery does not change financial truth

The system SHALL keep SMS delivery outcomes operationally visible without changing credit validity.

#### Scenario: Fully consumed lots are excluded

- **GIVEN** a lot was once eligible for reminder consideration but is fully consumed before the sweep commits
- **WHEN** the reminder transaction revalidates the source state
- **THEN** that lot contributes nothing to the reminder totals

#### Scenario: SMS failure does not alter credit validity

- **GIVEN** a reminder SMS fails to send or deliver
- **WHEN** the provider returns a failure state
- **THEN** the customer's credit balance, lot validity, and expiry schedule remain unchanged
- **AND** the failure is recorded only as delivery/operational evidence
