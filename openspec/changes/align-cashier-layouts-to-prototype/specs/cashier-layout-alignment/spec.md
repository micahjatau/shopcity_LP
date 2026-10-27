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

The Transactions tab SHALL reuse the Supervisor transaction table presentation and show up to the three newest rows returned by the cashier-authorized `cashier-today` endpoint filtered by the stable customer ID. It SHALL display the returned receipt number, date/time, purchase amount, and status, and SHALL map the row's authoritative `earnedAmountKobo` and `redeemedAmountKobo` movement fields. Combined settlements SHALL show both earned and redeemed effects. Pending transactions SHALL show **Awaiting approval** without presenting requested amounts as confirmed movement; current available balance SHALL NOT be substituted. The endpoint filter MUST preserve authenticated tenant, branch, and cashier scope.

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
- **AND** receipt number, date/time, purchase amount, status, and earned/redeemed credit movement are shown from the authorized response
- **AND** combined settlements show both effects, while pending requests are not presented as confirmed movement
- **AND** current available balance is never substituted for transaction movement

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

#### Scenario: Step 4 review shows current and projected wallet balances

- **GIVEN** the verified lookup or matching cashier-safe customer summary provides the customer's current wallet balance and receipt inputs produce an estimated earn credit
- **WHEN** a Cashier opens Step 4 — Review
- **THEN** `Balance before` shows that current wallet balance using integer-kobo formatting
- **AND** `Estimated new balance` equals the current wallet balance plus the estimated earn credit
- **AND** the projected balance remains advisory until backend confirmation and opening Review does not submit a financial request
- **AND** if no authoritative current balance is available, the UI does not fabricate a balance

#### Scenario: Capture Purchase protected outcomes

- **GIVEN** Capture Purchase reaches confirmation or a failure condition
- **WHEN** the backend returns success, approval-required, offline, retryable, or error behavior
- **THEN** the layout renders the truthful corresponding state
- **AND** existing financial authority, integer-kobo validation, idempotency, and approval safeguards remain unchanged

#### Scenario: Confirmed Earn result follows the supplied Figma reference

- **GIVEN** the Earn endpoint returns a confirmed 201 response
- **WHEN** the Cashier sees the result state
- **THEN** an Earn-scoped success card follows Figma nodes `413:4294` and `413:4348`
- **AND** the earned credit and resulting balance use only the backend response's `creditKobo` and `availableBalanceKobo`; advisory review estimates are never presented as confirmed values
- **AND** receipt number, purchase amount (also used as eligible amount until the API exposes a separate item-level eligible amount), capture time, and review status use the authoritative result, while the displayed cashier label comes only from the authenticated session
- **AND** the cashback rate uses the existing server-provided policy context; the TRD default is 200 basis points (2%), while configured policy overrides remain respected
- **AND** the card offers Capture another, Redeem Now, and View Customer actions without bypassing existing lookup verification or customer-profile authorization
- **AND** copying the cashier label copies only that displayed value and announces the outcome accessibly
- **AND** the final Review step is marked complete only after confirmed success; pending approval and error states do not show the completion tick
- **AND** no API payload, backend validation, financial calculation, idempotency, or approval behavior changes

#### Scenario: Pending Earn result shows an approval notice and transaction details

- **GIVEN** the Earn endpoint returns a pending-approval response
- **WHEN** the Cashier sees the result state
- **THEN** one notice follows Figma node `413:4411`, with the heading `Purchase recorded`, the status `Awaiting approval`, and the copy `A supervisor needs to review this purchase before rewards are added.`
- **AND** available verified customer and card details, receipt number, purchase amount, receipt time, submission time, and human-readable approval reason appear in a separate labeled summary
- **AND** unavailable summary details are omitted, and no pending credit or current balance is implied
- **AND** the notice does not repeat the pending status or explanatory copy
- **AND** raw response fields, internal identifiers, and unformatted API payloads are not rendered
- **AND** the existing `Capture another` action remains available
- **AND** backend approval behavior remains unchanged

#### Scenario: Capture Purchase confirmation card matches Figma node 412:2478

- **WHEN** a verified customer reaches step 2 of `/cashier/earn`
- **THEN** only the Earn confirmation stage matches Figma node `412:2478`; the shell, page title, stepper, other steps, API calls, and workflow behavior remain unchanged
- **AND** the heading reads `Step 2 — Confirm customer` in 16px bold type, followed by the read-back sentence and a 1px `#E5E5E5` divider
- **AND** the left-side customer details appear in this order: Customer, Email, Phone number, Virtual Card Number, and Wallet Balance, with compact 10px labels and 14px values
- **AND** the API-provided masked phone and cashier-safe masked email are rendered without UI normalization or unmasking, and missing optional fields read `Not provided`
- **AND** the card serial has a keyboard-accessible copy action that copies only the displayed serial and announces success or failure without changing workflow state
- **AND** wallet balance uses the verified lookup or matching cashier-safe customer summary's available balance in integer-kobo formatting
- **AND** while the existing cashier-safe customer-summary request is unresolved, only the optional email value shows an accessible reduced-motion-safe skeleton; no additional request or Proceed gate is added
- **AND** the existing customer-profile virtual-card artwork is reused alongside the details on desktop and stacked below them at narrow widths, showing the dynamic verified customer name and card serial
- **AND** card status remains visible outside the artwork, matching the customer-profile presentation; no placeholder barcode or scannable identifier is introduced
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
- **AND** the Basket subtotal stage uses the same shared branded virtual-card preview artwork as Capture Purchase, with the verified customer name and authoritative card serial
- **AND** the preview remains compact, displays card status outside the artwork, and introduces no placeholder or barcode content
- **AND** the shared preview implementation, exact-card verification, financial behavior, and redemption transitions remain unchanged

