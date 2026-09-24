# frontend-shell-routing Specification

## Purpose

Define the route matrix, shell ownership, prototype-derived structure, responsive states, measurable search behavior, and evidence gates for the remaining prototype-first reconstruction. These requirements do not certify implementation completion.

## ADDED Requirements

### Requirement: Shared operational navbar follows the approved prototype composition

The frontend SHALL use one shared operational navbar whose visible hierarchy follows the approved prototype topbar while preserving role-aware search authorization and existing shell behavior.

#### Scenario: Cashier sees the approved search categories

- **GIVEN** an authenticated cashier session on any operational route
- **WHEN** the shared navbar renders
- **THEN** the search input and category selector are presented as adjacent controls
- **AND** the available categories are Customers and Cards
- **AND** session/device diagnostic copy is not rendered in the navbar presentation

#### Scenario: Supervisor or admin sees authorized categories

- **GIVEN** an authenticated supervisor or admin session
- **WHEN** the shared navbar renders
- **THEN** the category selector offers Customers, Cards, and Cashiers
- **AND** unauthorized search results remain unavailable

### Requirement: Approved prototype markup governs route presentation structure

The frontend SHALL translate approved prototype markup into React presentation hierarchy for the operational routes while retaining authoritative production controllers and truthful state handling.

#### Scenario: Overview preserves prototype content order

- **GIVEN** an authenticated cashier opens Overview
- **WHEN** the page renders
- **THEN** the page heading, quick actions, activity metrics, recent-transactions table, and footer appear in the approved prototype order
- **AND** bounded production activity data and role-authorized actions remain in control of the content

#### Scenario: Workflow route preserves production behavior under prototype presentation

- **GIVEN** a cashier uses Find Customer, Capture Purchase, Redeem Credit, or Transactions
- **WHEN** the route renders or advances state
- **THEN** its visible hierarchy follows the approved route prototype
- **AND** lookup, authorization, financial validity, masking, idempotency, offline, loading, error, and success behavior remains authoritative

### Requirement: Prototype comparison is separate from regression snapshots

The frontend SHALL require route/state/viewport comparison evidence against approved prototype references before declaring a route visually complete.

#### Scenario: A route is certified

- **GIVEN** a route implementation is proposed as complete
- **WHEN** its acceptance evidence is reviewed
- **THEN** matching prototype and React screenshots, DOM landmarks, responsive/accessibility checks, and intentional deviations are recorded
- **AND** passing React snapshots alone do not certify visual completion

### Requirement: The complete route matrix is explicit

