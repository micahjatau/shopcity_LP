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

Find Customer SHALL provide one full-content-width card with the Recent customers heading and listing description above the search field, followed by live status and customer results. The search field SHALL retain the `Search customers, phone, or card…` placeholder and match the Cashier Overview search surface. Search and Scan actions SHALL match Overview button sizing, with each icon and label on one line. Static search guidance and the generic idle prompt SHALL be omitted. The results table SHALL span the full Cashier content width and match the Overview table-header styling. On initial load, it SHALL show up to ten latest customer records with name, masked phone, card status, available balance, and a profile action; customer ID SHALL NOT appear as a table column, but MAY remain available internally for profile routing. Card status SHALL use semantic colors (active green, pending amber, inactive red, unknown neutral). Balance SHALL use green for positive, red for negative, and neutral for zero or unavailable values. After a search of at least two characters, debounced customer matches SHALL replace those rows. Customer searches SHALL accept international and local phone-number formats against stored E.164 numbers. Discovery results SHALL remain visually distinct from authoritative verified-card state, and no data shown to a Cashier SHALL include an unmasked phone number.

#### Scenario: Recent customer directory and profile navigation

- **WHEN** a Cashier opens Find Customer without a search term
- **THEN** the route loads at most ten latest customer records into the result table
- **AND** the table shows customer name, masked phone, card status, and available balance in separate columns, without a customer ID column
- **AND** each row with a customer ID has an action that opens `/cashier/customers?id=...`

#### Scenario: Debounced customer and phone search

- **WHEN** a Cashier enters at least two characters of a customer name or phone number
- **THEN** the customer table updates to the matches from the cashier-authorized directory endpoint
- **AND** local phone input is normalized to match the stored E.164 number
- **AND** search results keep the phone masked and expose a profile action

#### Scenario: Cashier profile workflow actions

- **WHEN** a Cashier opens a customer profile from Find Customer
- **THEN** the profile route remains authorized within the Cashier shell without adding a separate sidebar item
- **AND** the profile offers Capture Purchase and Redeem Credit actions
- **AND** either action continues through the existing active-card verification and financial workflow controls

### Requirement: Cashier customer profile mirrors the Supervisor presentation safely

The Cashier customer profile at `/cashier/customers?id=...` SHALL mirror the Supervisor profile's page hierarchy, responsive layout, summary-card geometry, and Overview, Transactions, Wallet Ledger, and Virtual Card tabs, but SHALL omit the Consent and Redemptions tabs because Wallet Ledger contains both earn and redemption entries. It SHALL remain read-only and use only the existing cashier-authorized customer-detail and customer-ledger APIs. The detail response's `customerId` MUST equal the requested stable ID before profile values render. The profile MUST display only the API's masked phone, masked email, birthday-month field, and cashier-safe card number, and MUST NOT call the Supervisor/Admin-only profile-projection endpoint. The Customer details section MUST omit unsupported Registered, Transactions, and Redemptions rows. It MUST omit Edit details, customer-status changes, and card-management actions. Capture Purchase and Redeem Credit MAY remain visible, but MUST continue through exact active-card verification before any financial workflow.

The Transactions tab SHALL reuse the Supervisor transaction table presentation and show up to the three newest rows returned by the cashier-authorized `cashier-today` endpoint filtered by the stable customer ID. It SHALL display the returned receipt number, date/time, purchase amount, and status; unsupported receipt credit remains explicitly not provided. The endpoint filter MUST preserve authenticated tenant, branch, and cashier scope.

The Cashier summary cards SHALL be labelled Available balance, Last purchase amount, Total monthly Earn, and Last amount redeemed. Total monthly Earn MUST be the sum of confirmed EARN/CREDIT ledger entries for the verified customer in the branch-local calendar month; it MUST be explicitly unavailable when the authoritative value cannot be returned. Last purchase and redeemed amounts MAY use the latest returned cashier activity rows. Profile fields unavailable from the cashier-safe customer summary or cashier-today response—including pending approvals, lifetime earned, annual purchases, transaction history beyond the returned three rows, card identifier, consent, and expiry details—MUST be shown as explicitly unavailable/not provided, not fabricated or inferred. The Cashier profile MUST NOT widen API authorization or expose an unmasked phone number.

#### Scenario: Cashier opens a safe profile presentation

- **GIVEN** a Cashier opens a profile using a stable customer ID
- **WHEN** `GET /api/v1/customers/{id}` returns a cashier-safe summary with a matching `customerId`
- **THEN** the page renders the Supervisor-aligned profile layout and tabs using only returned cashier-safe fields
- **AND** the phone remains masked and unsupported profile fields remain truthfully unavailable
- **AND** the Supervisor/Admin-only profile-projection API is not requested
- **AND** the Transactions tab requests at most three customer-scoped cashier activity rows

#### Scenario: Cashier profile response is mismatched or unavailable

- **GIVEN** the requested customer detail fails or returns a different `customerId`
- **WHEN** the profile is rendered
- **THEN** no customer values or actions from another record are exposed
- **AND** the page shows a truthful retryable error state

#### Scenario: Cashier profile shows recent transactions

- **WHEN** a Cashier opens the Transactions tab for a verified customer
- **THEN** the profile renders the Supervisor transaction table with the newest returned customer-scoped cashier activity rows
- **AND** no more than three rows are requested or displayed
- **AND** receipt number, date/time, purchase amount, and status are shown from the authorized response
- **AND** unavailable credit values remain explicitly not provided

#### Scenario: Cashier virtual card stays concise

