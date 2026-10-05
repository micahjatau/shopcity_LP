# Fraud Review Results

## ADDED Requirements

### Requirement: Fraud flags are presented as a scannable results table

The Supervisor and Admin fraud workspaces SHALL display a concise results heading and count followed by a labeled table containing the visible fraud cases. The table SHALL remain visible while loading and when filters return no matching records. Pagination SHALL appear directly below the table within the results section, remain right-aligned, use the page's typography and accessible previous/next icon controls, and display only a concise `Page N` label. The existing five-item client-side page size and filter behavior SHALL remain unchanged. Status and severity filters SHALL expose valid values as selects, and the branch filter SHALL remain a text query; all three controls SHALL fit in one row at accepted page widths.

#### Scenario: Fraud cases are available

- **WHEN** a reviewer loads fraud records
- **THEN** each visible record is presented in a table row with labeled subject, rule, severity, status, branch, and amount fields
- **AND** the reviewer can open an accessible review dialog from that row's action
- **AND** the dialog contains the selected case's evidence/details, decision choices, reason field, and submit action

#### Scenario: No records match the current filters

- **WHEN** filters return no matching fraud cases or the list is empty
- **THEN** the results heading, count, table column labels, and a clear empty-state row remain visible

#### Scenario: Reviewer filters fraud results

- **WHEN** a reviewer chooses a status or severity value, or enters a branch query
- **THEN** the results update using the existing client-side filtering behavior
- **AND** the status and severity choices are limited to valid fraud states and severity levels
- **AND** the three filter controls remain on one row without document-level horizontal overflow

#### Scenario: Reviewer changes page

- **WHEN** more than one five-item page is available
- **THEN** accessible previous/next icon buttons update the existing client-side page
- **AND** the pagination controls are aligned to the right

### Requirement: Decision controls live in the case review dialog

The case action SHALL open an accessible dialog containing the selected fraud case details, decision choices, decision reason, and submit/cancel actions. The page SHALL NOT render a separate decision card or a submit-decision action outside the dialog.

#### Scenario: Reviewer submits a decision

- **WHEN** a reviewer selects a case, chooses Acknowledge or Resolve, enters a reason, and submits from the dialog
- **THEN** the existing fraud decision endpoint is called with the same selected case, decision, reason, CSRF protection, and idempotency key
- **AND** the dialog reports the backend response without implying success before the backend responds

### Requirement: Fraud review behavior remains backend-authoritative

The presentation change SHALL preserve the existing fraud list and decision API calls, CSRF and idempotency handling, filters, selected-case evidence, decision reason requirement, and acknowledgement/resolution actions. Client-side selection or decision preview SHALL NOT imply that the backend accepted or resolved a case.

#### Scenario: Reviewer records a fraud decision

- **WHEN** an authorized reviewer selects a case, chooses an existing decision, enters a reason, and submits
- **THEN** the same fraud decision endpoint receives the same decision and reason under the existing request protections
- **AND** the page reports the backend response without inventing a successful outcome
