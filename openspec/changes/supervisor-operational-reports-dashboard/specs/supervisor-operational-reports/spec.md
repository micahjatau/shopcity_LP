# Supervisor Operational Reports Specification

## Purpose

Define the period-based operational overview available to an authorized Supervisor while preserving existing report scope, financial meaning, and detailed report-generation behavior.

## ADDED Requirements

### Requirement: Supervisor can select one shared reporting period

The `/supervisor/reports` route MUST offer Last 7 days, Last 30 days, and custom inclusive start/end dates. The selected period MUST be applied consistently to dashboard data requests and the detailed report builder. Custom ranges with a missing or later start date MUST NOT be applied.

#### Scenario: Supervisor changes a preset or custom period

- **WHEN** a Supervisor selects a supported preset or applies a valid custom range
- **THEN** dashboard requests use that range
- **AND** the detailed report builder uses the same start and end dates
- **AND** the selected range is clearly identified in the page

#### Scenario: Supervisor enters an invalid custom range

- **WHEN** the custom start date is missing or after the end date
- **THEN** the page explains that the range is invalid
- **AND** no requests are made for the invalid range
- **AND** the previously applied range remains in effect

### Requirement: Financial flow totals and outstanding snapshots remain distinct

The dashboard MUST sum daily loyalty purchase value, credit issued, and credit redeemed across available report dates in the selected period. Outstanding credit MUST use the latest available outstanding-liability snapshot in that period and MUST NOT be summed across dates. Values that are unavailable, invalid, or unsafe to aggregate MUST NOT be presented as zero.

#### Scenario: Supervisor reviews financial KPIs

- **WHEN** multiple daily financial report rows are available for the selected period
- **THEN** the three flow KPIs show the sum of their respective daily values
- **AND** outstanding credit shows the value from the latest report date only
- **AND** the outstanding-credit label identifies it as a closing balance and indicates its snapshot date when available

### Requirement: Dashboard requests preserve Supervisor branch scope

The dashboard MUST use existing reporting APIs and MUST NOT offer or send a client-selected branch identifier to widen the Supervisor's access. Backend authorization and branch scoping remain authoritative for every reporting category and the detailed report builder.

#### Scenario: Supervisor views dashboard and report data

- **WHEN** a Supervisor loads or filters the dashboard and detailed report builder
- **THEN** requests use the existing Supervisor-authorized reporting endpoints
- **AND** returned report data remains limited to the Supervisor's authorized branch by the backend
- **AND** the UI does not infer broader access from an empty response or report error

### Requirement: Operational summaries follow the selected category and period

The dashboard MUST provide daily activity and category-filtered summaries for overall activity, cashier performance, redemptions, and SMS, using only report data returned for the selected period. A category-specific failure or empty result MUST be identified without implying an authoritative zero count.

#### Scenario: Supervisor changes the operational-summary category

- **WHEN** the Supervisor selects a summary category
- **THEN** the page shows insights derived from that category's report rows for the selected period
- **AND** the daily chart and report builder remain tied to the same selected period

### Requirement: Existing detailed report generation remains available

The dashboard MUST retain the existing detailed report-generation and export workspace below the operational overview. Its report filters MUST follow the dashboard's selected date range, and existing role permissions and report actions MUST remain unchanged.

#### Scenario: Supervisor generates or exports a detailed report

- **WHEN** the Supervisor uses the detailed report workspace
- **THEN** its date range matches the currently selected dashboard period
- **AND** supported report selection, generation, and export actions remain available under existing authorization

### Requirement: Operational reports reflow across viewport sizes

The dashboard filters, KPI cards, chart, summaries, and detailed report workspace MUST remain readable and operable at desktop, tablet, and phone widths without document-level horizontal overflow.

#### Scenario: Supervisor uses reports on a narrow viewport

- **WHEN** the route is rendered at a phone or tablet width
- **THEN** controls and report content reflow without clipping or horizontal page overflow
- **AND** all period and category controls remain operable
