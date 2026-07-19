## ADDED Requirements

### Requirement: Public config tenant and branch must match
The system MUST only return public configuration when the configured tenant and branch belong to the same ownership context. If the configured tenant and branch do not match, the system MUST reject the request instead of returning mixed data.

#### Scenario: Matching tenant and branch are returned
- **WHEN** the configured tenant and branch belong to the same tenant
- **THEN** the system returns the public tenant and branch configuration

#### Scenario: Mismatched tenant and branch is rejected
- **WHEN** the configured tenant and branch do not belong to the same tenant
- **THEN** the system rejects the request and does not return public configuration

### Requirement: Replaced cards are terminal
The system MUST treat a replaced card as terminal. A replaced card MUST NOT be reactivated through the card status endpoint.

#### Scenario: Replaced card cannot be reactivated
- **WHEN** a supervisor attempts to set a replaced card back to ACTIVE
- **THEN** the system rejects the request

#### Scenario: Active card can still be blocked
- **WHEN** a supervisor sets an active card to BLOCKED
- **THEN** the system updates the card status to BLOCKED

### Requirement: Card replacement keeps one active card per customer
When a card is replaced, the system MUST mark the old card as replaced and create a new active card for the same customer. The customer MUST still have at most one active card after the replacement completes.

#### Scenario: Card replacement keeps the old card inactive
- **WHEN** a supervisor replaces an active card with a new barcode
- **THEN** the old card is marked as replaced and the new card becomes the active card

#### Scenario: Replacement does not create duplicate active cards
- **WHEN** a replacement completes
- **THEN** the customer has exactly one active card
