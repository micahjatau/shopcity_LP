## ADDED Requirements

### Requirement: Cashier activity has truthful MVP scope

The cashier overview MUST use the bounded cashier-today contract as recent/loaded activity and MUST NOT imply a full transaction history that the TRD does not define.

#### Scenario: Cashier overview loads activity

- **WHEN** the frontend receives the bounded cashier-today response
- **THEN** it labels results as loaded/recent activity
- **AND** it does not show fake pagination or claim complete full-day totals

#### Scenario: Full transaction history is proposed

- **WHEN** a future feature requires transaction history beyond the bounded feed
- **THEN** it is specified as a separate API change with explicit scope, pagination, authorization, and OpenAPI approval
- **AND** the current MVP does not simulate it with browser-only slicing

### Requirement: Transaction detail and audit data are authoritative

Transaction detail, reversal, and audit views MUST use their dedicated backend contracts rather than synthesizing audit history from summary fields.

#### Scenario: Cashier or supervisor opens a transaction

- **WHEN** a transaction detail view opens
- **THEN** it loads the authoritative transaction and permitted audit data
- **AND** reversal controls are shown only when the current role and transaction state permit them
