# Prototype-exact production views Specification

## Purpose

Define the production frontend contract for using the frozen prototype render tree as the visual source of truth while retaining backend-authoritative ShopCity behavior.

## ADDED Requirements

### Requirement: Prototype owns production view structure

The production frontend SHALL render the approved prototype hierarchy, dimensions, spacing, responsive composition, `data-od-id` attributes, and status/success slots for each migrated route, with business state supplied through a view-model.

#### Scenario: Prototype identity is preserved

- **GIVEN** an approved prototype element has a `data-od-id`
- **WHEN** the corresponding production route renders
- **THEN** the React element carries the same `data-od-id`
- **AND** the element remains in the corresponding prototype hierarchy

#### Scenario: Business state does not add unapproved geometry

- **GIVEN** a workflow is loading, invalid, offline, pending, or failed
- **WHEN** the production view renders that state
- **THEN** the message uses the prototype's status or success slot
- **AND** the view does not add an Alert, policy, context, sync, or status card unless the approved prototype contains it

### Requirement: Operational shell matches the approved prototype

The operational shell SHALL use the prototype sidebar, topbar, content geometry, role-allowed navigation, real connection state, session initials, logout behavior, responsive breakpoints, and accessible interaction behavior without visible branch/device/sync/control additions that are not in the prototype.

#### Scenario: Cashier shell has only approved desktop geometry

- **GIVEN** an authenticated cashier opens a non-login route on desktop
- **WHEN** the shell renders
- **THEN** it presents the prototype sidebar and the Search/System Online/bell/avatar topbar
- **AND** branch, device, sync, route, and session metadata remain behavior-only or accessible metadata unless an approved slot exists
- **AND** no injected collapse control or duplicate status geometry changes the desktop layout

#### Scenario: Role and session behavior remain authoritative

- **GIVEN** a session has a backend-resolved role, branch, device, and connection state
- **WHEN** the shell renders or logout/expiry occurs
- **THEN** navigation, avatar, online state, logout, and expiry behavior use that authoritative state
- **AND** frontend presentation cannot grant a role or alter session authority

### Requirement: Cashier views use dedicated prototype flows

The cashier overview, customer lookup, Earn, Redeem, and Transactions routes SHALL use dedicated prototype-exact views rather than a generic layout that exposes production implementation cards.

#### Scenario: Overview preserves bounded activity truthfully

- **GIVEN** `/cashier` loads the bounded cashier-today feed
- **WHEN** the overview renders
- **THEN** it shows the prototype heading, actions, notice, four metrics, recent-transactions table, local receipt search, result count, and View all link
- **AND** it labels and paginates only the loaded bounded activity rather than implying complete history

#### Scenario: Lookup separates discovery from financial authority

- **GIVEN** a cashier searches by name or phone or scans/types a card serial
- **WHEN** lookup completes
- **THEN** directory results are treated as discovery only
- **AND** financial context becomes verified only after authoritative card lookup
- **AND** the prototype's single search surface remains visually intact

#### Scenario: Earn uses one persistent flow panel

- **GIVEN** a cashier opens `/cashier/earn`
- **WHEN** the route renders any step
- **THEN** one `data-od-id="capture-flow"` panel contains find, confirm, receipt, review, and success states
- **AND** only the current state is visible
- **AND** card authority, integer-kobo validation, CSRF, idempotency, device/branch context, policy, offline queue, and typed outcomes remain enforced

#### Scenario: Redeem uses one persistent flow panel

- **GIVEN** a cashier opens `/cashier/redeem`
- **WHEN** the route renders any step
- **THEN** one prototype flow panel contains find, basket, amount, confirmation, and success states
- **AND** available credit, basket subtotal, limits, approval, offline policy, idempotency, and typed server outcomes remain authoritative

### Requirement: Controllers isolate trusted behavior from views

The production frontend SHALL extract workflow behavior into controllers/hooks and provide simple view-models that do not expose security, persistence, DTO, or infrastructure internals to prototype views.

#### Scenario: Earn controller preserves existing behavior

- **GIVEN** `useEarnTransactionController()` is used by Capture Purchase
- **WHEN** the user looks up, advances, submits, retries, or saves offline
- **THEN** it preserves the existing generated API client, card lookup, CSRF, idempotency, integer-kobo conversion, receipt-week, device, branch, policy, duplicate, approval, offline, and error logic
- **AND** the view receives only display values and actions

#### Scenario: View-model does not expose trust-boundary internals

- **GIVEN** a prototype view receives a workflow view-model
- **WHEN** it renders
- **THEN** it does not receive raw API errors, CSRF tokens, database IDs, session cookies, device IDs, branch IDs, DTO construction details, or receipt-week internals

### Requirement: Registration is truthful to the MVP contract

The registration view SHALL preserve the approved prototype visual grammar while collecting only the production contract's full name, phone, optional email, and initial card serial through an atomic authorized operation.

#### Scenario: Registration uses the approved production steps

- **GIVEN** an authorized Supervisor or Admin opens registration
- **WHEN** the form renders
- **THEN** the steps are Customer information, Initial card, and Review with the approved panel geometry and success state
- **AND** birthday, marketing, loyalty-consent, and consent-version fields are absent unless separately approved by the contract

#### Scenario: Registration cannot be granted by frontend role selection

- **GIVEN** a user selects or changes a displayed staff-role option
- **WHEN** registration or navigation is attempted
- **THEN** backend session RBAC remains authoritative
- **AND** the frontend selection cannot grant Supervisor/Admin capability

### Requirement: Prototype references provide quantitative acceptance evidence

The migrated frontend SHALL maintain a reference manifest and automated screenshot and DOM-geometry checks against the committed `figmaExport` assets at reference SHA `410ecd75`.

#### Scenario: Static visual regions meet mismatch thresholds

- **GIVEN** a route is rendered at its approved viewport with deterministic fixtures
- **WHEN** its screenshot is compared with the reference
- **THEN** static/chrome pixel mismatch is below 1% initially and is tightened toward 0.5%
- **AND** only approved dynamic text areas may be masked

#### Scenario: Geometry is compared through prototype IDs

- **GIVEN** matching prototype and React elements expose `data-od-id`
- **WHEN** the geometry test runs
- **THEN** it compares position, size, padding, gap, radius, typography, colors, and borders
- **AND** it enforces the approved tolerances of ±2px for position/size, ±1px for padding/gap, exact radius/font-size, and token-equivalent colors

### Requirement: Deviations and bounded scope are explicit

The production frontend SHALL record every intentional deviation from the prototype and SHALL reject visual parity achieved by fake data, discarded inputs, synthesized history, or weakened authorization.

#### Scenario: Contract conflict is resolved explicitly

- **GIVEN** a prototype field such as Till / cashier reference has no production property
- **WHEN** the route is approved
- **THEN** the field is connected to a real backend property or removed from the approved design
- **AND** it is never rendered as an input whose value is silently discarded

#### Scenario: Bounded transactions remain honest

- **GIVEN** the cashier feed is bounded
- **WHEN** the transactions view renders search, filters, detail, or pagination
- **THEN** scope language states that results are loaded/bounded activity
- **AND** the UI does not imply complete transaction history or synthesize audit events
