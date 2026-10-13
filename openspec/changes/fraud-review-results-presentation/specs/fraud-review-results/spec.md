# Fraud Review Results

## ADDED Requirements

### Requirement: Supervisor Fraud is a non-accusatory flagged-activity queue

The Supervisor fraud route SHALL be titled **Flagged activity** and use neutral language that describes observed activity rather than labeling a person, customer, or transaction as fraudulent. Each supported rule SHALL map to a human category, readable title, concise explanation, priority label, system-action description, and suggested review step. Unknown rules SHALL use cautious fallback text and SHALL NOT infer an action. The display mapping SHALL NOT change fraud evaluation, severity, status, financial effects, or authorization.

#### Scenario: Supervisor scans flagged activity

- **WHEN** a Supervisor opens the flagged-activity route
- **THEN** the page explains that activity may need review without implying wrongdoing
- **AND** records are grouped under human categories such as Transactions, Staff activity, and Account security
- **AND** each row uses a readable title and shows the available subject, branch, amount, priority, review status, and a concise system-action sentence
- **AND** backend rule codes and record IDs are not shown in the default table or accessible action name

#### Scenario: A rule is not recognized by the presentation

- **WHEN** the API returns an unrecognized rule code
- **THEN** the record appears under Other with a neutral fallback title and explanation
- **AND** the interface derives only the priority/status labels from known API values
- **AND** it does not infer a system action or expose the raw evidence object

### Requirement: Supervisor review controls and summary remain branch-scoped

The Supervisor SHALL have compact accessible filters for category, review status, priority, and branch, plus refresh. Category choices SHALL be limited to known human categories. Status SHALL map `OPEN` to Needs review, `ACKNOWLEDGED` to Under review, and `RESOLVED` to Closed. Priority SHALL map `HIGH` to High priority, `MEDIUM` to Needs attention, and `LOW` to Monitor. Branch choices SHALL come only from the already-authorized result scope and SHALL NOT broaden backend access.

The workspace SHALL show concise scope-level counts for need-review (`OPEN`), high-priority (`HIGH`), and under-review (`ACKNOWLEDGED`) flags. These counts SHALL be computed from the resolved tenant/branch scope independent of the visible client-side filters and pagination. Existing accessible popover behavior SHALL be retained, including keyboard navigation and focus restoration.

#### Scenario: Supervisor filters the queue

- **WHEN** the Supervisor changes a category, status, priority, or branch filter
- **THEN** the visible result set updates without changing the authorized backend scope
- **AND** the summary counts continue to describe the full authorized scope
- **AND** an empty result state retains the filters, summary, result heading, and clear next action

#### Scenario: Supervisor sees branch-scoped summaries

- **WHEN** the branch-scoped list response contains summary counts
- **THEN** the three summary values are presented as “Need review”, “High priority”, and “Under review”
- **AND** none of the counts is derived from only the currently visible five-item page

### Requirement: Supervisor case details explain evidence and next steps

Opening a case SHALL show an accessible dialog with distinct sections for **Case summary**, **Key details**, **What ShopCity did**, and **Suggested review**. The details SHALL use allowlisted evidence fields translated to readable labels and safe display values. The dialog SHALL NOT render a raw backend response, raw JSON evidence, internal IDs, dedupe keys, or internal status/severity/rule field names by default. A collapsed Technical reference section MAY expose the rule code and full case identifier on request, with an explicit copy action.

The read model MAY add branch name, customer full name, cashier account username, receipt number, safe integer-kobo amount, and scope summary counts. Such additions SHALL be derived through tenant-scoped, read-only lookups and SHALL NOT broaden list authorization or change persistence.

#### Scenario: Supervisor reviews a known rule

- **WHEN** a Supervisor opens a case with supported evidence
- **THEN** the dialog explains why it was flagged, shows the available related branch/person/receipt/amount context, states the known system action, and offers a practical review step
- **AND** evidence values use readable dates, counts, and integer-kobo currency formatting
- **AND** missing context is omitted or shown as unavailable instead of displaying an ID

#### Scenario: Supervisor requests technical reference

- **WHEN** a Supervisor expands Technical reference
- **THEN** the technical rule code and case identifier become available with a copy control
- **AND** those identifiers remain absent from the default dialog and row action label

#### Scenario: Branch or staff display names are unavailable

- **WHEN** related records have no display name
- **THEN** the interface uses the persisted branch name, customer full name, or cashier account username only when present
- **AND** it does not fabricate a personal name or display a raw identifier as a substitute

### Requirement: Supervisor decisions remain backend-authoritative

Acknowledgement and resolution SHALL continue using the existing decision endpoint, authenticated scope, CSRF protection, idempotency key, and required reason. The interface SHALL NOT present success before a successful backend response. On success it SHALL update/refresh from server data, close the dialog, and announce the resulting review status; on failure it SHALL retain the dialog and explain that the decision was not recorded. The Admin decision and presentation behavior SHALL remain unchanged.

#### Scenario: Supervisor records a decision

- **WHEN** a Supervisor selects Acknowledge or Resolve, provides a non-empty reason, and submits
- **THEN** the existing decision request receives the same case, decision, reason, CSRF protection, and idempotency key
- **AND** a successful response updates the case status from the server and announces Under review or Closed
- **AND** a non-success response does not imply the case changed and keeps the dialog available for correction/retry

### Requirement: Admin Fraud remains unchanged

The Admin fraud workspace SHALL retain its existing presentation, native status/severity selects, branch text query, available fields, response detail behavior, API behavior, and decisions. Supervisor-only labels, filters, styles, and dialog content SHALL NOT alter Admin behavior.

#### Scenario: Admin opens fraud review

- **WHEN** an Admin opens Fraud
- **THEN** the current Admin presentation and behavior remain unchanged

### Requirement: Redemption rule terminology has one canonical code

The runtime/persisted redemption rule code SHALL remain `FR-HV-003` as the canonical code. `FR-RED-001` MAY be recognized as a legacy presentation alias but SHALL NOT be emitted as a second active rule code by this change. Documentation SHALL state the canonical choice. Historical rows, dedupe keys, and fraud evaluation behavior SHALL NOT be migrated or changed.

#### Scenario: Redemption flag appears in Supervisor review

- **WHEN** a redemption flag uses `FR-HV-003` or the legacy alias `FR-RED-001`
- **THEN** it receives the same human-facing category and title
- **AND** only `FR-HV-003` is documented as the canonical runtime/persistence code

### Requirement: Existing results behavior remains accessible and responsive

The result section SHALL retain a persistent loading/empty state, labeled column headers on wide screens, and responsive rows/cards without document-level horizontal overflow. Pagination SHALL remain accessible, right-aligned, and display a concise `Page N` label. The existing five-item client-side page size SHALL remain unchanged. The Supervisor surface SHALL use a restrained contained card-directory visual system; changes SHALL be scoped so Admin styles are unaffected.

#### Scenario: No activity matches the selected filters

- **WHEN** the filters return no matching records
- **THEN** the results heading, scope summary, labels, and helpful empty state remain visible

#### Scenario: Supervisor uses a narrow viewport

- **WHEN** the route is displayed on a narrow screen
- **THEN** filters wrap within the workspace and result rows become compact readable cards
- **AND** the document has no horizontal overflow
