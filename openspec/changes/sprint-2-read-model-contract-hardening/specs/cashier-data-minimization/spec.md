## ADDED Requirements

### Requirement: Customer reads return explicit DTOs
The system SHALL return explicit role-specific customer DTOs from customer read endpoints and SHALL NOT return raw Prisma customer entities from those endpoints.

#### Scenario: Supervisor customer list serializes as JSON
- **WHEN** a supervisor or admin lists customers that have credit lots with `bigint` amounts
- **THEN** the HTTP response serializes successfully as JSON and contains mapped DTO fields rather than raw ORM entities

#### Scenario: Supervisor customer detail serializes as JSON
- **WHEN** a supervisor or admin retrieves a customer that has credit lots with `bigint` amounts
- **THEN** the HTTP response serializes successfully as JSON and contains mapped DTO fields rather than raw ORM entities

### Requirement: Customer and card DTOs expose active balance only
The system SHALL expose `availableBalanceKobo` in customer and card read DTOs as the active balance that excludes expired and depleted credit lots.

#### Scenario: Cashier customer summary ignores expired credit
- **WHEN** a cashier lists or retrieves a customer with expired remaining credit
- **THEN** `availableBalanceKobo` excludes the expired credit amount

#### Scenario: Cashier card lookup ignores expired credit
- **WHEN** a cashier looks up a card for a customer with expired remaining credit
- **THEN** the nested customer summary `availableBalanceKobo` excludes the expired credit amount

### Requirement: Privileged customer search audit avoids raw searched PII
The system SHALL audit privileged customer list reads without storing the raw search string when that string can contain phone numbers or email addresses.

#### Scenario: Privileged search records classified metadata
- **WHEN** a supervisor or admin searches customers by phone, email, name, or card
- **THEN** the audit metadata records that a query was present and records a low-risk query classification and result count without the raw query string
