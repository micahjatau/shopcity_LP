## Requirements

### Requirement: Figma-aligned admin overview

The Admin Overview MUST render KPI cards for active customers, active virtual cards, credit issued, credit redeemed, outstanding liability, and pending approvals; a 7-day credit-issued-vs-redeemed chart; a registration chart; and a Recent activity section. It MUST preserve the application shell and `/admin` route.

#### Scenario: Overview displays supported live values

- **WHEN** authorized report and approval data is available
- **THEN** the page displays values from existing endpoints and existing report semantics/formatters
- **AND** does not display Figma prototype values as live data

#### Scenario: Metric has no trustworthy source

- **WHEN** no existing endpoint supplies a trustworthy metric value
- **THEN** the page marks that metric unavailable instead of presenting zero or an invented number

### Requirement: Historical charts preserve source semantics

The Overview MUST display available report dates and values without introducing new calculations or misrepresenting cumulative snapshots as daily increments.

#### Scenario: Registration snapshots are cumulative

- **WHEN** the source provides cumulative registered-customer counts
- **THEN** the chart labels or supporting text identifies the values as cumulative snapshots
- **AND** does not subtract adjacent values to infer daily registrations

#### Scenario: Report dates or fields are missing

- **WHEN** the executive report has no row or no valid integer-kobo value for a date in the selected seven-day window
- **THEN** that chart point is shown as missing/a gap, not as zero
- **AND** accessible labels and the screen-reader data table preserve the missing value

### Requirement: Recent activity labels are safe and understandable

The Overview MUST map known audit action/entity values to readable labels and MUST render unknown values using a readable fallback. Activity data MUST remain tenant-scoped by the existing API.

#### Scenario: Unknown audit value

- **WHEN** an event contains an action or entity type absent from the label dictionary
- **THEN** the page displays a human-readable fallback without hiding the event

#### Scenario: Audit actor name is unavailable

- **WHEN** the audit response provides an actor ID but no display name
- **THEN** the Overview shows a generic staff/system label rather than exposing the raw actor ID

### Requirement: Independent resilient view states

Each independently loaded Overview section MUST provide appropriate loading, empty, error, cooldown, and retry states. State changes MUST be announced accessibly and remain usable by keyboard and assistive technology. Successful responses MUST be validated against the existing `{ success, data, meta }` envelope and expected endpoint fields at runtime.

#### Scenario: Data is loading

- **WHEN** an Overview request is pending
- **THEN** a layout-preserving loading state is rendered and announced without displaying placeholder values as real metrics

#### Scenario: Request fails or returns no data

- **WHEN** a section request fails or the authorized response has no usable records
- **THEN** the section shows a contextual error or empty/unavailable state, with a retry action when applicable
- **AND** the remainder of the page stays usable

#### Scenario: API rate-limits a section

- **WHEN** an Overview API responds with HTTP 429 and an optional Retry-After value
- **THEN** automatic retries stop for that request
- **AND** only the affected section displays a retry countdown and disables its retry until the cooldown ends

#### Scenario: Report materialization is incomplete

- **WHEN** the report materialization-state API returns a status other than `COMPLETED`
- **THEN** the Overview displays a freshness warning using the API state and available materialization timestamp
- **AND** it does not invent a stale threshold or replace report values with a guessed fallback

#### Scenario: Keyboard user explores chart dates

- **WHEN** a keyboard user focuses a chart data point and presses an arrow key
- **THEN** the next/previous report date can be inspected with an accessible tooltip containing the exact source value or a clear missing-value label