#### Scenario: Redeem responsive and protected behavior

- **GIVEN** Redeem is rendered on a smaller viewport or receives approval, insufficient-balance, offline, retryable, or error behavior
- **WHEN** the summary collapses and the workflow state changes
- **THEN** content remains readable, ordered, and within the viewport
- **AND** verified-card authority, approval, idempotency, balance, money, and financial-gating rules remain unchanged

### Requirement: Cashier verified-card lookup and progression stay concise

The shared verified-card lookup used by Capture Purchase and Redeem SHALL use the placeholder `Scan card or Search card number`; an empty submission SHALL show `Enter a customer name, phone number, or card number.`; its `Find customer` heading SHALL be 22px and bold. It SHALL NOT show an idle `Ready to continue` alert or the generic `Scan or type a card serial.` prompt. Actionable lookup results, policy notices, and errors SHALL remain visible. The Capture Purchase Search button SHALL include a search icon and use the Cashier sidebar's red-to-orange gradient. The Capture Purchase progress indicator SHALL be left aligned, no wider than 712px, and shrink to available content width on narrow screens while remaining in normal document flow. It SHALL align its right edge with the 712px content card, be 44px high, and retain a 16px inter-stage gap, 16px horizontal padding, 16px corner radius, full opacity, and no rotation. Redeem SHALL retain its existing progress-indicator geometry. Capture stage labels SHALL remain on one line; when needed, horizontal overflow SHALL stay contained within the bar. Active/completed stage changes SHALL animate through restrained transitions and honor `prefers-reduced-motion`.

#### Scenario: Empty lookup is uncluttered

- **WHEN** a Cashier opens the Find customer stage before entering a query
- **THEN** the field shows `Scan card or Search card number`
- **AND** the `Find customer` heading is 22px and bold
- **AND** no idle readiness alert or generic scan/type prompt is displayed
- **AND** an empty search prompts `Enter a customer name, phone number, or card number.`
- **AND** actionable lookup, policy, and error messages remain visible when present

#### Scenario: Progress and search action presentation

- **WHEN** a Cashier advances through Capture Purchase or Redeem stages
- **THEN** the Capture Purchase progress indicator is at most 712px wide and shrinks to available width on narrow screens
- **AND** its right edge aligns with the 712px content card
- **AND** the Capture Purchase bar is 44px high with 16px gap/padding, a 16px radius, and full opacity
- **AND** all stage labels remain on one line within the progress bar
- **AND** active/completed stages transition smoothly unless reduced motion is requested
- **AND** the Capture Purchase Search action shows a search icon on the sidebar-matched red-to-orange gradient

#### Scenario: Find Customer recent captures reflect outcome

- **WHEN** the Find customer step shows recent capture activity
- **THEN** the Recently captured heading follows the Step 1 Figma typography at 16px/700
- **AND** each captured loyalty amount uses the semantic color of its outcome: success, warning, or danger

### Requirement: Cashier primary actions use the sidebar gradient

Every primary button or link inside the Cashier shell SHALL use one shared red-to-orange gradient aligned with the Cashier sidebar palette, including shared `Button` primary variants and route-specific primary actions. Hover styling SHALL use the corresponding darker gradient. White action text SHALL retain at least 4.5:1 contrast against both gradient endpoints. Secondary and disabled-state treatments, control dimensions, focus indicators, action labels, and behavior SHALL remain intact. The gradient SHALL be scoped to the Cashier shell; Admin, Supervisor, and public surfaces SHALL retain their current appearance.

#### Scenario: Primary actions are visually uniform across Cashier routes

- **WHEN** a primary action is rendered on a Cashier route or workflow state
- **THEN** its background uses the shared Cashier red-to-orange gradient and its label is white
- **AND** hover uses the shared darker gradient
- **AND** a secondary action remains neutral
- **AND** Admin and Supervisor primary actions remain unchanged

### Requirement: Capture Purchase Step 1 matches the supplied Figma reference

The Earn-only Step 1 surface SHALL match Figma node `408:513` within the stable 712px Capture Purchase panel: a separate white search card above the Recent captures card, 16px/700 `Step 1 — Find customer` heading, 12px supporting copy, divider, 320px/32px search field with `Search` placeholder, adjacent 160px Search and Scan actions, and the reference helper copy. The primary Search action SHALL use the shared Cashier red-to-orange gradient; the secondary Scan action SHALL remain neutral. This is an intentional deviation from the reference's white red-outlined Search treatment in favor of the later shell-wide primary-action contract. The recent-captures card SHALL retain the 399px minimum height, 16px heading, compact 40px rows with 8px spacing, and semantic outcome amounts/statuses. This newer Capture-only reference overrides the shared lookup placeholder, heading, and Search-button sizing only when `captureLayout` is enabled; Lookup and Redeem SHALL retain their existing content and workflow behavior.

Recent-capture rows MUST use only cashier-authorized API data. Because the cashier activity projection does not provide customer phone numbers, the UI MUST retain the supported receipt reference instead of displaying or fabricating the phone values shown in the Figma sample. Loading, empty, and error states MUST remain truthful and visually contained. Search, scanner focus, card verification, API calls, data masking, and financial safeguards MUST remain unchanged.

#### Scenario: Earn Step 1 matches the reference without changing shared consumers

- **WHEN** a cashier opens Capture Purchase at desktop width
- **THEN** the Step 1 heading, search field, actions, helper, recent-captures card, and rows follow Figma node `408:513`
- **AND** only Capture Purchase receives the new placeholder and title scale; Search uses the shared Cashier gradient and Scan remains neutral
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
