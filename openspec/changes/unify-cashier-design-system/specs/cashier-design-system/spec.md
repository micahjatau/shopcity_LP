## ADDED Requirements

### Requirement: Generated semantic tokens define operational appearance

The frontend MUST derive the operational canvas, surface, text, border, actions, typography, spacing, radii and state appearance from `docs/frontend/design-system/tokens.json` through the repository generator. It MUST preserve compatible existing token names during migration and MUST NOT hand-edit generated CSS or rely on undefined/cyclic aliases.

#### Scenario: Tokens are regenerated

- **WHEN** the token generator runs twice from the same source
- **THEN** the generated CSS is deterministic and contains valid resolvable aliases
- **AND** canonical semantic values express the approved operational design without a second page-owned theme

#### Scenario: A legacy invalid state variable is encountered

- **WHEN** Overview or lookup renders warning/success states
- **THEN** the state references a defined semantic/state token
- **AND** numeric names absent from the source, including the audited success-700 and warning-300 references, are not used

### Requirement: Shared appearance has one CSS owner

The frontend MUST centrally import modular component styles and MUST keep reusable typography, cards, controls, tables, forms, status, dialog and workflow appearance out of page-local style blocks and static inline style objects. Unique page layouts MAY use explicit layout classes or small CSS modules without redefining shared appearance.

#### Scenario: A page uses a shared button

- **WHEN** a Cashier page selects an existing button variant and size
- **THEN** its visual appearance is owned by that shared variant rather than a route-descendant override
- **AND** native type, disabled, loading, ref and event behavior is preserved

#### Scenario: A route is opened directly

- **WHEN** any of the six Cashier routes is loaded without first visiting another route
- **THEN** all required shared styles are present and do not depend on route navigation order

#### Scenario: Markup gains an unrelated sibling

- **WHEN** a status or content element is added before the workflow panel
- **THEN** panel styling remains attached to an explicit component class
- **AND** no positional first-of-type selector determines panel geometry

### Requirement: Six pages share a visual language without identical layouts

Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions and Sync Queue MUST use consistent headers, surfaces, controls, status, typography and table treatments. They MUST retain their distinct compositions, real data meanings and supported actions.

#### Scenario: Overview and queue metrics render

- **WHEN** Overview and Sync Queue display metric surfaces
- **THEN** they use shared card geometry and typography variants
- **AND** neither invents metrics, changes count definitions, nor hides pending or failed states to match another page

#### Scenario: A Cashier page is narrow

- **WHEN** a supported Cashier route renders at 360, 375 or 390 CSS pixels wide
- **THEN** headings, controls and action rows remain usable without document-level horizontal overflow
- **AND** wide data tables scroll within their own accessible overflow region

### Requirement: Financial workflow presentation remains consistent across states

Capture Purchase and Redeem Credit MUST use a single shared panel styling owner across lookup, confirmation, details, review and supported outcomes. Approved outer width and content differences MAY remain, but equivalent input/button/status variants MUST retain equivalent appearance. Presentation extraction MUST NOT change controller state transitions or remount identity in a way that loses drafts or repeats financial operations.

#### Scenario: Lookup moves through idle loading and error

- **WHEN** both financial routes display corresponding lookup states
- **THEN** panel treatment, field appearance, shared actions and status styling remain consistent
- **AND** loading disables the existing action without changing the shared control geometry

#### Scenario: Verified customer advances and returns

- **WHEN** an authoritatively verified customer advances to financial details or returns using existing back actions
- **THEN** the shared panel does not acquire duplicate card shells or empty predecessor cards
- **AND** existing draft, lookup-clear and confirmation semantics remain intact

#### Scenario: Different outcomes are returned

- **WHEN** an operation is confirmed, awaits approval, is saved locally, or fails
- **THEN** the presentation communicates that actual outcome distinctly
- **AND** saved/pending outcomes are not represented as centrally confirmed credit

### Requirement: Search and financial authority are preserved

Shared search and lookup presentation MUST preserve each caller's query behavior, scanner behavior, authorization scope, stale-response protection and authoritative verification boundary. It MUST NOT introduce directory-discovery states into a financial route merely for visual symmetry.

#### Scenario: Directory customer is selected

- **WHEN** a directory result or URL supplies customer/card context
- **THEN** that context remains discovery-only until existing authoritative card verification succeeds
- **AND** no frontend balance or role becomes financial authority

#### Scenario: Shared search field is used in Transactions

- **WHEN** the field replaces existing transaction search markup
- **THEN** matching, filters, bounded-feed copy and request behavior remain unchanged

### Requirement: Modal and shell behavior survive shared presentation migration

The frontend MUST preserve the current role-aware global search, persisted collapsible sidebar, mobile drawer, authorized navigation and session behavior. A shared modal MUST preserve keyboard entry, containment, Escape closing, accessible naming and focus restoration without replacing transaction request-race guards.

#### Scenario: User opens transaction detail by keyboard

- **WHEN** a transaction row activates its detail modal
- **THEN** focus enters the named modal, remains contained while open and returns to the trigger on close
- **AND** a stale detail response cannot replace the currently selected transaction

#### Scenario: Sidebar or role changes

- **WHEN** an authorized user collapses, expands, reloads, opens the mobile drawer or searches from the topbar
- **THEN** existing persistence, keyboard behavior and role-scoped destinations remain functional
- **AND** obsolete prototype instructions do not remove newer approved controls or reintroduce removed controls

### Requirement: Offline and financial behavior remain unchanged

The migration MUST preserve generated-client contracts, integer-kobo handling, CSRF/idempotency, backend-owned sessions/roles/policy, device association, queue persistence, retries and result mapping. It MUST NOT change backend/schema/storage contracts or enable offline redemption.

#### Scenario: Queue is reconciled

- **WHEN** offline earning records are submitted through the existing sync operation
- **THEN** original record identities and idempotency information are retained
- **AND** confirmed, awaiting-approval, rejected and retry-required outcomes remain distinguishable

#### Scenario: Confirmed local records are cleared

- **WHEN** a user requests local cleanup
- **THEN** existing explicit confirmation and confirmed-record-only eligibility are preserved
- **AND** pending local records and backend financial history are not deleted

#### Scenario: Authentication device context is missing

- **WHEN** Sync Queue has no authenticated device association
- **THEN** existing submission gating remains effective and is visibly explained

### Requirement: Shared dependency consumers retain compatibility

Changes to shared tokens, primitives or shell CSS MUST preserve functionality and accessibility of login and affected Supervisor/Admin surfaces. Intentional differences MUST use documented shared variants or scoped non-Cashier styles, not new route-owned overrides of shared controls.

#### Scenario: Shared button styling changes

- **WHEN** the shared Button implementation or its appearance changes
- **THEN** affected login, registration, approval, card, report and operational consumers are regression-tested alongside Cashier
- **AND** unauthorized actions, clipped controls and lost focus states are not accepted as Cashier-only scope exclusions
