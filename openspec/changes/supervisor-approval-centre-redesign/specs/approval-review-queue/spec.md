# approval-review-queue Specification Delta

## ADDED Requirements

### Requirement: Supervisor approval centre presentation

The system SHALL present `/supervisor/approvals` as a responsive, accessible master/detail approval centre, while the Admin approval route retains its existing presentation.

#### Scenario: Supervisor reviews a pending approval

- **WHEN** a Supervisor opens the approval centre
- **THEN** the page shows the heading and descriptive subtitle, category tabs, compact queue controls, and side-by-side queue and decision cards at wide viewports
- **AND** narrow viewports stack the cards without horizontal page overflow
- **AND** the queue card is titled “Recent customers” with the specified subtitle
- **AND** the first pending row is selected after page load with a full-width soft-pink selected state
- **AND** both cards have equal height on desktop and the decision content scrolls internally when needed
- **AND** selecting a queue row loads its API-backed details in the decision card
- **AND** missing wallet balance, lifetime earned, or submitted explanation fields display “Not provided” rather than inferred data
- **AND** pending approvals have a required free-text decision reason using the placeholder “Enter reason” and direct Approve/Reject actions through the existing audited decision request
- **AND** View Customer links to the selected customer's supervisor profile when a real customer ID is returned
- **AND** a successful decision removes the item from the queue and selects the next pending row

#### Scenario: Supervisor approval categories

- **WHEN** a Supervisor opens the approval centre
- **THEN** the category tabs are limited to High-value transaction and Late receipt claim
- **AND** Late receipt claim means an earn claim submitted more than seven elapsed days after receipt occurrence and uses the exact `LATE_RECEIPT_CLAIM` reason code
- **AND** Manual adjustment and OTP override are not presented as Supervisor approval categories
- **AND** the UI sends the selected typed category to the approvals API and only matching records are returned before cursor pagination
- **AND** each badge shows the API's exact count for that category under the current authorized scope, status, and search filters, independent of cursor pagination and selected category
- **AND** unsupported/unknown categories are not assigned to a tab
- **AND** counts and rows are not derived from unrelated fields in the browser

#### Scenario: Late receipt claim requires approval

- **WHEN** an otherwise valid earn request is received more than seven elapsed days after its `occurredAt` receipt time
- **THEN** the service records the receipt and a pending EARN approval with reason code `LATE_RECEIPT_CLAIM`
- **AND** the response identifies that reason code and pending approval
- **AND** no loyalty ledger entry, credit lot, or earn-confirmation SMS is created before approval
- **AND** the existing tenant/branch, device/card/customer eligibility, duplicate receipt, idempotency, approval expiry, and requester/decider separation safeguards remain enforced
- **AND** the existing audited approval decision revalidates eligibility and policy before creating the financial effect
- **AND** late receipt is the primary category when the claim also exceeds the high-value purchase threshold
- **AND** timestamp override rules for claims not more than seven days old remain unchanged

### Scenario: Cashier provides receipt occurrence time

- **WHEN** a cashier enters an earn receipt
- **THEN** the Occurred at datetime field is marked required
- **AND** an empty or invalid timestamp prevents review and submission

### Scenario: Category filtering and counts span cursor pages

- **WHEN** a Supervisor requests approvals with a category, status, search, and cursor
- **THEN** the API applies tenant and branch authorization scope, status, search, and category filters before pagination
- **AND** returned items include the API-derived category
- **AND** `totalCount` is exact for the selected category and search/status scope independent of cursor
- **AND** per-category counts reflect the same caller, status, and search scope and are independent of cursor and selected category
- **AND** the category filter cannot expose records outside the caller's authorized scope

### Scenario: Supervisor queue columns follow the selected category

- **WHEN** the Supervisor views the Recent customers queue
- **THEN** High-value transaction rows show the Name and Amount columns
- **AND** Late receipt claim rows show the Name and Receipt Age columns
- **AND** receipt age is the elapsed time from receipt `occurredAt` to approval `requestedAt`
- **AND** the approvals list API includes the receipt occurrence time needed to show that age

### Scenario: Supervisor filter dropdowns match Cards

- **WHEN** the Supervisor opens a status or page-size filter menu
- **THEN** its menu and option styles match the existing Cards table status filter menu
- **AND** its options remain keyboard-operable and accessibly labeled

### Scenario: Supervisor views a selected request

- **WHEN** a pending approval is selected
- **THEN** the detail panel shows Request UUID, Customer, Amount, Wallet Balance, Lifetime Earned, Date & Time, and Submitted by in the specified order
- **AND** the Reason submitted callout shows request-provided free text or “Not provided”
- **AND** View Customer links to `/supervisor/customers/:id` only when an API customer ID exists

#### Scenario: Decision reason is empty

- **WHEN** the reviewer submits Approve or Reject with an empty/whitespace decision reason
- **THEN** the decision request is not sent
- **AND** an inline brand-red validation message is shown

#### Scenario: No queue row is selected

- **WHEN** no approval is selected
- **THEN** the decision card shows the design's prompt to select an item

#### Scenario: Admin opens approvals

- **WHEN** an Admin opens `/admin/approvals`
- **THEN** the existing Admin presentation and behavior remain unchanged
