# Change: Align Cashier layouts to the prototype

## Why

`docs/repo_review_77.md` concludes that ShopCity's frontend design-system foundation is ready for layout development. Shared tokens, component ownership, card variants, role-aware search, customer discovery, verified-card lookup, and responsive conformance are established. The remaining gap is spatial and product-facing: the six Cashier pages must look and behave like the approved prototype layouts rather than merely consuming the same CSS primitives.

This change turns the Review 77 roadmap into an implementation contract. It starts with a shared visual contract and application shell, then adapts the six page compositions in a controlled order, and finally supplies deterministic visual, responsive, and staging evidence. It must not restart the completed style-ownership or card-consolidation work.

## What changes

### 1. Freeze the shared visual contract

Document and browser-verify canonical values for page titles and descriptions, cards, form fields, primary and secondary buttons, search controls, status messages, tables, and dialogs. Each shared owner must produce the same values across all six Cashier routes. Route files may compose these primitives but may not introduce competing appearance.

### 2. Align the application shell

Make the shared shell the spatial reference for every route:

- expanded sidebar: 244px;
- collapsed sidebar: 76px;
- topbar: 64px high;
- content padding: 16px top, 24px horizontal, 40px bottom;
- general content maximum width: 1120px;
- typical navigation-link minimum height: 44px;
- overview search width: up to 300px;
- major card radius: 16px.

These are initial desktop reference values. Tablet, mobile drawer, collapsed, reduced-motion, and overflow behavior must be specified as responsive exceptions. Preserve the current React mobile drawer rather than copying obsolete prototype sidebar behavior.

### 3. Adapt the six page layouts

Sequentially align Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, and Sync Queue to their approved prototype or derived references. Reuse the shell, page heading, card, search, flow, table, status, and dialog components. Keep workflow controllers, API contracts, authorization, masking, financial rules, offline behavior, and truthful unsupported-data handling unchanged.

- **Overview:** establish page-heading/action alignment, four equal KPI cards, recent-transactions table, page width, spacing, and responsive metric-card rearrangement.
- **Find Customer:** use a compact approximately 712px search panel with aligned name/phone/card input, Search, and Scan controls; preserve loading, empty, error, discovery, and authoritative card-verification distinctions.
- **Capture Purchase:** use an approximately 860px stable flow panel containing Find customer, Confirm customer, Receipt details, and Review/confirm stages plus the success state; keep the outer geometry stable across stages.
- **Redeem Credit:** use an approximately 720px flow-panel variant with reusable lookup styling, two-column desktop credit summary, basket subtotal, redemption amount, confirmation, remaining balance, and responsive one-column behavior.
- **Transactions:** provide list/search/filter/table composition and a truthful approximately 600px detail dialog with two-column internal layout where supported; allow narrow-table scrolling without application-wide overflow.
- **Sync Queue:** compose a deliberate derived layout using Transactions, status, and table language; prioritize attention states and place technical details in a secondary panel, dialog, or disclosure.

### 4. Add visual and runtime acceptance

Implement or complete deterministic Figma-to-React comparison support in parallel with layout work. Separate structure, geometry, typography, appearance, interaction, responsive, computed-style, React snapshot, and pixel-diff signals. Use stable fonts and fixtures, reference mappings, per-surface tolerances, intentional-deviation records, and a target of 1% differing pixels only for valid aligned, font-matched references. Do not substitute the existing 8% React snapshot threshold for Figma acceptance.

Complete isolated staging journeys for customer search, exact card verification, Capture Purchase, Redeem, authorization/masking, approval/offline/error behavior, financial gating, cleanup, and reconciliation once the approved deployment lineage and disposable environment are available.

## Scope

In scope: shared visual-contract documentation and browser checks; shell geometry; six Cashier route compositions; responsive layout and overflow behavior; prototype reference mapping; deterministic visual comparison evidence; related frontend tests, fixtures, and documentation; isolated staging journey evidence; final release handoff.

Out of scope: backend financial calculations, ledger/history semantics, database schema, API/RBAC/authentication/session redesign, phone-normalization contract changes, profile/notification API or `/profile` authorization work, queue semantics, new financial endpoints, GraphQL, microservices, or importing prototype embedded styles.

Profile and notification positions may be reserved in the shell, but final interactions remain the separate approved contract tracked by GitHub issue #45. Figma source-bound/font blockers tracked by issue #46 must be resolved or explicitly recorded; thresholds must not be weakened to force a pass.

## Acceptance criteria

- A documented shared visual contract is browser-verified and changing a canonical primary-button owner changes its appearance consistently on all six Cashier pages.
- The shell geometry matches the approved desktop reference dimensions, with documented responsive exceptions and no regression to the current mobile drawer, keyboard, focus, reduced-motion, or overflow behavior.
- All six Cashier pages use the shared shell/page-heading rhythm and match their specified prototype or derived composition without route-local duplicate appearance owners.
- Overview establishes the baseline page geometry with correctly aligned heading/actions, four equal metric cards, and recent transactions.
- Find Customer supports compact desktop and stacked responsive search layouts while retaining discovery-versus-verification, loading, empty, error, masking, and authorization truthfulness.
- Capture Purchase and Redeem preserve stable shared flow-panel geometry, correct widths/variants, responsive summaries, and all existing protected workflow transitions.
- Transactions provides bounded search/filter/table layout and a truthful responsive detail dialog without invented backend fields or global overflow.
- Sync Queue prioritizes cashier attention using the shared table/status system and keeps technical record details secondary.
- Figma comparison evidence is deterministic, reference-mapped, separately reported from React snapshots, and records per-surface tolerances, font/source-bound blockers, intentional deviations, candidate SHA, and artifacts.
- Approved staging journeys pass without production mutation, and cleanup/reconciliation evidence identifies environment, fixtures, deployed lineage, residual risks, and rollback.
- Frontend ownership, lint, typecheck, unit/accessibility, conformance, visual comparison, build, Semgrep, and final GitNexus checks pass, or each unavailable gate is explicitly documented as an environmental blocker.

## Risks and mitigations

- **Page-by-page style drift:** implement shell and Overview first; require shared component reuse and ownership checks for every route.
- **Prototype geometry copied into broken mobile behavior:** preserve the current drawer and encode responsive exceptions explicitly.
- **Visual false positives:** stabilize fonts, fixtures, viewport, reference bounds, and rendering before applying the 1% pixel criterion.
- **Unsupported backend data:** render only fields supported by current contracts; do not fill prototype placeholders with fabricated receipts or audit history.
- **Financial regression:** keep controllers and backend authority unchanged; run workflow and authorization tests after each flow layout migration.
- **Staging mutation or lineage mismatch:** use disposable fixtures, secret injection outside the repository, cleanup/reconciliation, and the approved deployment gate.
