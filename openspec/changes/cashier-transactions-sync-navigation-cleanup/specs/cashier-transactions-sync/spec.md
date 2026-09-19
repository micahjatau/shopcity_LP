# Cashier Transactions and Sync Specification

## MODIFIED Requirements

### Requirement: Cashier navigation exposes the approved operational routes

The Cashier navigation SHALL contain Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, and Sync Queue in that order, with active state derived from the canonical registry. Customer-detail deep links SHALL remain reachable contextually without returning customer records to the primary Cashier navigation.

#### Scenario: Cashier opens the transactions route

- **GIVEN** an authenticated Cashier
- **WHEN** the Cashier selects Transactions or the Overview transaction shortcut
- **THEN** the application navigates to `/cashier/transactions`
- **AND** the Transactions item is active
- **AND** the Cashier is not redirected to a Supervisor route

#### Scenario: Customer detail remains reachable

- **GIVEN** a Cashier has an authoritative customer/card lookup result
- **WHEN** the Cashier follows its customer-detail link
- **THEN** the existing customer-detail deep link remains available
- **AND** the primary Cashier navigation still shows Transactions rather than Customer Records

### Requirement: Transactions present truthful bounded activity and authoritative detail

The Transactions surface SHALL render the approved list hierarchy and a genuine accessible modal for selected transaction details. It SHALL use generated API-client data, preserve tenant/branch/role scope, and describe the bounded activity feed without implying complete history.

#### Scenario: Cashier views bounded transactions

- **GIVEN** the Cashier Today endpoint returns a bounded activity feed
- **WHEN** `/cashier/transactions` renders
- **THEN** the page shows the approved heading, copy, refresh action, search/filter toolbar, table, result count, and appropriate loading/empty/error state
- **AND** copy identifies the bounded activity scope
- **AND** pagination is not presented as complete history unless the contract supplies it

#### Scenario: Cashier opens transaction detail

- **GIVEN** a transaction row is selected
- **WHEN** authoritative detail is requested
- **THEN** a modal overlay opens with focus, backdrop, close control, Escape dismissal, scroll handling, and focus restoration
- **AND** the modal renders only fields supplied by the backend
- **AND** unavailable receipt images, customer names, and audit history are represented truthfully
- **AND** an older detail response cannot overwrite a newer selection

### Requirement: Sync Queue preserves local durability while providing truthful operational controls

The Sync Queue SHALL preserve IndexedDB persistence, session-bound device context, idempotency, retry, reconciliation, approval, and confirmed-record cleanup while exposing compact summary, search/filter, table, detail, and batch-action surfaces.

#### Scenario: Cashier filters the queue

- **GIVEN** local queue records exist
- **WHEN** the Cashier searches receipt number, card serial, or local record ID and selects a status
- **THEN** search and status filters combine over the queue rows
- **AND** summary counts continue to describe the full queue
- **AND** result counts describe only filtered rows

#### Scenario: Cashier syncs saved purchases

- **GIVEN** waiting Earn records are saved on the device and connectivity is available
- **WHEN** the Cashier selects “Sync waiting purchases”
- **THEN** records reconcile using the existing idempotent batch behavior
- **AND** each record is shown as Saved on device, Sending, Awaiting approval, Credit issued, Synced, or Needs attention according to authoritative outcome
- **AND** the UI does not imply wallet credit merely because a record was queued or submitted

#### Scenario: Cashier clears confirmed local records

- **GIVEN** records are confirmed and eligible for local cleanup
- **WHEN** the Cashier selects “Clear synced records”
- **THEN** only confirmed local records are removed
- **AND** the UI explains that cleanup does not reverse the backend transaction

### Requirement: Cashier searches are truthful and accessible

Search controls SHALL have supported scopes, controlled values, accessible labels, keyboard submission where appropriate, clear actions, and no unnecessary request per keystroke. Global search SHALL either perform a supported route-aware action or be presented as noninteractive status.

#### Scenario: Transaction filters match displayed fields

- **WHEN** a Cashier searches by receipt number or transaction ID and filters by status or minimum credit amount
- **THEN** matching uses normalized backend states and the displayed field semantics
- **AND** minimum credit is not mislabeled as purchase subtotal

#### Scenario: Customer lookup does not authorize financial action

- **GIVEN** a directory or customer search returns a discovery result
- **WHEN** the Cashier has not completed authoritative card verification
- **THEN** Earn and Redeem remain unavailable
- **AND** a verified card context is required before financial submission
