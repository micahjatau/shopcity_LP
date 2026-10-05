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
2. Find Customer extracts the reusable compact search/result composition.
3. Capture Purchase consumes that search presentation and adds the stable 860px guided flow.
4. Redeem Credit consumes the same lookup and flow primitives with the intentional 720px variant and credit-summary layout.
5. Transactions establishes the table/filter/detail-dialog composition.
6. Sync Queue derives its primary table/status/attention layout from Transactions without pretending it has an approved Figma screen.

Each route must use named variants for intentional geometry differences. Route CSS may provide layout, widths, ordering, gaps, responsive stacking, and page-specific spacing only. Appearance remains owned by canonical components and the existing property-scoped registry.

### 4. Workflow geometry does not own workflow state

`CashierWorkflowRoute`, `useCashierLookupController`, and `VerifiedCardLookupStep` remain behavior owners. Layout changes may reorganize markup only when accessible labels, focus targets, loading/error semantics, request-generation guards, exact card authority, and transitions remain equivalent. No discovered customer may unlock Earn or Redeem; only authoritative verified-card state may do so.

Capture Purchase stages remain Find customer, Confirm customer, Receipt details, Review/confirm, and success. The outer flow panel keeps its dimensions and alignment while the inner stage changes. Redeem retains its basket, redemption, confirmation, and remaining-balance semantics.

### 5. Truthful transaction detail

Transactions and Sync Queue must not render fields that the backend does not provide. A modal may use a two-column layout only for supported customer, receipt, amount, credit, status, and evidence/history fields. Unsupported receipt imagery or audit events are omitted or explicitly marked unavailable rather than fabricated.

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
