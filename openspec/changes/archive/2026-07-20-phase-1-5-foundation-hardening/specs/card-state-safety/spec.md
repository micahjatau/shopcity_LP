## ADDED Requirements

### Requirement: Replaced cards are terminal
The system MUST treat a replaced card as terminal. A replaced card MUST NOT be reactivated or updated through the card status endpoint.

#### Scenario: Replaced card cannot be reactivated
- **WHEN** a supervisor attempts to set a replaced card back to ACTIVE
- **THEN** the system rejects the request

#### Scenario: Replaced card cannot be blocked again
- **WHEN** a supervisor attempts to update a replaced card to BLOCKED
- **THEN** the system rejects the request

### Requirement: Card status transitions must be concurrency-safe
The system MUST apply card status changes using a current-state check inside the write transaction so stale reads cannot overwrite a more recent replacement.

#### Scenario: Concurrent replacement wins over stale block update
- **WHEN** a card replacement and a block update race against each other
- **THEN** only one write succeeds and the other write fails without reverting the replaced state

#### Scenario: Valid active-to-blocked transition succeeds
- **WHEN** a supervisor blocks an active card with no concurrent state change
- **THEN** the card status changes to BLOCKED

### Requirement: Card activation requires active customer ownership
The system MUST only reactivate a blocked card when the customer is active and no other active card exists for that customer.

#### Scenario: Blocked card can be reactivated for an active customer
- **WHEN** a blocked card belongs to an active customer and no other active card exists
- **THEN** the system allows the card to become ACTIVE

#### Scenario: Inactive customer cannot reactivate a card
- **WHEN** a blocked card belongs to a blocked or suspended customer
- **THEN** the system rejects the activation request
