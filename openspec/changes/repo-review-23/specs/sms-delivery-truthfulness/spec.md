## ADDED Requirements

### Requirement: Redemption SMS uses typed template rendering

The system MUST render confirmed redemption SMS messages with a typed `redemption-confirmed` template that includes redeemed amount, remaining balance, and customer-facing receipt context when available.

#### Scenario: Redemption SMS is rendered

- **WHEN** a confirmed redemption notification is sent through the real SMS provider renderer
- **THEN** the message includes the redeemed amount and remaining balance instead of generic receipt text

#### Scenario: Redemption SMS payload is incomplete

- **WHEN** a `redemption-confirmed` payload is missing required redemption, transaction, redeemed amount, or remaining balance fields
- **THEN** the message is not rendered as generic text and is categorized as a terminal payload failure or dead-lettered with a clear reason

### Requirement: Confirmed redemption notifications carry ownership references

The system MUST populate ledger entry, redemption, receipt, and outbox event ownership references for every confirmed redemption notification path.

#### Scenario: Immediate redemption creates SMS row

- **WHEN** an immediate redemption commits and queues SMS delivery
- **THEN** the SMS row references the ledger entry, redemption, receipt, and outbox event

#### Scenario: Approval execution creates SMS row

- **WHEN** an approved redemption execution commits and queues SMS delivery
- **THEN** the SMS row references the ledger entry, redemption, receipt, and outbox event

### Requirement: SMS lookup prefers transaction ownership

The system MUST resolve SMS state for financial reads by ledger entry ownership first, aggregate ownership second, and receipt fallback only for historical rows.

#### Scenario: Multiple SMS rows exist for one receipt

- **WHEN** transaction reads need SMS state and a receipt has multiple notifications
- **THEN** the system does not choose the latest receipt SMS when a ledger or aggregate ownership reference exists
