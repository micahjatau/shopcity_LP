## ADDED Requirements

### Requirement: Supervisor customer profile presents verified account information

The Supervisor customer profile MUST use a stable customer ID and show the identity, account status, available credit, lifetime earned credit, pending approvals, the next credit expiry, recent profile activity, and the assigned virtual card from authenticated tenant-scoped API data. The profile MUST verify that fetched detail matches the requested customer ID before enabling existing profile edits or status controls. Profile summary metrics MUST use integer-kobo API values and MUST NOT use the sample values embedded in the supplied SVG references.

#### Scenario: Supervisor opens a verified customer profile

- **GIVEN** the Supervisor opens a customer profile URL for a stable customer ID
- **WHEN** the authoritative detail API returns the same customer ID
- **THEN** the page shows the customer's verified identity and status, available credit, lifetime earned credit, pending approvals, recent activity, virtual card, and credit expiry schedule when those values are provided by the API
- **AND** the existing edit, status-confirmation, save-verification, authorization, CSRF, idempotency, and dirty-navigation safeguards remain in force.

#### Scenario: Customer detail is loading, missing, or mismatched

- **GIVEN** the profile is loading or the API returns missing, failed, or mismatched detail
- **WHEN** the profile is rendered
- **THEN** it presents a truthful loading or retryable error state
- **AND** no customer values, virtual card, or write controls from another ID are exposed.

### Requirement: Profile activity and customer tabs use authoritative APIs

The profile MUST provide Overview, Transactions, Wallet Ledger, Redemptions, Virtual Card, and Consent navigation consistent with the supplied profile reference. Earnings, redemptions, approval outcomes, customer/card blocks, and card issuance MUST be shown only from authenticated APIs or persisted records already available to the backend. Recent activity MUST be ordered by its authoritative event timestamp. If an event source is unavailable or a value was not provided, the page MUST say so or present a truthful empty state; it MUST NOT infer a past event from current status, fabricate sample activity, or expose raw audit metadata. Any added API for this page MUST be read-only, tenant/customer scoped from the authenticated request and stable customer ID, and MUST NOT add schema changes or ledger/card lifecycle writes.

#### Scenario: Recent activity includes supported customer events

- **GIVEN** the authenticated profile APIs return customer activity
- **WHEN** the Supervisor opens Overview or a related tab
- **THEN** available earnings, redemptions, approvals, block events, and card issuance are displayed with their returned type, status, date, and value
- **AND** each item belongs to the requested customer and is ordered newest first.

#### Scenario: Activity or tab data is unavailable

- **GIVEN** an activity category has no returned records or its API request fails
- **WHEN** the corresponding section or tab is rendered
- **THEN** the profile shows an honest empty or retryable error state for that category
- **AND** it does not substitute an SVG example, infer history from current state, or hide an API failure as an empty result.

#### Scenario: Profile tabs preserve stable customer context

- **WHEN** the Supervisor switches among Overview, Transactions, Wallet Ledger, Redemptions, Virtual Card, and Consent
- **THEN** each tab remains scoped to the same verified customer ID
- **AND** changing tabs does not alter the customer, status, balance, card, ledger, or approval data.

### Requirement: Virtual card and credit expiry are calculated from current records

The profile virtual card MUST use the current assigned card's authoritative identifier, status, and issue date. The credit-expiry schedule MUST use the remaining amount and expiry date of the customer's available credit lots returned by the API. Expiring amounts MUST be grouped or displayed by their actual expiry date, use integer kobo, and exclude fully used or already expired credit. No card number, barcode, expiry amount, date, or arbitrary "expiring soon" window may be invented. Supplied SVG files are design references only and MUST remain unchanged.

#### Scenario: Customer has an issued virtual card

- **GIVEN** the verified customer has an assigned card returned by the API
- **WHEN** the Supervisor opens Virtual Card or Overview
- **THEN** the virtual card displays that card's real identifier and authoritative status/date
- **AND** the profile does not display the sample SVG's name, card number, barcode, or status as customer data.

#### Scenario: Customer has no issued virtual card

- **GIVEN** the verified customer has no assigned card in the API response
- **WHEN** the Supervisor opens Virtual Card or Overview
- **THEN** the page states that a card was not provided
- **AND** it does not derive a card number from the customer ID or render sample barcode content.

#### Scenario: Customer has remaining credits with future expiry dates

- **GIVEN** the API returns one or more credit lots with remaining balance and future expiry
- **WHEN** the Supervisor views the expiry schedule
- **THEN** the page shows only those remaining amounts grouped by their actual expiry date and ordered earliest first
- **AND** the summary's next-expiry date and amount agree with the schedule.

#### Scenario: Customer has no upcoming credit expiry

- **GIVEN** the customer has no unexpired credit lot with a positive remaining amount
- **WHEN** the Supervisor views the expiry schedule
- **THEN** the page states that no upcoming expiry was returned
- **AND** it does not display a made-up date, amount, or countdown.

### Requirement: Profile operations enter existing authenticated workflows

Capture purchase and Redeem Credit actions MUST open the existing authenticated Supervisor/cashier-authorized workflows for the verified customer. The profile MUST NOT perform a ledger write, approval decision, card issuance, or card block directly from presentation code. Existing API authorization, CSRF, idempotency, receipt verification, approval, and card lifecycle safeguards MUST remain authoritative.

#### Scenario: Supervisor starts a purchase capture

- **GIVEN** the verified customer is eligible for the existing purchase-capture workflow
- **WHEN** the Supervisor activates Capture purchase
- **THEN** the existing protected capture workflow opens with the stable customer ID supplied as context where supported
- **AND** no purchase or credit is written until that workflow submits through its existing API protections.

#### Scenario: Supervisor starts a credit redemption

- **GIVEN** the verified customer is eligible for the existing redemption workflow
- **WHEN** the Supervisor activates Redeem Credit
- **THEN** the existing protected redemption workflow opens with the stable customer ID supplied as context where supported
- **AND** no redemption or ledger entry is written until that workflow submits through its existing API protections.
