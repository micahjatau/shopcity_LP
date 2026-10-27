## ADDED Requirements

### Requirement: Supervisor customer profile presents verified account information

The Supervisor customer profile MUST use a stable customer ID and show the identity, account status, available credit, lifetime earned credit, pending approvals, the credit-expiry schedule, recent profile activity, and the assigned virtual card from authenticated tenant-scoped API data. The profile MUST verify that fetched detail matches the requested customer ID before exposing or enabling existing profile edits or status controls. Profile summary metrics MUST use integer-kobo API values and MUST NOT use the sample values embedded in the supplied SVG references.

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

### Requirement: Annual purchases summary uses only an authoritative value

The fourth profile summary card MUST be labelled **Annual Purchases** instead of **Next expiry**. It MUST display an annual-purchase value only when returned by an authenticated, tenant/customer-scoped profile API. Since the current profile API does not return an annual-purchase total, the card MUST display **Not provided** in a smaller muted text style and MUST NOT infer an amount from bounded activity or SVG samples. The credit-expiry schedule remains available as a separate profile section.

#### Scenario: Annual purchases value is unavailable

- **GIVEN** the current authenticated profile API has no annual-purchases total
- **WHEN** the Supervisor opens the profile
- **THEN** the fourth summary card is labelled **Annual Purchases** and shows **Not provided**
- **AND** it does not reuse the former no-expiry message, infer a yearly total, or affect the separate credit-expiry schedule.

### Requirement: Profile customer details are read-only until explicitly edited

The Overview MUST present customer details as a read-only card matching the supplied customer-details reference, with an explicit Edit action that opens the existing verified customer editor in an accessible dialog. The card MUST show full name, phone, email, birthday month, registration date, lifetime transaction count, and lifetime redemption count using only verified customer/profile API values. Registration date MUST use the verified `memberSince` or customer `createdAt`; a missing or unsupported value MUST be labeled **Not provided**. The authenticated profile projection MUST return `transactionCount` as the tenant/customer-scoped count of persisted Receipt records and `redemptionCount` as the tenant/customer-scoped count of persisted Redemption records, across all statuses and the customer's full account history, independently of the 25-row activity windows. A count query failure MUST return `null` for that count and identify its source in `sourceErrors`; the UI MUST show **Unavailable** for that failed count and MUST display a valid zero as **0**. The UI MUST NOT derive counts from bounded activity lists or copy sample values from the SVG. Birthday month remains **Not provided** when absent. The edit dialog MUST preserve existing identity verification, CSRF/idempotency, save verification, status confirmation, and dirty-state safeguards. A verified profile save closes the editor but keeps the Supervisor on that profile.

#### Scenario: Overview shows read-only customer details

- **GIVEN** the Supervisor has opened a same-ID verified customer profile
- **WHEN** the Overview is rendered
- **THEN** the reference customer-details fields are displayed as read-only values with an Edit action
- **AND** birthday month is labeled **Not provided** when not returned by the API.

#### Scenario: Overview shows lifetime customer counts

- **GIVEN** the Supervisor has opened a same-ID verified customer profile
- **WHEN** the Overview is rendered
- **THEN** the read-only details card shows transaction and redemption totals returned by the profile API, including **0** when there are no matching records
- **AND** the totals cover all persisted records for that tenant/customer regardless of status, not only records in the bounded activity lists.

#### Scenario: A lifetime count source is unavailable

- **GIVEN** a profile count query fails
- **WHEN** the Supervisor views the customer details card
- **THEN** that count is shown as **Unavailable** and its profile source error is retained
- **AND** the other count remains visible if its source succeeded; neither count is inferred from the displayed rows.

#### Scenario: Edit opens the existing customer editor

- **GIVEN** the Supervisor is viewing the verified customer details card
- **WHEN** the Supervisor activates Edit
- **THEN** the existing editable customer form opens in an accessible dialog with the verified customer's current values
- **AND** closing a clean editor returns to the read-only profile without navigating away or submitting an update.

#### Scenario: Dirty edits are kept or discarded explicitly

- **GIVEN** the Supervisor has changed customer details in the edit dialog
- **WHEN** the Supervisor cancels, presses Escape, or dismisses the dialog
- **THEN** an explicit keep-editing/discard decision is presented
- **AND** discard restores the verified baseline and leaves the profile open, while keep-editing retains the changed values.

#### Scenario: Verified save returns to the read-only profile

- **GIVEN** the Supervisor has changed valid details
- **WHEN** the update and authoritative same-ID refresh verify all submitted values
- **THEN** the dialog closes and the profile shows the refreshed read-only values
- **AND** an update, refresh, or value-verification failure keeps the dialog open with edits preserved and an error shown.

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

#### Scenario: Redemptions tab uses the Transactions table presentation

- **GIVEN** the Supervisor opens Redemptions for the verified customer
- **WHEN** the profile projection is rendered
- **THEN** the returned redemption records appear in a responsive, read-only table card using the Transactions tab's table styling
- **AND** the columns show Date & Time, Redemption amount, and Status from the projection's `occurredAt`, amount, and `status` fields
- **AND** `confirmedAmountKobo` is shown when available; otherwise any `requestedAmountKobo` is explicitly labeled **Requested** and is not presented as a confirmed debit
- **AND** internal redemption IDs and raw API fields are not rendered
- **AND** column headers remain visible when there are no redemptions, with an honest full-width empty state
- **AND** a source failure remains visible with the existing retry action and the tab makes no writes

#### Scenario: Transactions tab uses the Overview card presentation

