# Cashier layout alignment

## ADDED Requirements

### Requirement: Shared visual contract governs Cashier presentation

The application SHALL define one browser-verifiable visual contract for page headings, supporting descriptions, cards, form fields, primary and secondary buttons, search controls, status messages, tables, and dialogs. Route composition SHALL consume the canonical owners and SHALL NOT redefine their appearance through undocumented route-local styles.

#### Scenario: Canonical control appearance is consistent across routes

- **GIVEN** the six Cashier routes are rendered with stable fixtures
- **WHEN** the shared visual-contract checks inspect computed styles
- **THEN** each route uses the same canonical values for the applicable control, surface, typography, focus, and semantic-status properties
- **AND** a change made in the canonical primary-button owner is reflected consistently across all six routes

#### Scenario: Route composition cannot create a competing appearance owner

- **GIVEN** a route stylesheet adds a declaration for a canonical component
- **WHEN** the property-scoped ownership checker evaluates the production stylesheet inventory
- **THEN** composition-only declarations may pass when explicitly allowed
- **AND** undeclared color, background, border, radius, typography, shadow, focus, or control-chrome declarations fail with selector, property, canonical-owner, exception, and source-file diagnostics

### Requirement: Shared shell geometry anchors all Cashier routes

The application SHALL use one shared shell and page-heading geometry for the six Cashier routes. The desktop reference SHALL be 244px expanded sidebar, 76px collapsed sidebar, 64px topbar, 16px top/24px horizontal/40px bottom content padding, 1120px general content maximum, 44px navigation-link minimum height, up to 300px Overview search width, and 16px major-card radius. Responsive exceptions SHALL be explicit and SHALL preserve the current mobile drawer behavior.

#### Scenario: Routes share shell alignment

- **GIVEN** a user navigates between the six Cashier routes at the desktop reference viewport
- **WHEN** each route is rendered
- **THEN** sidebar, topbar, content container, page heading, description, and action-row alignment remain stable
- **AND** only the active navigation item and page-specific content change

#### Scenario: Responsive shell preserves usable navigation

- **GIVEN** the application is rendered at tablet and 390px mobile widths
- **WHEN** the sidebar collapses or becomes the current mobile drawer
- **THEN** content remains within the viewport without horizontal overflow
- **AND** drawer entry, Escape, focus return, scroll locking, target sizes, and reduced-motion behavior remain accessible
- **AND** the legacy prototype mobile-sidebar behavior is not reintroduced

### Requirement: Overview establishes the page-composition baseline

Overview SHALL present the shared page heading and action region, welcome/supporting copy, cashier quick actions, four equal metric cards, and a Recent Transactions table using the shared width and spacing system. Metric cards SHALL rearrange responsively without changing the bounded activity semantics.

#### Scenario: Overview desktop composition

- **GIVEN** Overview has representative activity data
- **WHEN** it is rendered at the desktop reference viewport
- **THEN** the heading/actions, four equal KPI cards, section spacing, table, and View-all action match the approved prototype composition
- **AND** no route-local duplicate card appearance is introduced

#### Scenario: Overview responsive composition

- **GIVEN** Overview is rendered at tablet and mobile widths
- **WHEN** the metric grid and recent-transactions section reflow
- **THEN** cards remain readable and ordered, the table remains usable, and the page does not overflow horizontally
- **AND** loading, empty, error, keyboard, focus, and reduced-motion states remain truthful and accessible

### Requirement: Find Customer separates discovery from authoritative verification

Find Customer SHALL provide a compact search panel of approximately 712px maximum width with aligned name/phone/card input, Search, and Scan controls on desktop and a stacked arrangement on smaller widths. Discovery results SHALL remain visually distinct from authoritative verified-card state.

#### Scenario: Customer discovery search

- **GIVEN** a cashier searches by supported name or phone input
- **WHEN** matching directory results are returned
- **THEN** the page renders safe discovery results using the shared result-card presentation
- **AND** loading, empty, failed-search, offline, and stale-response states do not cause avoidable layout shifts
- **AND** discovery alone does not unlock Earn or Redeem or expose unauthorized financial data

