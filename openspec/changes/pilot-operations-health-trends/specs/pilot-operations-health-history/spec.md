# Pilot Operations Health History Specification

## Purpose

Define tenant-scoped hourly operational-health history and its Admin Operations Overview chart without altering the existing pilot summary response or other report presentations.

## ADDED Requirements

### Requirement: Pilot Operations history is collected as hourly tenant-scoped snapshots

The system MUST persist one aggregate snapshot per tenant and UTC-hour bucket using the same server-side metric calculation as the current pilot-operations summary. Snapshots MUST contain counts and reconciliation state only; they MUST NOT contain customer data, source event payloads, or financial values. Snapshots MUST be retained for no longer than 30 days. Row-level security MUST be enabled on the public-schema table, with no browser/Data API read policy; reads MUST go through the Admin-only backend endpoint.

#### Scenario: Worker collects a snapshot

- **WHEN** the worker completes a history collection cycle for a tenant
- **THEN** it upserts the tenant's current pilot-operations counts into that UTC-hour bucket
- **AND** it stores the actual sample time separately from the bucket start
- **AND** a repeated run for the same tenant/hour does not create a duplicate row
- **AND** the current summary and stored snapshot use the same threshold and metric calculations.

#### Scenario: Direct Data API access is denied

- **WHEN** an anon or authenticated browser role attempts to read snapshot rows directly
- **THEN** row-level security denies access
- **AND** the system exposes no client read policy or grant for the snapshot table.

#### Scenario: Worker prunes expired history

- **WHEN** an hourly history collection cycle completes
- **THEN** snapshots older than 30 days are deleted
- **AND** no source, audit, or financial records are modified or deleted.

#### Scenario: Collection is interrupted

- **WHEN** one or more hourly collection cycles are missed
- **THEN** the system leaves those buckets absent
- **AND** it does not backfill them using current counts or zero values.

### Requirement: Pilot Operations history is Admin-only and tenant-scoped

The system MUST expose an additive history endpoint that derives tenant scope from the authenticated Admin session. It MUST NOT accept a client-selected tenant ID, and MUST leave the existing pilot-operations summary contract unchanged.

#### Scenario: Admin requests a history window

- **WHEN** an Admin requests the `24h`, `7d`, or `30d` window
- **THEN** the response contains only that Admin session's tenant snapshots within the requested bounded window
- **AND** points are ordered by UTC bucket start ascending
- **AND** each point includes its bucket start, actual sample time, and the canonical pilot-operations metrics.

#### Scenario: Admin omits the window

- **WHEN** an Admin requests history without a window parameter
- **THEN** the endpoint returns the default `7d` window.

#### Scenario: Invalid window or unauthorized caller

- **WHEN** a caller supplies an unsupported window or lacks the Admin role
- **THEN** the endpoint rejects the request
- **AND** it does not expose data from another tenant.

#### Scenario: No history exists yet

- **WHEN** a tenant has no retained snapshots in the selected window
- **THEN** the endpoint returns an empty item list
- **AND** it does not synthesize zero-valued points.

### Requirement: Admin Operations presents observed history accessibly

The Admin Operations Overview MUST provide a selectable history metric and a `24h`, `7d`, or `30d` window. It MUST render only values returned by the history endpoint, preserve gaps for missing hourly buckets, and provide an explicit empty/collecting state. It MUST NOT use the current summary as historical data.

#### Scenario: Admin selects a trend metric and window

- **WHEN** an Admin selects a metric or history window
- **THEN** the chart shows that single metric from the selected historical range
- **AND** no other role or report presentation is changed.

#### Scenario: Samples are missing

- **WHEN** the selected window contains gaps between stored hourly snapshots
- **THEN** the chart breaks the line at each missing bucket
- **AND** missing buckets are not plotted as zero.

#### Scenario: History is still collecting

- **WHEN** no samples exist for the selected range
- **THEN** the Overview shows a collecting/empty state and the collection start is not represented as earlier history.

#### Scenario: Keyboard and assistive technology use

- **WHEN** an Admin uses the chart controls or a screen reader
- **THEN** metric/window controls have accessible labels
- **AND** the chart has a text description and an accessible table of the selected series' observed values and sample times.