- **WHEN** a Cashier opens the Virtual Card tab
- **THEN** the Supervisor card image treatment is shown with the verified customer context when available
- **AND** the verified cashier card number is rendered on the card image when supplied
- **AND** only card status is shown outside the image
- **AND** card identifier labels, issue details, and explanatory unavailable-copy are omitted

#### Scenario: Cashier profile remains read-only

- **WHEN** a Cashier views the customer profile
- **THEN** Edit details, customer status controls, and card-management controls are absent
- **AND** Capture Purchase and Redeem Credit continue through the existing exact active-card verification workflow

#### Scenario: Overview-aligned lookup presentation

- **WHEN** a Cashier opens the Find Customer route
- **THEN** the Recent customers heading appears before the search field
- **AND** the placeholder remains `Search customers, phone, or card…`
- **AND** Search and Scan icons and labels appear on one line in Overview-sized buttons
- **AND** no static search instructions or generic idle prompt are displayed
- **AND** the full-width table header matches the Cashier Overview table header and omits customer ID
- **AND** card-status and balance values use semantic, accessible color distinctions

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
- **AND** the Step 2 heading and customer-confirmation content follow Figma node `412:2478` without changing the shared stepper or other stages
- **AND** unavailable `Available balance` and `Expiring credit` placeholders are omitted
- **AND** the Earn confirmation stage uses the compact light ShopCity card preview with dynamic verified customer/card identity; the customer profile retains its own artwork
- **AND** Back is an outlined text pill with an accessible `Back` name

#### Scenario: Capture Purchase protected outcomes

- **GIVEN** Capture Purchase reaches confirmation or a failure condition
- **WHEN** the backend returns success, approval-required, offline, retryable, or error behavior
- **THEN** the layout renders the truthful corresponding state
- **AND** existing financial authority, integer-kobo validation, idempotency, and approval safeguards remain unchanged

#### Scenario: Capture Purchase confirmation card matches Figma node 412:2478

- **WHEN** a verified customer reaches step 2 of `/cashier/earn`
- **THEN** only the Earn confirmation stage matches Figma node `412:2478`; the shell, page title, stepper, other steps, API calls, and workflow behavior remain unchanged
- **AND** the heading reads `Step 2 — Confirm customer` in 16px bold type, followed by the read-back sentence and a 1px `#E5E5E5` divider
- **AND** the left-side customer details appear in this order: Customer, Email, Phone number, Virtual Card Number, and Wallet Balance, with compact 10px labels and 14px values
- **AND** the API-provided masked phone and cashier-safe masked email are rendered without UI normalization or unmasking, and missing optional fields read `Not provided`
- **AND** the card serial has a keyboard-accessible copy action that copies only the displayed serial and announces success or failure without changing workflow state
- **AND** wallet balance uses the verified lookup or matching cashier-safe customer summary's available balance in integer-kobo formatting
- **AND** while the existing cashier-safe customer-summary request is unresolved, only the optional email value shows an accessible reduced-motion-safe skeleton; no additional request or Proceed gate is added
- **AND** a compact light ShopCity virtual-card preview sits alongside the details on desktop and stacks below them at narrow widths, showing the dynamic customer name, card serial, and status
- **AND** the preview's barcode is decorative only and is not treated as customer data or a scannable/authoritative identifier
- **AND** Back and Proceed remain approximately 160px by 32px, retain accessible names and visible keyboard focus, and preserve the existing transitions
- **AND** the layout has no horizontal overflow at 1366, 1280, 1440, 1920, 768, and 390px viewports
- **AND** non-active-card and customer-eligibility behavior stays on the existing lookup/server paths; no new Proceed-blocking rule, retry, or submission state is introduced

#### Scenario: Earn bad-request responses are actionable

- **WHEN** the earn endpoint returns a 400 response with a documented error code
- **THEN** the cashier sees actionable guidance for receipt validation, required session device, or inactive device
- **AND** unknown 400 error codes are surfaced for support instead of showing only the HTTP status
- **AND** server-rejected requests are not silently retried or queued as offline earns

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

### Requirement: Capture Purchase Step 1 matches the supplied Figma reference

The Earn-only Step 1 surface SHALL match Figma node `408:513` within the stable 712px Capture Purchase panel: a separate white search card above the Recent captures card, 16px/700 `Step 1 — Find customer` heading, 12px supporting copy, divider, 320px/32px search field with `Search` placeholder, adjacent 160px Search and Scan actions, and the reference helper copy. The recent-captures card SHALL retain the 399px minimum height, 16px heading, compact 40px rows with 8px spacing, and semantic outcome amounts/statuses. This newer Capture-only reference overrides the shared lookup placeholder, heading, and Search-button styling only when `captureLayout` is enabled; Lookup and Redeem SHALL retain their current presentations.

Recent-capture rows MUST use only cashier-authorized API data. Because the cashier activity projection does not provide customer phone numbers, the UI MUST retain the supported receipt reference instead of displaying or fabricating the phone values shown in the Figma sample. Loading, empty, and error states MUST remain truthful and visually contained. Search, scanner focus, card verification, API calls, data masking, and financial safeguards MUST remain unchanged.

#### Scenario: Earn Step 1 matches the reference without changing shared consumers

- **WHEN** a cashier opens Capture Purchase at desktop width
- **THEN** the Step 1 heading, search field, actions, helper, recent-captures card, and rows follow Figma node `408:513`
- **AND** only Capture Purchase receives the new placeholder, title scale, and outlined Search/neutral Scan control treatment
- **AND** Lookup and Redeem retain their existing shared verified-card lookup presentation
- **AND** no unmasked or unsupported customer phone data is rendered
- **AND** the recent-captures panel remains API-backed in loading, empty, error, and populated states

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