#### Scenario: Exact card verification and handoff

- **GIVEN** a user searches for an exact card identifier
- **WHEN** authoritative card verification succeeds or returns a supported 404/error
- **THEN** the page preserves masking, tenant/branch scope, error semantics, keyboard selection, Escape/focus behavior, and the supported deep-link handoff
- **AND** only verified-card state may enable a protected financial workflow

### Requirement: Capture Purchase uses a stable guided flow panel

Capture Purchase SHALL use an approximately 860px flow-panel variant with a shared step indicator and stable outer alignment for Find customer, Confirm customer, Receipt details, Review and confirm, and success states. Layout changes SHALL NOT alter receipt, approval, offline, idempotency, money, or financial-gating behavior.

#### Scenario: Capture Purchase stage progression

- **GIVEN** a verified customer/card and valid receipt input
- **WHEN** the user advances through the four guided stages
- **THEN** the outer flow panel retains its alignment and intended dimensions while inner content changes
- **AND** Back, Continue, validation, focus, and stage semantics remain accessible

#### Scenario: Capture Purchase protected outcomes

- **GIVEN** Capture Purchase reaches confirmation or a failure condition
- **WHEN** the backend returns success, approval-required, offline, retryable, or error behavior
- **THEN** the layout renders the truthful corresponding state
- **AND** existing financial authority, integer-kobo validation, idempotency, and approval safeguards remain unchanged

### Requirement: Redeem Credit uses an intentional narrower flow variant

Redeem Credit SHALL use an approximately 720px flow-panel variant that reuses Capture Purchase lookup and workflow presentation while providing basket subtotal, redemption amount, confirmation summary, remaining balance, and result states. Credit summaries SHALL use two columns on desktop and one column on smaller viewports with accessible reading order.

#### Scenario: Redeem desktop composition

- **GIVEN** an authoritative verified card with available credit
- **WHEN** Redeem is rendered at the desktop reference viewport
- **THEN** lookup, credit summary, basket amount, redemption amount, confirmation, and remaining balance use the intended narrower flow composition
- **AND** the page does not duplicate the Capture Purchase component appearance owner

#### Scenario: Redeem responsive and protected behavior

- **GIVEN** Redeem is rendered on a smaller viewport or receives approval, insufficient-balance, offline, retryable, or error behavior
- **WHEN** the summary collapses and the workflow state changes
- **THEN** content remains readable, ordered, and within the viewport
- **AND** verified-card authority, approval, idempotency, balance, money, and financial-gating rules remain unchanged

### Requirement: Transactions provides truthful bounded list and detail composition

Transactions SHALL provide page heading/supporting copy, refresh, receipt/ID search, status and operation filters, bounded activity table, result count, and available-scope messaging. Its detail dialog SHALL be approximately 600px wide where supported, use an accessible two-column internal composition, and render only backend-supported fields.

#### Scenario: Transactions list layout

- **GIVEN** Transactions has activity, empty, loading, or error data
- **WHEN** the page is rendered at desktop, tablet, or narrow mobile width
- **THEN** filters, table rows, status indicators, result count, and scope messaging use the shared table/status system
- **AND** narrow tables may scroll within their bounded region without causing application-wide overflow

#### Scenario: Transactions detail truthfulness and focus

- **GIVEN** a user opens a supported transaction detail
- **WHEN** the dialog is displayed or dismissed
- **THEN** supported customer, receipt, amount, credit, status, and evidence/history fields are presented without fabricated values
- **AND** backdrop, close, Escape, focus trap, and focus return work accessibly

### Requirement: Sync Queue prioritizes cashier attention

Sync Queue SHALL compose a derived layout from the shared Transactions, status, and table system because it has no direct approved Figma page. The primary hierarchy SHALL emphasize waiting, syncing, needs-attention, and synced records; technical details SHALL be secondary.

#### Scenario: Sync Queue attention-oriented list

