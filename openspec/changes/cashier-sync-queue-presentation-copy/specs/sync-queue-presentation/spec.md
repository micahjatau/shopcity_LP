## ADDED Requirements

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

#### Scenario: Cashier uses the queue on a narrow viewport

- **WHEN** `/cashier/sync` is rendered at 375 CSS pixels wide
- **THEN** heading, refresh and sync controls, summary, search, and status filter remain visible and usable
- **AND** table scrolling is contained within its existing scroll region
- **AND** the main page has no horizontal overflow
