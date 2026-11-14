## Purpose

Keep Supervisor data tables recognizable and usable on narrow screens while maintaining the same records, actions, desktop presentation, and authorized branch scope as the existing workflows.

## ADDED Requirements

### Requirement: Supervisor list tables preserve desktop presentation on mobile

The Supervisor customer, issued-card, transactions, and flagged-activity list tables MUST retain their desktop table language at mobile widths, including visible column headers, cells, row dividers, status treatments, and actions. Wide tables MAY scroll horizontally within their own table region. The page MUST NOT gain horizontal overflow. Mobile filters MUST remain usable. Data, filters, pagination, actions, route destinations, branch authorization, and desktop behavior MUST remain unchanged.

#### Scenario: Supervisor views a mobile list table

- **GIVEN** an authorized Supervisor opens `/supervisor/customers`, `/supervisor/cards`, `/supervisor/transactions`, or `/supervisor/fraud` at a mobile viewport
- **WHEN** the populated results table is rendered
- **THEN** column headers and cells remain in a table layout rather than being transformed into label/value cards
- **AND** horizontal overflow is contained within the table region
- **AND** the document does not scroll horizontally
- **AND** existing filters and row actions remain usable

#### Scenario: Supervisor views an empty or loading list

- **GIVEN** a Supervisor list is loading or has no matching records
- **WHEN** its table state is rendered at a mobile viewport
- **THEN** the existing loading, empty, and error content remains readable within the table region
- **AND** the change does not fabricate rows or alter the existing state behavior

#### Scenario: Supervisor views a list table on desktop

- **GIVEN** an authorized Supervisor opens one of the affected routes at a desktop viewport
- **WHEN** results are rendered
- **THEN** the existing desktop layout, data, filtering, pagination, and actions remain unchanged