- **GIVEN** the queue contains records in multiple sync states
- **WHEN** the page is rendered
- **THEN** status filters/search and a receipt/card/amount/status/action table make cashier attention states primary
- **AND** technical record details appear in a secondary panel, dialog, or disclosure

#### Scenario: Sync Queue preserves operational truth

- **GIVEN** a queue record is retried, reconciled, pending, failed, or synced
- **WHEN** the user interacts with the record
- **THEN** storage, batching, retry, confirmation safeguards, offline semantics, and server-result interpretation remain unchanged
- **AND** empty, loading, error, keyboard/focus, responsive, and no-overflow states remain accessible

### Requirement: Visual evidence is deterministic and separately classified

The project SHALL maintain a reference mapping and deterministic Figma-to-React comparison evidence for the shell and applicable Cashier routes. Reports SHALL distinguish structure, geometry, computed style, interaction/accessibility, responsive behavior, Figma pixel difference, React snapshots, and intentional deviations. The 1% differing-pixel target SHALL apply only to valid aligned font-matched Figma references; unknown bounds or font identity SHALL block certification rather than weaken the threshold.

#### Scenario: Valid reference comparison

- **GIVEN** a mapped reference has known source bounds, font identity, stable fixture data, and a deterministic viewport
- **WHEN** the comparison runner captures the production route/state
- **THEN** it emits geometry, computed-style, and pixel-diff evidence with the configured per-surface tolerance
- **AND** a valid aligned font-matched reference must meet the 1% differing-pixel target for Figma certification
- **AND** React snapshot results are reported as a separate signal

#### Scenario: Blocked or intentionally different reference

- **GIVEN** a reference has unknown crop bounds, unresolved font identity, unsupported state, or a deliberate product deviation
- **WHEN** visual evidence is generated
- **THEN** the result is classified as blocked, derived, unsupported, or intentionally different with the source, reason, tolerance, and artifact recorded
- **AND** the runner does not silently pass it as exact Figma parity

### Requirement: Staging journeys certify runtime behavior separately from visual layout

The change SHALL provide isolated staging evidence for customer search, exact card verification, Capture Purchase, and Redeem using approved disposable fixtures and deployment lineage. Staging SHALL verify authorization, masking, branch scope, approval/offline/error behavior, financial gating, cleanup, and reconciliation without mutating production.

#### Scenario: Approved staging journey

- **GIVEN** an operator-approved disposable staging tenant/branch, accounts, cards, secrets, and deployed candidate SHA
- **WHEN** the browser journeys execute customer search, verification, Capture Purchase, and Redeem
- **THEN** the required success, authorization, masking, approval, offline/error, retry, and financial-gating assertions pass
- **AND** all disposable data is reconciled or cleaned up
- **AND** the evidence records environment, candidate frontend/backend SHAs, artifacts, and residual risks without secrets

#### Scenario: Staging prerequisite is unavailable

- **GIVEN** approved credentials, deployment lineage, or disposable fixtures are unavailable
- **WHEN** staging certification is attempted
- **THEN** the gate fails closed as an infrastructure blocker
- **AND** local screenshots or fabricated data are not reported as staging evidence

### Requirement: Final handoff proves layout-only scope and complete verification

The final change SHALL identify the candidate revision, prototype/reference lineage, affected routes and symbols, verification commands, accepted deviations, staging results or blockers, rollback path, and residual risks. GitNexus change detection SHALL confirm that implementation edits remain within the approved layout/evidence surface and do not silently alter financial or authorization processes.

#### Scenario: Successful final handoff

- **GIVEN** all applicable local, browser, visual, security, build, and staging gates have run
- **WHEN** the change is prepared for review
- **THEN** every acceptance criterion maps to passing evidence or an explicitly accepted environmental blocker
- **AND** GitNexus detect-changes output, scoped diff, candidate SHA, artifacts, and rollback instructions are included

#### Scenario: Required gate fails

- **GIVEN** a required test, visual comparison, staging reconciliation, or scope check fails
- **WHEN** final verification is performed
- **THEN** the change remains incomplete
- **AND** the failure, affected surface, residual risk, and next remediation are recorded rather than hidden or waived
