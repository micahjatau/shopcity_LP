# Design: Align Cashier layouts to the prototype

## Context and baseline

Review 77 identifies a completed design-system foundation and an unfinished layout-adaptation phase. The current branch already has centralized `shell-*` ownership, canonical card variants, property-scoped ownership checks, role-aware global search, customer discovery, shared verified-card lookup, and responsive route coverage. This change therefore modifies page composition and evidence, not the styling architecture or financial behavior.

The committed prototype HTML and reference assets are the visual source of truth. The existing React implementation is the behavioral source of truth. Where a prototype shows unsupported data or obsolete mobile behavior, the implementation must preserve current API truth, authorization, masking, session authority, offline behavior, and the current mobile drawer.

## Decisions

### 1. Contract before composition

Create a small canonical visual-contract document or machine-readable fixture covering:

- typography for page titles and supporting descriptions;
- card surface, border, radius, shadow, and spacing;
- field height, label, padding, focus, and error states;
- primary and secondary button dimensions and appearance;
- search input/icon alignment;
- semantic status colors and spacing;
- table headings, rows, dividers, hover/focus, and horizontal-scroll behavior;
- dialog backdrop, surface, close control, focus trap, and return focus.

The contract is verified through rendered computed-style assertions on real routes. It does not create a second token source and must reference the existing token/component owners.

### 2. Shell geometry is a shared layout primitive

Represent shell dimensions through the existing shell layout classes/tokens rather than per-route inline styles. Define desktop reference values as:

| Surface                        |                                Reference |
| ------------------------------ | ---------------------------------------: |
| expanded sidebar               |                                    244px |
| collapsed sidebar              |                                     76px |
| topbar                         |                                     64px |
| content padding                | 16px top / 24px horizontal / 40px bottom |
| general content max width      |                                   1120px |
| navigation link minimum height |                                     44px |
| overview search max width      |                                    300px |
| major card radius              |                                     16px |

Responsive rules must document when widths become fluid, when the sidebar becomes a drawer, how content padding contracts, and how focus/scroll locking operate. Do not import the prototype's legacy mobile-sidebar implementation.

The shell contract includes the same page-heading block on every route. Navigation changes only the active item and page-specific content; heading alignment and vertical rhythm remain stable.

### 3. Sequential route composition

Implement routes in dependency order:

1. Overview establishes page width, heading/action row, metric-card grid, table, and responsive spacing.
2. Find Customer presents one full-content-width card with the Recent customers heading above the search field, live status, and results table. The search and result sections remain semantically separate but do not render as separate cards; this treatment is scoped to `/cashier/lookup` so shared workflow consumers retain their existing presentation. The field retains its placeholder and matches the Cashier Overview search appearance; Search and Scan actions match Overview sizing and keep icons and labels on one line. Remove static guidance and the idle prompt. Load up to ten latest customer records initially; display name, masked phone, card status, available balance, and profile action, but do not expose customer ID as a table column. Match Overview table-header styling and span the full Cashier content width. Use semantic color states for card status and balance: active/positive green, pending amber, inactive/negative red, and zero/unavailable neutral. Debounced name/phone search replaces initial rows with matches and sends international and normalized local phone input through the existing cashier-authorized directory query. Profile navigation continues to use `/cashier/customers?id=...`; its ID remains internal for routing. The Cashier profile provides Capture Purchase and Redeem Credit actions through existing exact-card-verification workflows.
3. The Cashier customer profile uses the Supervisor profile's shared page hierarchy, responsive layout, summary-card geometry, and four-tab navigation without Consent or Redemptions because Wallet Ledger captures both earn and redemption entries. Its Cashier summary cards are Available balance, Last purchase amount, Total monthly Earn, and Last amount redeemed. Total monthly Earn is the authoritative sum of confirmed EARN/CREDIT ledger entries for the branch-local calendar month. It loads the cashier-safe `GET /customers/:id` summary, the existing cashier-authorized `GET /reports/cashier-today?customerId=...&limit=3` projection, and the existing branch-scoped customer ledger read. It verifies the returned `customerId` against the requested ID and renders the API's `maskedPhone`, masked email, birthday-month field, and card number only. Cashier Customer details omit unsupported Registered, Transactions, and Redemptions rows while Supervisor details retain their existing presentation. The Overview Recent activity card maps the cashier-authorized activity rows into earned/redeemed entries. The Transactions tab reuses the Supervisor table presentation with only the three newest displayed rows, while the request may return up to ten rows so the latest purchase and redemption metrics can be calculated reliably, mapping receipt number, date/time, purchase amount, and one outcome badge from the returned status. It does not request the Supervisor/Admin-only profile projection. Wallet Ledger remains the single cashier-safe source for both earn and redemption entries, and the Cashier Overview omits the separate credit-expiry card. Fields not available in the cashier summary or cashier-today response (including consent and expiry details) remain explicitly unavailable/not provided rather than fabricated. The Virtual Card tab uses the Supervisor card image treatment, renders the verified cashier card number on the image when supplied, and shows only card status outside the image. Keep the profile read-only: omit Edit details, customer-status changes, and card-management actions. Capture Purchase and Redeem Credit remain available and enter the existing exact-card verification flow.
4. Capture Purchase consumes that search presentation and adds the stable 860px guided flow. The Earn Step 2 confirmation card follows Figma node `412:2478`: a 16px/700 title, read-back sentence and divider, ordered cashier-safe customer details, and a compact light virtual-card preview with dynamic identity and decorative-only barcode. The card serial has an accessible copy action. Use only verified cashier-safe identity, masked email/phone, and available wallet balance in integer kobo; missing optional fields remain `Not provided`, while unavailable Available balance/Expiring credit rows are omitted. Details and artwork sit side-by-side on desktop and stack below 900px. Styling and copy remain Earn-Step-2 scoped; Redeem and all other steps retain their presentation, API behavior, and transitions.
5. Redeem Credit consumes the same lookup and flow primitives with the intentional 720px variant and credit-summary layout.
6. Transactions establishes the table/filter/detail-dialog composition.
7. Sync Queue derives its primary table/status/attention layout from Transactions without pretending it has an approved Figma screen.

