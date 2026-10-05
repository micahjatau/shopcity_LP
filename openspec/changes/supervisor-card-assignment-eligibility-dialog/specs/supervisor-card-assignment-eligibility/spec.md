## Purpose

Present the Supervisor Assign card search at full workspace width and handle authoritative customer eligibility and serial review in a focused dialog while preserving existing card assignment contracts.

## ADDED Requirements

### Requirement: Assign card search uses the full workspace

The Assign card tab MUST present the customer query and results across the available workspace width rather than reserving a persistent side panel for assignment eligibility. Search controls MUST have persistent labels, remain usable at narrow widths, and results MUST remain explicit selection targets; no first result may be selected implicitly.

#### Scenario: Search is full width

- **GIVEN** the Supervisor opens the Assign card tab
- **WHEN** the search workspace is rendered at desktop or mobile width
- **THEN** the query control and customer results use the available tab width
- **AND** the search action follows the full-width query field, aligned to the start on desktop and full-width on narrow screens
- **AND** the page has no horizontal overflow.

#### Scenario: Search results require explicit selection

- **GIVEN** customer search returns one or more results
- **WHEN** the results are presented
- **THEN** each result is a full-width, keyboard-operable selection target
- **AND** no result's eligibility or serial controls are exposed before explicit selection and authoritative detail loading.

### Requirement: Assignment eligibility is shown in an authoritative dialog

An explicit customer selection or supported stable-ID deep link MUST open a focused Assignment eligibility dialog with a loading/verification state. Customer details and write controls MUST remain hidden until the authoritative detail response matches the requested customer ID. The dialog MUST distinguish customer status from current-card status and MUST display only returned identity/card values. URL data MUST NOT be treated as eligibility authority.

#### Scenario: Search selection opens a verified eligibility dialog

- **GIVEN** the Supervisor selects a customer result
- **WHEN** the detail request is pending
- **THEN** an accessible dialog indicates that eligibility is being checked without presenting unverified customer details
- **WHEN** authoritative details return with the selected stable ID
- **THEN** the dialog displays the verified customer identity, customer status, current-card status, and assignment eligibility state.

#### Scenario: Deep-linked customer uses the same dialog

- **GIVEN** the Assign card tab is opened with a customer ID in URL context
- **WHEN** authoritative details are loaded and verified
- **THEN** the Assignment eligibility dialog displays those details and applies the same eligibility gates as explicit search selection
- **AND** URL-supplied status or card information is ignored.

#### Scenario: Details fail verification or cannot load

- **GIVEN** the detail response is mismatched, unavailable, or fails
- **WHEN** the dialog handles the result
- **THEN** it shows a truthful error and retry/close action
- **AND** it exposes neither unverified identity nor serial/assignment controls.

### Requirement: Eligibility states and actions are presented clearly

The dialog MUST show separately labeled customer and card status, explain whether assignment is allowed, and reveal only actions supported by authoritative current detail. An active customer with a known non-ACTIVE card state MAY proceed to serial review under the existing frontend rule; an inactive customer, a customer with an active card, or unknown card state MUST NOT be assigned through this workflow. An active-card case MUST link to the existing Manage cards route using the stable customer ID.

#### Scenario: Eligible customer can enter a new serial

- **GIVEN** verified details show an active customer and a known current-card status other than ACTIVE
- **WHEN** the dialog presents assignment controls
- **THEN** it shows a blank new-card-serial field and a Review assignment action
- **AND** it does not seed the field with any existing serial.

#### Scenario: Customer already has an active card

- **GIVEN** verified details show an active customer with an ACTIVE card
- **WHEN** the dialog displays eligibility
- **THEN** it explains that assignment is unavailable because an active card already exists
- **AND** it offers the existing Manage cards link with the selected stable customer ID
- **AND** it does not show serial-entry or assignment-write controls.

#### Scenario: Customer is inactive or card eligibility is unknown

- **GIVEN** verified details show a non-active customer or do not establish a known card status
- **WHEN** the dialog displays eligibility
- **THEN** it explains the reason assignment is unavailable
- **AND** it provides no assignment-write control.

### Requirement: Serial review and assignment remain inside the dialog

Reviewing a serial MUST be a no-write step within the Assignment eligibility dialog. Submission MUST remain an explicit action and MUST preserve the existing `POST /cards` contract, CSRF protection, idempotency behavior, backend eligibility/uniqueness authority, pending-submit guard, and authoritative refresh/error handling.

#### Scenario: Review does not submit

- **GIVEN** a verified eligible customer and a new serial
- **WHEN** the Supervisor chooses Review assignment
- **THEN** the same dialog displays the customer identity and exact entered serial for review
- **AND** no card API request is sent.

#### Scenario: Back from review preserves the entered serial

- **GIVEN** the dialog is in serial-review state
- **WHEN** the Supervisor chooses Back to details
- **THEN** the eligibility/form state returns with the entered serial preserved
- **AND** no API request is sent.

#### Scenario: Confirmed assignment follows existing API behavior

- **GIVEN** the Supervisor confirms the serial from review
- **WHEN** assignment succeeds, conflicts, or has an uncertain outcome
- **THEN** the dialog shows only the confirmed outcome, retains safe input on failure, prevents duplicate submission while pending, and reloads authoritative customer details
- **AND** existing CSRF and idempotency behavior remains unchanged.

### Requirement: Dismissal returns to search without accidental writes

Closing the dialog MUST submit no request, clear the selected customer ID from route context, and preserve the search query/results. The dialog MUST support the existing accessible Dialog primitive's close control, Escape, backdrop dismissal, focus trapping, and focus restoration. It MUST NOT close while a card assignment request is pending.

#### Scenario: Supervisor dismisses eligibility dialog

- **GIVEN** the eligibility dialog is open and no assignment request is pending
- **WHEN** the Supervisor uses Close, Escape, or the backdrop
- **THEN** the dialog closes, selected customer context is cleared, and the search query/results remain available
- **AND** no assignment API request is sent.

#### Scenario: Assignment request is pending

- **GIVEN** card assignment is in progress
- **WHEN** the Supervisor attempts to close or submit again
- **THEN** the dialog remains open and duplicate submission/close is prevented until the result is reconciled.
