## ADDED Requirements

### Requirement: Redemption confirmation returns the complete settlement result

The system MUST return the authoritative redemption amount, net-paid amount, earned amount, redemption transaction ID, Earn transaction ID when present, and closing balance for a confirmed redemption settlement. A pending result MUST leave financial-effect fields unavailable until approval execution completes.

#### Scenario: Confirmed settlement response

- **WHEN** a redemption settlement commits
- **THEN** the response reports both confirmed ledger effects and the closing balance using integer kobo

#### Scenario: Pending settlement response

- **WHEN** redemption or basket-level Earn purchase policy requires approval
- **THEN** the response reports pending approval without claiming either financial effect is complete

### Requirement: Redemption approval executes one settlement

The system MUST execute a pending redemption debit and its net-paid Earn as one basket-level policy-revalidated financial transaction after approval; rejection and expiry MUST execute neither effect.

#### Scenario: Approved redemption settlement

- **GIVEN** a pending redemption settlement remains eligible under its captured policies
- **WHEN** an authorized supervisor approves it
- **THEN** redemption, allocations, Earn, credit lot, settlement notification, and approval execution commit together
