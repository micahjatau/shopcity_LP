## ADDED Requirements

### Requirement: Supervisor customer directory is table-first

The Supervisor Customers route MUST present a searchable customer table as its primary workspace. The toolbar MUST place an explicit-submit search by customer name, phone number, or card number on the left, and a customer-status filter followed by Register customer on the right. The table MUST expose Name, Card number, Available, Last purchase, Lifetime earned, Status, and Action columns. Card number, virtual card number, card serial, and card barcode MUST resolve to the same assigned-card value (`Card.barcodeValue`) from that customer's latest issued card. Last purchase MUST show the full basket total (`Receipt.purchaseAmountKobo`) from that customer's latest captured and approved receipt; Lifetime earned MUST be the sum of that customer's confirmed EARN credits. The backend list projection MUST scope every value to the authenticated tenant and stable customer ID, use integer kobo, and make no ledger or card-lifecycle writes. Client-side status filtering, numeric sorting, and overview-style pagination MUST operate on the complete cursor-fetched search result set. Missing card/purchase values MUST be marked not provided; no customer-specific values may be invented. Registration MUST preserve the existing required fields, consent and initial-card workflow, and must not weaken the existing backend verification or idempotency safeguards.

#### Scenario: Supervisor opens the customer directory

- **WHEN** a Supervisor opens `/supervisor/customers`
- **THEN** the customer table is the primary content and an explicit-submit search by name, phone number, or card number is available at the left of the toolbar
- **AND** a customer-status filter and Register customer appear at the right, in that order
- **AND** the table uses the required customer, card-number, available-balance, last-purchase, lifetime-earned, status, and action columns without fabricating values.

#### Scenario: Supervisor filters and pages the complete directory

- **GIVEN** the customer-list API returns multiple cursor pages
- **WHEN** the Supervisor filters by status or moves between directory pages
- **THEN** status filtering applies across every fetched cursor page
- **AND** the overview-style previous/next controls show five rows per page and reset to page one when the search or status filter changes.

#### Scenario: Supervisor sorts numeric customer columns

- **GIVEN** the directory contains multiple customers
- **WHEN** the Supervisor activates Available, Last purchase, or Lifetime earned
- **THEN** the complete filtered result set sorts numerically in ascending order
- **AND** activating the same column again sorts it in descending order before five-row pagination
- **AND** missing values remain last in either direction and the active sort is announced accessibly.

#### Scenario: Directory financial and card values are customer-specific

- **GIVEN** a directory row represents a stable customer ID
- **WHEN** its values are displayed
- **THEN** Card number comes from that customer's latest issued card and represents the same value as its serial/barcode
- **AND** Last purchase is the full basket total from that customer's latest captured and approved receipt
- **AND** Lifetime earned sums that customer's confirmed EARN credits only
- **AND** all derived values are tenant-scoped, integer kobo, and do not mutate ledger history.

#### Scenario: Directory values are missing

- **GIVEN** a customer has no issued card or no captured and approved purchase
- **WHEN** the customer row is displayed
- **THEN** the missing card-number or purchase cell communicates that the value was not provided
- **AND** lifetime earned is zero when the customer has no confirmed EARN credits
- **AND** the UI never substitutes an ID, another customer's value, or an invented amount.

#### Scenario: Supervisor starts customer registration from the directory

- **WHEN** the Supervisor activates Register customer
- **THEN** a modal dialog opens containing the current customer registration form
- **AND** the directory remains in the page behind the dialog
- **AND** registration continues to use the existing consent, first-card, review, and protected submission behavior.

#### Scenario: Successful registration shows an animated confirmation

- **GIVEN** the registration form has been submitted
- **WHEN** the customer creation is authoritatively verified as successful
- **THEN** the dialog presents an expanding, spring-animated success popup with a drawn checkmark and clear success text
- **AND** a polite assistive-technology announcement communicates the success without relying on animation or color alone
- **AND** the Supervisor can dismiss the confirmation with a clear Done/Close action
- **AND** the directory is refreshed or reconciled with the confirmed customer.

#### Scenario: Reduced motion and unsuccessful registration do not misrepresent success

- **GIVEN** the Supervisor has requested reduced motion, or the create result is failed, mismatched, pending, or uncertain
- **WHEN** the registration result is presented
- **THEN** verified success uses a static success state for reduced motion
- **AND** no success animation or success message is shown for an unverified outcome.

#### Scenario: Registration dialog can be dismissed accessibly

- **GIVEN** the registration dialog is open
- **WHEN** the Supervisor cancels or closes it
- **THEN** the dialog closes without submitting registration
- **AND** focus returns to the Register customer trigger
- **AND** any unsaved registration values follow the existing form's explicit discard behavior.

### Requirement: Customer selection navigates to a verified profile page

Each customer entry MUST provide keyboard-accessible navigation to a dedicated profile page identified by stable customer ID. Profile data MUST be loaded from the authoritative detail endpoint and matched to the requested ID before editing or status controls are enabled. Existing profile-save verification, status confirmation, and unsaved-change protections MUST remain in force.

#### Scenario: Supervisor opens a customer profile from the table

- **GIVEN** the directory contains a customer with a stable ID
- **WHEN** the Supervisor activates that customer's Action link
- **THEN** navigation opens the dedicated profile URL for that ID rather than a dialog
- **AND** profile details are fetched and verified before write controls become available.

#### Scenario: Supervisor opens a profile URL directly

- **GIVEN** the Supervisor opens a valid customer profile URL directly or reloads it
- **WHEN** the authoritative customer details are returned
- **THEN** the page displays the profile only if the returned stable ID matches the URL
- **AND** missing, failed, or mismatched details remain a truthful error without enabling writes.

### Requirement: Directory status and responsive states remain truthful

The customer table MUST show only authoritative customer/card status information supplied by the API and MUST NOT fabricate missing values. Loading, empty, and failure states MUST be accessible and actionable. Narrow layouts MUST remain usable without page-level horizontal overflow.

#### Scenario: Directory result omits card status

- **GIVEN** a customer result has no card status
- **WHEN** the row is rendered
- **THEN** the UI communicates that card status is unavailable or not provided
- **AND** it does not infer a card status from customer status.

#### Scenario: Search has no matches or fails

- **WHEN** the customer search returns no matches or cannot complete
- **THEN** the directory displays a clear empty or error state
- **AND** the Supervisor can retry or begin registration without losing the directory context.
