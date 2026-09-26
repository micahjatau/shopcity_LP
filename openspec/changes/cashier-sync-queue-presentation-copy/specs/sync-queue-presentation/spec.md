## ADDED Requirements

### Requirement: Sync Queue shares Cashier typography and copy hierarchy

The Sync Queue SHALL compose its page heading with the shared Cashier page header and SHALL match the title and description typography used by the other Cashier workflow routes. Its single page title SHALL be visually strongest; status/card headings SHALL be subordinate and body copy SHALL remain readable and concise. Copy SHALL identify saved purchases and explain the local queue without implying that submission guarantees confirmation.

#### Scenario: Cashier opens the Sync Queue

- **WHEN** `/cashier/sync` is rendered beside another Cashier workflow route
- **THEN** both routes use the same page-title and description typography
- **AND** the Sync Queue uses one H1 followed by lower-level section headings and body copy
- **AND** its copy explains what is saved locally and what happens during sync

#### Scenario: Cashier has no local purchases

- **WHEN** a successful local queue read returns no records
- **THEN** the empty-state heading and body describe that there are no saved purchases on this device
- **AND** the Capture Purchase action is labeled consistently with the workflow route

### Requirement: Sync Queue explains the local queue and batch scope truthfully

The Sync Queue SHALL describe records as saved on the current device and SHALL state that sync submits waiting, saved-on-device, and retry-required records. It SHALL NOT claim that submission confirms every record. The page SHALL retain an explicit distinction between local queue state and confirmation.

#### Scenario: Operator reviews the queue before syncing

- **WHEN** the cashier opens `/cashier/sync`
- **THEN** the heading copy describes locally saved records and the eligible batch states
- **AND** the confirmation boundary is stated without promising success
- **AND** the primary action label does not imply that only waiting records are submitted

### Requirement: Internal sync states are presented in readable language

The Sync Queue SHALL show human-readable labels for local state values in the queue, selected-record details, and record detail dialog. It SHALL preserve exact state values in filtering, queue persistence, status transitions, and API interactions. Missing-value placeholders SHALL use plain accessible language rather than em-dash punctuation.

#### Scenario: Queue record is shown

- **WHEN** a record is waiting, saved on device, syncing, awaiting approval, confirmed, rejected, or requires another attempt
- **THEN** the visible label communicates that state in readable language
- **AND** the source enum remains the value used by logic and filters

#### Scenario: Optional record detail is absent

- **WHEN** a visible row, detail, or result has no optional value
- **THEN** the page communicates that the value is unavailable without an em dash

### Requirement: Existing queue information remains accessible and responsive

The Sync Queue SHALL retain its table, search and status filters, summary, selected-record detail, sync results, and expandable technical diagnostics. At narrow viewport widths the controls SHALL remain operable and table overflow SHALL remain contained without document-level horizontal overflow.

#### Scenario: Cashier uses a populated queue on a narrow viewport

- **WHEN** `/cashier/sync` is rendered at 375 CSS pixels wide with local records
- **THEN** heading, refresh and sync controls, summary, search, and status filter remain visible and usable
- **AND** table scrolling is contained within its existing scroll region
- **AND** search and status filters span the available queue-card width
- **AND** the shell shows compact mobile navigation instead of a permanent sidebar
- **AND** the main page has no horizontal overflow

#### Scenario: Cashier uses the queue where shell content is constrained

- **WHEN** `/cashier/sync` is rendered with less than 1040 CSS pixels of available page-container width
- **THEN** the queue records panel occupies the full available width when sync activity is absent
- **AND** the heading copy stacks above the action toolbar
- **AND** the page has no horizontal overflow

#### Scenario: Cashier has meaningful queue and sync activity

- **WHEN** `/cashier/sync` is rendered with queue records and sync results at 1040 CSS pixels or more of available page-container width
- **THEN** Queue records and Sync activity may render side by side
- **AND** the layout uses the available content width after the shared sidebar

### Requirement: Queue availability and session identity are truthful

The Sync Queue SHALL model local queue read availability separately from session device identity. It SHALL show a loading state while a local read is pending, an empty state and zero count only after a successful empty read, and an unavailable state with unknown count after a failed read. When local records are readable but the session device identity is missing, the records SHALL remain visible and sync SHALL remain disabled. The page SHALL offer only recovery actions supported by the app.

#### Scenario: Local queue read is pending or fails

- **WHEN** local queue access is pending or fails
- **THEN** the page SHALL NOT show a definitive empty queue or zero count
- **AND** a failed queue read SHALL offer a retry of local queue access

#### Scenario: Queue is empty or session device identity is unavailable

- **WHEN** a local queue read succeeds with zero records
- **THEN** the page shows “0 records” and a next-step Capture Purchase link without an empty-state footer
- **AND** if session device identity is missing, the page keeps the empty state truthful, disables Sync, and offers the supported reconnect-to-sign-in action