- **GIVEN** the Supervisor opens Transactions for the verified customer
- **WHEN** the profile transaction projection is rendered
- **THEN** transactions appear in a responsive, read-only table card styled consistently with the Overview profile cards and the supplied transactions-card reference
- **AND** returned date/time, purchase amount, capture status, and review status are shown without exposing internal receipt IDs
- **AND** the Credit cell shows the authoritative per-transaction earned and/or redeemed movement returned by the profile projection, with both effects shown for a combined settlement
- **AND** pending transactions show **Awaiting approval** without presenting requested amounts as confirmed movement; unavailable movement is labeled honestly and current available balance is never substituted
- **AND** receipt number displays **Not provided** when it is not returned
- **AND** the column headers remain visible when there are no transactions, with the honest empty state shown in a full-width table row
- **AND** the tab preserves its retryable error state

#### Scenario: Wallet Ledger columns use the authenticated customer-ledger API

- **GIVEN** the Supervisor opens Wallet Ledger for a verified customer
- **WHEN** a ledger page is requested from `GET /api/v1/customers/{id}/ledger`
- **THEN** the read is scoped to the authenticated tenant and verified customer ID, and response identity is checked before rendering
- **AND** Source, Date & Time, Type, Amount, Expiry, and Staff map to the receipt number, effective timestamp, ledger type/direction, integer-kobo amount/direction, credit-lot expiry, and creator username returned by that endpoint
- **AND** the table uses cursor pagination, does not expose raw receipt or ledger UUIDs, and does not issue one network request per cell
- **AND** Balance After displays **Not provided** until the API supplies a reliable historical per-entry balance; current available balance is not substituted
- **AND** loading, retryable error, empty, and older-entry states remain read-only and customer-scoped

### Requirement: Virtual card and credit expiry are calculated from current records

The profile virtual card MUST use the current assigned card's authoritative identifier, status, and issue date. The credit-expiry schedule MUST use the remaining amount and expiry date of the customer's available credit lots returned by the API. Expiring amounts MUST be grouped or displayed by their actual expiry date, use integer kobo, and exclude fully used or already expired credit. No card number, barcode, expiry amount, date, or arbitrary "expiring soon" window may be invented. Supplied SVG files are design references only and MUST remain unchanged.

#### Scenario: Customer has an issued virtual card

- **GIVEN** the verified customer has an assigned card returned by the API
- **WHEN** the Supervisor opens the Virtual Card tab
- **THEN** the tab renders the ShopCity card preview using that card's real identifier, authoritative status, issue date, and verified customer name
- **AND** the profile does not display the sample SVG's name, card number, barcode, or status as customer data
- **AND** `apps/web/public/brand/supervisor/IMG-20260802-WA0001.jpg` is used as the card preview's cover background, with the source asset left unchanged
- **AND** the customer name and card number appear directly over the background at the bottom left in consistent white type at 25px by default and 29px from the small breakpoint upward, with the name in all caps, no card-number label, no text-panel background, and no visible Active badge
- **AND** the preview does not appear on Overview or the global Manage cards tab
- **AND** Manage cards retains its verified serial/customer details and existing protected card actions without rendering the graphic preview.

#### Scenario: Manage card opens in a profile dialog

- **GIVEN** the Supervisor is viewing the verified customer's Virtual Card tab and an assigned card is returned
- **WHEN** the Supervisor activates **Manage card**
- **THEN** the existing protected card-management workflow opens in an accessible dialog without navigating away from the profile
- **AND** the current card identifier is prefilled for lookup but must still be searched and re-verified before any lifecycle action is available
- **AND** closing the dialog returns to the same Virtual Card tab and preserves all existing authorization, CSRF, idempotency, confirmation, and authoritative-refresh safeguards.

#### Scenario: Customer has no issued virtual card

- **GIVEN** the verified customer has no assigned card in the API response
- **WHEN** the Supervisor opens Virtual Card or Overview
- **THEN** the page states that a card was not provided
- **AND** it does not derive a card number from the customer ID or render sample barcode content.

#### Scenario: Customer has remaining credits with future expiry dates

- **GIVEN** the API returns one or more credit lots with remaining balance and future expiry
- **WHEN** the Supervisor views the expiry schedule
- **THEN** the page shows only those remaining amounts grouped by their actual expiry date and ordered earliest first

#### Scenario: Customer has no upcoming credit expiry

- **GIVEN** the customer has no unexpired credit lot with a positive remaining amount
- **WHEN** the Supervisor views the expiry schedule
- **THEN** the page states that no upcoming expiry was returned
- **AND** it does not display a made-up date, amount, or countdown.

### Requirement: Profile uses an accessible, consistent typography scale

The customer profile and its shared top search/sidebar chrome MUST use the existing sans-serif family and a consistent rem-based CSS type scale. Profile body text MUST use a 1rem base and 1.5 line-height; headings and large metric values MUST use 1.2 line-height. Profile title, metric labels/values, details labels/values, section headings, event titles, timestamps, status pills, and tabs MUST follow the approved hierarchy: title 1.75rem/700; metric labels 0.8125rem/500 and numeric values 1.875rem/600 with tabular numerals; unavailable metric values 0.875rem/500 and muted; section headings 1.125rem/600; detail labels 0.8125rem/500 and values 0.9375rem/500; event titles 0.9375rem/600, timestamps 0.8125rem, and status pills 0.75rem/600; inactive tabs 0.875rem/500 and active tab 0.875rem/600. Primary text MUST use near-black and secondary/helper text neutral gray with WCAG AA contrast. Existing page layout and button/sidebar colors MUST remain unchanged.

#### Scenario: Profile displays consistent typography at desktop widths

- **GIVEN** the Supervisor views a customer profile
- **WHEN** the viewport is 1280px, 1440px, or 1920px wide
- **THEN** the defined type scale is applied consistently to metrics, details, activity, tabs, and shell text
- **AND** email, long values, and labels remain readable without awkward wrapping or truncation.

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
