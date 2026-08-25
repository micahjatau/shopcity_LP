## ADDED Requirements

### Requirement: Cashier overview provides direct scanner or card search

The `/cashier` overview MUST provide a focused input that accepts a scanned card serial or manually entered card number and invokes the authoritative lookup flow without requiring navigation to `/cashier/lookup` first.

#### Scenario: Cashier scans a valid card

- **GIVEN** an authenticated cashier with a valid active device
- **WHEN** a card serial is scanned into the overview input
- **THEN** the frontend submits the value through the existing authenticated lookup contract
- **AND** renders the backend-provided role-safe customer projection on `/cashier`
- **AND** provides Earn and Redeem actions carrying verified card context

#### Scenario: Cashier enters an invalid card

- **GIVEN** an authenticated cashier
- **WHEN** the cashier submits an invalid or unknown card value
- **THEN** the overview shows an actionable validation or lookup error
- **AND** retains focus or provides an accessible retry path
- **AND** does not fabricate customer, balance, eligibility, or status data

### Requirement: Cashier overview retains dedicated workflow routes

The direct overview lookup MUST NOT remove or embed the existing dedicated Earn, Redeem, lookup, or sync routes.

#### Scenario: Cashier follows an action

- **GIVEN** verified card context is displayed on `/cashier`
- **WHEN** the cashier selects Earn or Redeem
- **THEN** the application navigates to the existing dedicated workflow route
- **AND** the route receives only a verified card identifier/context
- **AND** the backend remains authoritative for balance, status, eligibility, and approval

### Requirement: Cashier overview displays today’s transactions

The `/cashier` overview MUST display a bounded backend-backed list of the authenticated branch’s current-business-day transactions.

#### Scenario: Today’s transactions are available

- **GIVEN** an authenticated cashier with a valid branch scope
- **WHEN** the overview loads
- **THEN** it displays no more than 10 sanitized transaction rows
- **AND** each row includes time, operation, integer-kobo amount, receipt/reference, and outcome
- **AND** the data is scoped by authenticated tenant, branch, and configured ShopCity timezone

#### Scenario: Today’s transactions are unavailable

- **GIVEN** the activity request is loading, empty, offline, unauthorized, or failed
- **WHEN** the overview renders
- **THEN** it displays an accessible state-specific message and retry/fallback action where appropriate
- **AND** it does not infer server transaction history from browser-local state