Each route must use named variants for intentional geometry differences. Route CSS may provide layout, widths, ordering, gaps, responsive stacking, and page-specific spacing only. Appearance remains owned by canonical components and the existing property-scoped registry.

### 4. Workflow geometry does not own workflow state

`CashierWorkflowRoute`, `useCashierLookupController`, and `VerifiedCardLookupStep` remain behavior owners. Layout changes may reorganize markup only when accessible labels, focus targets, loading/error semantics, request-generation guards, exact card authority, and transitions remain equivalent. No discovered customer may unlock Earn or Redeem; only authoritative verified-card state may do so.

Capture Purchase stages remain Find customer, Confirm customer, Receipt details, Review/confirm, and success. The outer flow panel keeps its dimensions and alignment while the inner stage changes. Redeem retains its basket, redemption, confirmation, and remaining-balance semantics.

The newer Figma node `408:513` supersedes the shared placeholder, 22px heading, and gradient Search action for Earn Step 1 only: use the 16px `Step 1 — Find customer` heading, the reference search placeholder and helper, a white red-outlined Search action beside the neutral Scan action, and the 16px/700 Recent captures heading. Preserve the existing API-backed receipt details rather than adding phone values absent from the cashier activity projection. Lookup and Redeem keep their existing shared presentation.

### 5. Truthful transaction detail

Transactions and Sync Queue must not render fields that the backend does not provide. A modal may use a two-column layout only for supported customer, receipt, amount, credit, status, and evidence/history fields. Unsupported receipt imagery or audit events are omitted or explicitly marked unavailable rather than fabricated.

The Cashier Overview recent-transactions table follows the supplied six-column reference: Customer, Receipt No., Amount, Credit, Status, and Date. Its visual treatment follows the Supervisor Overview's restrained neutral typography, red primary action/value accents, 16px white card surfaces, compact spacing, and responsive metric/table rhythm. The search field matches the Supervisor customers-table field's rounded pale-gray surface, Search icon, and red focus treatment, while retaining the cashier's live local filtering. Cashier-specific content and scoped data remain unchanged. Extend the existing `cashier-today` response additively with the receipt's customer full name and purchase amount (integer kobo), selecting the name from the tenant-scoped Customer relation. Keep the existing authenticated-cashier, tenant, branch, and business-day filters unchanged; do not add endpoints or broaden accessible rows. Preserve the distinction between purchase amount and loyalty credit, and render missing values explicitly rather than deriving or inventing them.

### 6. Separate visual evidence

Reference manifest entries identify route, state, viewport, asset, source bounds, category, and blocker. The comparison runner must fail closed when a reference has unknown bounds or font identity unless the result is classified as non-certifying evidence. Reports must separate:

- structure and landmark presence;
- geometry and bounding boxes;
- computed style/property equivalence;
- interaction and accessibility behavior;
- responsive behavior at 1024px and 390px;
- Figma pixel difference;
- React snapshot difference;
- intentional deviations and unsupported states.

The 1% differing-pixel target applies only to aligned, valid, font-matched Figma references. React snapshot thresholds remain independent.

### 7. Staging is a release gate, not a local substitute

Staging browser tests use an operator-approved disposable tenant/branch, role accounts, cards, and secret configuration. They cover customer name/phone search, exact card verification, Capture Purchase, Redeem, authorization/masking, approval/offline/error behavior, financial gating, cleanup, and reconciliation. The evidence records the candidate SHA, deployed backend/frontend lineage, environment, fixture IDs (not secrets), reports, screenshots, cleanup result, and residual risks. Missing credentials or lineage fails closed as infrastructure-blocked; it is not bypassed with fabricated evidence.

## Evidence model

Create or extend evidence documents to record:

- baseline branch and candidate SHA;
- prototype HTML and asset/reference SHA;
- shell measurements and responsive exceptions;
- route/state/viewport matrix;
- visual contract computed-style results;
- Figma comparison results and tolerance/deviation registry;
- browser accessibility/conformance results;
- staging environment and cleanup/reconciliation results;
- final verification commands and failures;
- rollback and residual-risk decisions.

## Rollback

Each route composition should be independently revertible behind the existing route implementation boundary. If a layout change causes workflow, accessibility, or authorization regression, revert the route composition while retaining shared contract documentation and non-breaking evidence tooling. If visual evidence is unstable, block certification and retain the previous accepted reference rather than relaxing thresholds. If staging reconciliation fails, stop promotion, preserve logs, and restore the prior deployed candidate.
