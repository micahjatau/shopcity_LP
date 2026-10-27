## ADDED Requirements

### Requirement: Static conformance prevents presentation drift

The repository MUST provide executable checks for token alias validity, deterministic token output and migrated Cashier style ownership. Checks MUST reject undefined shared token references, cycles, static visual inline objects, embedded shared-style blocks, page-specific shared-control overrides and structural panel selectors within the declared migration scope. Any necessary exception MUST be narrow, documented and tested.

#### Scenario: An invalid alias or variable is introduced

- **WHEN** a token aliases a missing token, participates in a cycle or a migrated style references an undefined ShopCity variable
- **THEN** the conformance check fails with a useful source location or token path

#### Scenario: A page restyles a shared button

- **WHEN** a migrated page adds a selector that changes shared button appearance or embeds an equivalent static inline rule
- **THEN** the ownership check fails instead of allowing screenshots alone to approve the change

### Requirement: Equivalent controls are compared on real routes

The conformance suite MUST compare computed appearance of equivalent shared controls on real Cashier routes, grouped by component, variant, size, state and viewport. It MUST verify expected canonical values as well as cross-route equality so consistently incorrect controls cannot pass. It MUST NOT invent product controls solely to populate the test matrix.

#### Scenario: Standard primary actions render across six pages

- **WHEN** the suite reaches an existing standard primary action on each applicable route, including actions reached through a workflow state
- **THEN** font, line height, control height, border, radius, background, text color, padding and focus treatment match the canonical variant
- **AND** missing route/variant combinations are explicitly marked not applicable with rationale and primitive-fixture coverage

#### Scenario: Lookup is pending or focused

- **WHEN** a shared lookup control is focused or enters its supported loading/disabled state on Earn and Redeem
- **THEN** the same state uses equivalent computed style and preserves its expected dimensions
- **AND** comparison waits for controlled animation/font readiness rather than using arbitrary sleeps

### Requirement: Workflow state and responsive evidence are explicit

The suite MUST maintain a route/state/viewport matrix with deterministic fixtures covering the six pages and paired financial lookup/control states. It MUST include desktop 1440×923, tablet 768×1024, mobile 360×800, 375×812 and 390×844, plus existing shell breakpoint checks. Supported workflow states MUST include idle, loading, error, verified/confirmation, details, review and supported outcomes; discovery MUST be tested on routes that actually support it.

#### Scenario: A required state cannot be reached

- **WHEN** a declared screenshot or conformance state cannot be reached through supported controller behavior
- **THEN** the test or evidence is marked blocked or not applicable with an explanation
- **AND** no invented financial transition is added to satisfy the screenshot matrix

#### Scenario: Narrow viewport and keyboard are used

- **WHEN** each route is exercised on supported mobile widths
- **THEN** controls remain operable, focus visible, dialogs reachable and table overflow contained
- **AND** compact controls have an accessible target or approved accessible alternative

### Requirement: Visual references have explicit provenance

Visual acceptance MUST use committed approved references or an explicitly reviewed derived reference for surfaces without an original design asset. It MUST record route, state, viewport, source reference revision, font/browser environment and approved deviations. It MUST preserve older unrelated reference entries rather than silently repointing them.

#### Scenario: Sync Queue has no reference asset

- **WHEN** a Sync Queue visual baseline is introduced
- **THEN** it is marked as derived from approved shared operational components and reviewed as such
- **AND** it is not represented as a pre-existing Figma screenshot

#### Scenario: A screenshot baseline changes

- **WHEN** an implementation changes approved screenshots
- **THEN** a reviewer inspects diffs against reference and intent before accepting them
- **AND** failed visual assertions are not resolved by blanket snapshot regeneration or increased thresholds

### Requirement: Conformance includes behavior accessibility and final revision evidence

The change MUST be accepted only when applicable static, unit, accessibility, type/lint/build, functional browser, computed-style and visual gates pass on the final candidate revision. Evidence MUST distinguish planned commands from executed results and preserve failures. CSS consolidation MUST NOT be certified by a screenshot-only or source-only check.

#### Scenario: Functional behavior regresses despite matching visuals

- **WHEN** tests reveal broken lookup authority, changed financial requests, lost drafts, duplicate submission, modal focus regression or offline reconciliation failure
- **THEN** acceptance fails regardless of screenshot similarity

#### Scenario: Certification evidence is collected

- **WHEN** the implementation is declared complete
- **THEN** evidence records the final SHA, relevant working-tree state, commands and exit statuses, environment, references, approved deviations and reviewed artifacts
- **AND** any material change after certification triggers reruns of affected gates

#### Scenario: A required gate is unavailable

- **WHEN** a required runner, browser, fixture or reference approval is unavailable
- **THEN** that gate is marked blocked and completion is not claimed
- **AND** irrelevant production/Supabase operations are not run merely to fill a checklist
