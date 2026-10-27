# frontend-prototype-parity Specification

## Purpose

Define truthful prototype-to-React parity for the ShopCity operational frontend while preserving production behavior and authority boundaries.

## ADDED Requirements

### Requirement: Prototype parity preserves production authority

The frontend MUST use approved prototype structure for presentation without allowing prototype controls, roles, fields, or fixture data to override backend authority.

#### Scenario: Unsupported role is displayed

- **WHEN** the login presentation includes a role not supported by the application
- **THEN** the role MUST be informational or unavailable
- **AND** the authenticated role MUST come from the backend session

#### Scenario: Prototype contains an unsupported financial field

- **WHEN** a prototype field has no API contract
- **THEN** the field MUST NOT be submitted as fabricated financial data
- **AND** the deviation MUST be documented

### Requirement: Financial workflows retain distinct stage composition

Capture Purchase and Redeem Credit MUST retain their distinct stage hierarchy and production-safe state handling.

#### Scenario: Capture Purchase reaches review

- **WHEN** a verified card and receipt details are ready for submission
- **THEN** the UI MUST show the prototype-derived review context and authoritative submission state
- **AND** confirmed, pending, failed, or uncertain outcomes MUST remain visually distinguishable

#### Scenario: Redeem loses connectivity

- **WHEN** connectivity is unavailable during redemption
- **THEN** the UI MUST NOT enable offline redemption
- **AND** the existing truthful recovery state MUST remain visible

### Requirement: Discovery does not grant financial authorization

Directory customer matches MUST remain distinct from verified active-card context.

#### Scenario: Directory search returns a match

- **WHEN** a customer is found by name or phone
- **THEN** the UI MUST show discovery results
- **AND** it MUST NOT imply that Earn or Redeem is authorized until active-card verification succeeds

### Requirement: Shared shell and search remain role-aware

The shared shell MUST retain one sidebar/one topbar architecture, approved geometry, and role-authorized search categories without claiming deferred notification/profile functionality.

#### Scenario: Role-aware global search renders

- **WHEN** the shell renders for Cashier, Supervisor, or Admin
- **THEN** Cashier MUST see Customers and Cards categories
- **AND** Supervisor/Admin MAY additionally see Cashiers
- **AND** authorization, masking, and route geometry MUST remain intact

#### Scenario: Overview quick actions render

- **WHEN** Cashier Overview renders its quick actions
- **THEN** actions MUST follow production role policy
- **AND** Cashier MUST NOT receive customer-registration authority merely because the prototype displays a Register Customer action

### Requirement: Route DOM structure and page content remain prototype-faithful

Mapped React screens MUST preserve the approved prototype-derived semantic regions, page-content order, form grouping, workflow-stage composition, and stable landmarks, except for documented production, authorization, accessibility, or unsupported-contract deviations.

#### Scenario: Overview is rendered

- **WHEN** the Overview route is displayed
- **THEN** the DOM order MUST be heading/actions, activity label, four metrics, recent-transactions heading/table, and bounded footer/destination action
- **AND** the route MUST preserve stable landmarks for those regions

#### Scenario: Financial workflow is rendered

- **WHEN** Capture Purchase or Redeem Credit is displayed
- **THEN** the route MUST retain its route-specific stage headings, lookup/form grouping, review context, status region, and outcome region
- **AND** it MUST NOT flatten both workflows into one generic form or hide accessible context to match a stale screenshot

#### Scenario: Transactions or registration is rendered

- **WHEN** Transactions or focused Register Customer is displayed
- **THEN** the DOM MUST preserve the approved heading, controls/form, content region, footer/result, and dialog grouping
- **AND** broader customer-management content MUST NOT be silently mixed into the focused registration flow

### Requirement: Comparison evidence is reproducible

Prototype parity MUST be assessed using matching route, role, state, viewport, browser, and candidate SHA.

#### Scenario: Evidence is captured

- **WHEN** a prototype and React screen are compared
- **THEN** structure, geometry, behavior, accessibility, and responsive evidence MUST be recorded
- **AND** a refreshed React snapshot alone MUST NOT be treated as proof of prototype parity

### Requirement: Registration retries preserve logical identity

Registration presentation MUST preserve the existing controller's authorization and logical idempotency semantics when a response is uncertain.

#### Scenario: Registration response is uncertain

- **WHEN** a registration request times out or returns an uncertain response
- **THEN** retry handling MUST NOT silently create a new logical registration request
- **AND** the UI MUST preserve truthful pending/recovery state

### Requirement: Bounded transaction scope is truthful

Transactions presentation MUST distinguish a bounded cashier activity feed or client-side page from complete transaction history.

#### Scenario: Bounded activity is displayed

- **WHEN** the transaction route renders a bounded response
- **THEN** pagination and destination wording MUST NOT claim complete historical coverage
- **AND** unsupported fields MUST remain explicitly unavailable rather than fabricated

### Requirement: Derived screens are labelled honestly

Screens without a complete approved prototype, including Sync Queue, MUST be evaluated as derived production compositions rather than literal one-to-one adaptations.

#### Scenario: Sync Queue is certified

- **WHEN** Sync Queue evidence is published
- **THEN** its shared visual language, accessibility reading order, and production semantics MUST be verified
- **AND** the evidence MUST identify it as derived rather than claim nonexistent prototype parity