The change SHALL maintain a structured matrix for `/login`, `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, `/cashier/transactions`, `/supervisor/customers`, focused registration at `/supervisor/customers/new` and `/admin/customers/new`, `/supervisor/transactions`, `/admin/transactions`, and `/cashier/sync`, including exact HTML reference or derived/out-of-scope disposition, React entry/root landmark, role, state set, DOM order, and responsive state at every required viewport.

#### Scenario: Every mapped route has a reference disposition

- **WHEN** the route matrix is reviewed
- **THEN** each required operational route and both focused registration routes appears exactly once
- **AND** each row names an exact HTML file or explicitly says Derived or Out of scope with the reason
- **AND** no production capture, Playwright baseline, or prototype source is silently substituted for another artifact class

#### Scenario: A responsive route state is reviewed

- **WHEN** a route is checked at 1440, 1024, 920, 768, 767, 700, 620, 390, or 375 CSS pixels
- **THEN** the matrix identifies the expected shell/content/control state for that width
- **AND** loading, empty, error, success, and authorization states remain truthful where the route supports them

### Requirement: Shell geometry has one owner and a numeric formula

`AppShell` SHALL own shell geometry and auxiliary regions; route roots SHALL own only route-specific grouping and widths. The post-sidebar column, padding, topbar width, and route width SHALL follow the formula in the design contract rather than a competing capped wrapper.

#### Scenario: Numeric geometry is evaluated

- **WHEN** viewport width is `W`
- **THEN** `M(W) = max(0px, W - S(W))`, topbar content width is `M(W) - 2P(W)`, and route width is `min(C(route), M(W) - 2P(W))`
- **AND** the topbar is not capped to the route content width
- **AND** Capture is 860px, Redeem is 720px, Find Customer's outer route is 1080px, and its HTML-authoritative search panel is 712px when available space permits

#### Scenario: Auxiliary shell regions remain in order

- **WHEN** protected shell content renders
- **THEN** `BrowserStateBootstrap`, the shell status row, and `OfflineIndicator` occur exactly once inside `<main id="shell-main-content">` before the protected route child
- **AND** no route duplicates, relocates, or hides those regions

### Requirement: Breakpoints produce explicit responsive states

The shell SHALL implement the documented 920/620 transitions and Capture/Redeem 700px transition, with required checks at both sides of 767/700 and all narrow viewports.

#### Scenario: Breakpoint behavior is checked

- **WHEN** the viewport crosses 920, 700, or 620 CSS pixels
- **THEN** sidebar collapse/mobile replacement, control stacking, heading reflow, flow width, and metric columns change according to the route matrix
- **AND** `scrollWidth` is no greater than `clientWidth` at 620, 390, and 375
- **AND** DOM order does not change merely to obtain a visual arrangement

### Requirement: The operational status is measurable

The shared topbar SHALL expose the intended System Online visual state as a measurable status region without making network status or notification functionality authoritative from presentation code.

#### Scenario: System Online is rendered

- **WHEN** an authenticated operational shell is in the documented online fixture
- **THEN** a visible element in the topbar contains exact text `System Online`
- **AND** the status region has a stable selector/landmark and remains present at desktop and tablet widths
- **AND** the mobile 620px-and-below state follows the prototype and hides the compact status pill without hiding the underlying truthful connectivity state
- **AND** loading, error, or offline fixtures use their truthful status instead of falsely claiming online

### Requirement: Role-aware search and Admin card handoff are exact

The category list, query behavior, masking, and result routing SHALL remain role-authorized and measurable.

#### Scenario: Search categories are asserted by role

- **WHEN** the shared search renders for Cashier, Supervisor, or Admin
- **THEN** Cashier has exactly Customers and Cards
- **AND** Supervisor/Admin have exactly Customers, Cards, and Cashiers
- **AND** the category control is adjacent to the input, has non-zero measurable width at every matrix viewport, and does not cause horizontal overflow

#### Scenario: Admin card result is selected

- **WHEN** an Admin searches and selects a card result
- **THEN** the selected result link has exact `href="/admin/cards"`
- **AND** result masking, keyboard selection, focus return, and unauthorized category behavior remain unchanged

#### Scenario: Search submission states remain truthful

- **WHEN** a user submits a query in an authorized category
- **THEN** the requested query is echoed in the result or status region
- **AND** duplicate submission is disabled while the authoritative request is loading
- **AND** an empty result renders an explicit empty state
- **AND** an authoritative API failure renders its safe error state without fabricated results

### Requirement: Route landmark order is normative

Each route SHALL preserve the matrix's React entry, root landmark, child landmark sequence, and route-specific state regions in DOM order; visual styling SHALL not use CSS `order` to contradict assistive-technology order.

#### Scenario: Landmark order is checked

- **WHEN** a route landmark audit runs
- **THEN** Overview is heading/actions → activity/metrics → recent transactions/footer
- **AND** Find Customer is heading/action → search → status → recent/results/actions
- **AND** Capture/Redeem stages and outcome follow their matrix sequence
- **AND** Transactions is heading/refresh → filters → table/footer → detail dialog

### Requirement: Wrapper scope is allowlisted

Only the shell wrappers and route semantic wrappers listed in the design contract MAY own layout. A wrapper SHALL be removed, replaced, or explicitly justified when it competes for width, landmark, or order ownership.

#### Scenario: Wrapper audit is performed

- **WHEN** a wrapper audit reviews AppShell, route roots, flow panels, Transactions, or Sync Queue
- **THEN** shell frame/body/main and one named route root are retained as the allowlisted structural wrappers
- **AND** duplicate shell auxiliary regions, anonymous capped route wrappers, and order-only wrappers are rejected
- **AND** a dialog portal is allowed only for dialog semantics/focus management

### Requirement: Sync Queue DOM order is stable

Sync Queue SHALL be documented and implemented as a derived composition, not direct full-page prototype parity, with one unique toolbar and a stable DOM sequence.

#### Scenario: Empty Sync Queue is audited

- **WHEN** `/cashier/sync` renders at any required viewport
- **THEN** metrics/status precede the unique toolbar, the toolbar precedes the queue table, and the queue table precedes selected details/dialog
- **AND** `.cashier-sync-queue` precedes `.cashier-sync-priority` in DOM and visual reading order
- **AND** CSS order is not used to reverse that sequence

### Requirement: Prototype comparisons and baselines are separated

A Playwright baseline or React snapshot SHALL NOT be updated or used as prototype parity evidence before a same route/state/role/browser/viewport comparison and an approved stale-artifact decision.

#### Scenario: A dimension conflict is found

- **WHEN** a retained screenshot disagrees with the HTML geometry
- **THEN** the HTML source is authoritative unless an explicitly approved production deviation records rationale and provenance
- **AND** the historical 640px Find Customer screenshot is classified as superseded evidence because `find-customer.html` specifies a 712px search panel
- **AND** no baseline, test assertion, or source content is changed merely to make dimensions match

#### Scenario: A visual artifact is proposed for update

- **WHEN** a production capture or Playwright baseline is proposed for update
- **THEN** the evidence names route, state, role, browser, locale/timezone, viewport, candidate SHA, old/new dimensions, direct pairing, and approval
- **AND** a React snapshot alone is insufficient evidence

### Requirement: Second pass and final artifact gates are normative

The second passthrough review and final artifact review SHALL be explicit gates; passing functional tests alone SHALL NOT close this change.

#### Scenario: Second passthrough review runs

- **WHEN** the first implementation pass is complete
- **THEN** a second review checks every matrix row, shell formula, breakpoint, landmark order, wrapper action, auxiliary region, search assertion, System Online state, Admin card handoff, and Sync Queue order
- **AND** every P1/P2 gap is resolved or classified as an approved deviation or current blocker
- **AND** no implementation task is marked complete solely because an older historical check passed

#### Scenario: Final artifacts are gated

- **WHEN** handoff evidence is assembled
- **THEN** it includes the matrix, artifact taxonomy/provenance, exact command outputs, changed-path inventory, `git diff --check`, and no-staged-files result
- **AND** strict OpenSpec validation passes
- **AND** implementation remains uncertified while a current blocker or unavailable comparison gate remains
