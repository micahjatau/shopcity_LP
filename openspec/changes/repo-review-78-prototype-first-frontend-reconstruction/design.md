# Design: Prototype-first frontend reconstruction

## Context

Review 78 identifies a mismatch between the intended prototype-first product direction and the current implementation: CSS is increasingly centralized, but page-level React composition remains legacy. The approved prototype HTML and mapped Figma exports are the source of truth for visible structure; production controllers and backend contracts remain the source of truth for behavior, authority, and financial validity.

The repository has pre-existing dirty changes. This change must not reset, overwrite, or absorb unrelated work. Prototype references must be frozen by commit, route, state, viewport, and screenshot before visual implementation begins.

## Goals

- Convert approved prototype structure to React JSX with minimal hierarchy drift.
- Keep workflow controllers, API clients, route guards, RBAC, masking, idempotency, offline behavior, and financial safeguards authoritative.
- Establish a shared shell and page-heading rhythm before reconstructing dependent routes.
- Make visual acceptance an aligned prototype-to-React comparison, not merely a passing React snapshot.
- Record intentional deviations where production accessibility, security, or truthful data requires a change.

## Non-goals

- No backend or database changes.
- No redesign of financial workflows, authorization, authentication, queue semantics, or generated API contracts.
- No broad CSS-centralization exercise or replacement of every reusable component.
- No screenshot updates used to conceal a structural mismatch.

## Architecture and ownership

| Concern                                                | Owner                                                    |
| ------------------------------------------------------ | -------------------------------------------------------- |
| Visible screen structure and reference content         | Committed HTML prototypes and mapped Figma exports       |
| React element hierarchy and page composition           | Route/presentation components                            |
| Colors, type, borders, controls, and shared appearance | Centralized design-system CSS and shared primitives      |
| Visible workflow stage                                 | Existing workflow controller/state machine               |
| Customer/card discovery                                | Existing lookup and verification controllers             |
| Financial validity and persistence                     | Backend services and API contracts                       |
| Responsive geometry                                    | Shared layout and route-composition CSS                  |
| Visual acceptance                                      | Prototype comparison evidence with documented deviations |

Generic primitives may be reused only when their DOM hierarchy does not force a different prototype composition. When a prototype requires page-specific grouping, retain a page-specific presentation wrapper and reuse behavior below it.

## Slice design

### 0. Reference baseline

Record candidate Git SHA, deployed frontend SHA, route, exact state, browser viewport, prototype commit/reference, browser screenshot, prototype screenshot, environment, and known differences. The approved prototype reference is commit `410ecd75` unless repository evidence identifies a newer approved source.

### 1. Shared navbar

Use the prototype operational topbar geometry as the baseline. Keep one shared `AppTopbar` across operational routes. Remove the session-ready, user-email/role, and device-pending diagnostic paragraphs from rendered presentation. Restructure `GlobalShellSearch` so the role-aware category pill is a sibling beside the search input rather than a block rendered below it. Preserve sidebar, mobile drawer, route guards, and existing search behavior. Notification and avatar controls may be presentation-ready while their completion remains bounded by the approved issue #45 functionality.

### 2. Overview

Translate `apps/web/public/prototype/overview-dashboard.html` and `Landing-2.png` into the route's visible structure: page heading, greeting, quick-action region, four activity metrics, recent-transactions table, and footer/spacing. Bind existing bounded activity data and authorized quick actions without changing their contracts.

### 3. Find Customer

Translate the prototype heading, centered search panel, search/scan actions, recent customers/results, and customer selection regions. Reuse existing customer discovery and card-verification controllers. Preserve name/phone/card scope, masking, stale-response handling, keyboard behavior, and error contracts.

### 4. Capture Purchase and Redeem Credit

Replace legacy layout wrappers where they prevent prototype fidelity, but keep workflow state and handlers. Both routes use a persistent flow panel, prototype-derived stage headings, status placement, lookup/form controls, review summary, and result composition. Capture Purchase follows its committed four-step prototype with its intentional panel width; Redeem follows its distinct width and financial content. Unsupported or unsafe prototype fields are replaced with truthful approved alternatives.

### 5. Transactions and Sync Queue

Translate Transactions into heading → filters → table → footer and a prototype-derived two-column detail dialog. Preserve bounded history and truthful empty fields. Build Sync Queue from completed shared toolbar, table, status-badge, button, metric/status, and detail-dialog components; document it as a derived composition because it has no full-page Figma reference.

### 6. Register Customer reference reconciliation

Treat the remaining Register Customer mismatch as an evidence question before changing presentation code. Compare the retained `1440x3140` reference and current `1440x3244` production capture at the same route, role, state, browser, and viewport. If the additional current content is required for accessibility, truthful production behavior, or authorization, update the approved reference with explicit provenance and an approved deviation, following the Capture/Redeem decision. If the current DOM is not contractually justified, create a separately reviewed presentation change; do not hide content or alter registration/RBAC behavior solely to satisfy a screenshot.

## Evidence and acceptance

For every route/state/viewport row, collect:

- prototype reference and React screenshot at the same viewport;
- DOM landmark and element-order check;
- computed-style or geometry evidence for important regions;
- loading, empty, error, success, disabled, focus, keyboard, responsive, and reduced-motion checks as applicable;
- functional evidence for the existing controller interaction;
- intentional deviation entry with rationale and owner.

React snapshots remain a separate regression signal. They must not replace prototype comparisons.

## Risks and mitigations

- **Legacy JSX blocks fidelity:** replace presentation wrappers while retaining controller hooks and handlers.
- **Visual work regresses authority:** keep route guards, masking, API contracts, and backend behavior out of the presentation rewrite; run focused functional tests.
- **Prototype contains obsolete behavior:** copy structure and appearance, not unsafe/fake navigation, placeholder data, or unauthorized registration behavior.
- **Dirty tree contaminates evidence:** record baseline SHA/status and maintain an excluded-file list.
- **Navbar functionality is incomplete:** mark notification/profile as pending until the approved issue #45 contract is implemented; do not overclaim completion.

## Rollback

Each slice is independently revertible at the presentation/evidence layer. Roll back the affected route component and comparison fixtures without changing backend contracts, database state, or financial history. Do not revert unrelated pre-existing working-tree changes.
