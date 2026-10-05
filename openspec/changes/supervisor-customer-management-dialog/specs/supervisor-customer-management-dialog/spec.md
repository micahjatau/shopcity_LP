## Purpose

Give Supervisor customer management a focused search-and-edit workflow: full-width customer rows lead to an authoritative, editable customer-details dialog that protects unsaved changes and keeps card lifecycle operations on the Cards page.

## ADDED Requirements

### Requirement: Manage customers presents selectable full-width result rows

The Manage customers workspace MUST use the available width for customer search and its result list rather than reserving a persistent side panel for details. Each result MUST be a whole-row, keyboard-accessible selection target showing the customer's name and phone, customer status, and an active-card summary when that status is available. Missing card information MUST remain explicitly unknown rather than being presented as a fabricated status or serial.

#### Scenario: Search results use the full workspace

- **GIVEN** a Supervisor has searched for customers
- **WHEN** one or more results are returned
- **THEN** each customer is presented as a full-width, focusable row with identity and truthful status summaries
- **AND** no customer details panel occupies the page beside the result list.

#### Scenario: Selecting a result opens verified details

- **GIVEN** a Supervisor selects a result row
- **WHEN** customer details are requested
- **THEN** the Customer details dialog opens in a loading state and exposes editable fields only after the response matches the selected stable customer ID
- **AND** a mismatched or failed response remains a truthful dialog error with a retry or close action.

#### Scenario: Deep link loads the same customer dialog

- **GIVEN** Manage customers is opened with a stable customer ID
- **WHEN** the authoritative detail request completes
- **THEN** the same verification and dialog behavior is used as for an explicitly selected row.

### Requirement: Customer details dialog edits verified customer and account information

The Customer details dialog MUST show the verified customer's identity, editable full name, phone, and email, customer account status, and a linked-card summary. The dialog MUST keep account-status changes behind an explicit status editor and confirmation. It MUST keep card replacement, block, and reactivation operations on the Cards page, linking there with the stable customer ID using the existing supported route. A card serial MUST be shown only when the API response supplies it; omitted serials and card statuses MUST not be invented.

#### Scenario: Edit verified customer profile

- **GIVEN** the dialog contains authoritatively verified customer details
- **WHEN** the Supervisor edits profile fields
- **THEN** those fields remain local until Save changes is confirmed
- **AND** account status and linked-card context remain available in the dialog.

#### Scenario: Change customer account status

- **GIVEN** the verified account-status editor is closed and profile fields are not dirty
- **WHEN** the Supervisor opens Change status and selects a new status
- **THEN** the dialog requests the exact confirmation phrase for the selected transition (BLOCK when blocking and ACTIVATE when activating)
- **AND** no status request is sent until that phrase is entered and confirmed.

#### Scenario: Keep card lifecycle actions on the Cards page

- **GIVEN** the dialog displays linked-card context
- **WHEN** the Supervisor chooses Manage linked card
- **THEN** the Cards workflow opens using the selected customer's stable ID
- **AND** replacement or card-status actions are not duplicated inside the customer dialog.

### Requirement: Unsaved customer edits require an explicit discard decision

When profile fields differ from the verified baseline, every close request from the close control, Cancel, Escape, or backdrop MUST present a discard confirmation. Keep editing MUST preserve the entered values and dialog. Discard MUST close without submitting a profile update. A clean dialog MUST close directly.

#### Scenario: Dirty close is confirmed

- **GIVEN** the Supervisor has changed one or more profile fields
- **WHEN** the Supervisor requests to close the dialog
- **THEN** an accessible Discard unsaved changes confirmation offers Keep editing and Discard
- **AND** Keep editing retains every entered value while Discard closes without a write.

#### Scenario: Clean close is immediate

- **GIVEN** profile fields match the last verified details
- **WHEN** the Supervisor chooses X, Cancel, Escape, or the backdrop
- **THEN** the dialog closes without a discard prompt or API write.

### Requirement: Confirmed profile updates refresh the row and announce success

Save changes MUST use the existing customer-update API with CSRF protection and idempotency. After a successful update, the application MUST reload details authoritatively and verify the same stable ID and saved profile values before closing the dialog. It MUST update the corresponding search row and show a temporary accessible success toast. Update, reload, or verification failures MUST keep the dialog open, retain the Supervisor's entered values, and show the error in the dialog without claiming an unverified save.

#### Scenario: Profile save is confirmed and reflected in results

- **GIVEN** the Supervisor has changed valid profile fields
- **WHEN** Save changes receives a successful update and the refreshed detail matches the customer ID and submitted values
- **THEN** the matching result row is updated, the dialog closes, and a temporary Customer changes saved toast is announced.

#### Scenario: Profile save or refresh is uncertain

- **GIVEN** a profile update or its authoritative refresh fails or returns mismatched details
- **WHEN** the failure is handled
- **THEN** the dialog remains open with the Supervisor's values preserved
- **AND** the error is displayed in the dialog without showing the success toast.

#### Scenario: Status update is refreshed without losing dialog context

- **GIVEN** the Supervisor confirms an account-status change
- **WHEN** the status API succeeds and refreshed details verify the same customer and requested status
- **THEN** the status badge and matching result row reflect the authoritative status
- **AND** the dialog remains open with no unsaved profile values discarded.
