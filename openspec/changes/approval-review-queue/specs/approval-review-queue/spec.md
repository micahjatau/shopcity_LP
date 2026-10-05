# Approval Review Queue

## ADDED Requirements

### Requirement: Approval records are listed with server-side filters and pagination

The system SHALL show approval records in a clearly structured, paginated results table with a refresh action and status filters for pending, approved/executed, rejected, and all records. Filters SHALL be applied by the server before cursor pagination, and changing a filter SHALL restart at the first page. The results area SHALL use concise user-facing labels, display the result count as text, and avoid redundant status pills or implementation-facing copy.

#### Scenario: View pending decisions

- **WHEN** an authorized supervisor or administrator opens the approvals page with the pending filter
- **THEN** the list contains only pending approvals in the user's authorized tenant/branch scope

#### Scenario: Browse previous decisions

- **WHEN** an authorized user selects approved or rejected history
- **THEN** matching prior decisions are listed with accurate cursor pagination and no pending records unless their status matches the selected filter

#### Scenario: Refresh the queue

- **WHEN** the user activates refresh
- **THEN** the current filter is reloaded from the first page so newly created approvals can appear

#### Scenario: Results are presented clearly

- **WHEN** approval records are available
- **THEN** the user sees a structured results table, a concise result count, plain-language statuses, and no redundant status pills

### Requirement: Selecting an approval opens a decision review dialog

The UI SHALL open an accessible dialog when a listed approval is selected. The dialog SHALL show relevant approval/transaction details and allow a pending record to be approved or rejected only after a reason is selected and submitted explicitly.

#### Scenario: Decide a pending approval

- **WHEN** an authorized user opens a pending approval, selects approve or reject and a reason, then submits
- **THEN** the existing decision endpoint is called with CSRF protection and idempotency, and the result is reported truthfully

#### Scenario: Inspect a historical approval

- **WHEN** a user opens an already decided approval
- **THEN** its decision context/status is visible and decision controls are unavailable

### Requirement: Decision reasons are constrained to useful choices

The decision form SHALL offer pre-defined reasons appropriate to approve/reject, and SHALL retain the backend-required explicit reason string. A selected reason may be supplemented by user-entered detail but cannot be empty.

#### Scenario: Reason is required

- **WHEN** no reason is selected
- **THEN** submission remains disabled and the backend is not called

### Requirement: Approval behavior preserves backend authority

The system SHALL preserve existing role authorization, tenant/branch scoping, policy revalidation, immutable financial history, CSRF, and idempotency behavior. Client-side controls SHALL NOT imply that an approval necessarily succeeds.

#### Scenario: Decision is denied or policy changed

- **WHEN** backend authorization or policy validation rejects a decision
- **THEN** the UI reports failure and does not display a success state
