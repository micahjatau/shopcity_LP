## Purpose

Provide a consistent, readable Admin page frame and plain-language interface for Operations and Policies while preserving existing navigation, policy controls, and access behavior.

## ADDED Requirements

### Requirement: Operations and Policies share the Admin page frame

The Operations and Policies pages MUST use the same centered content frame as established Admin workspaces, up to 1120px wide on desktop and fluid within the available viewport on smaller screens. Both pages MUST use the same page-title and supporting-text typography, spacing hierarchy, neutral surfaces, and form-control styling. Neither page may create horizontal page overflow at supported narrow widths.

#### Scenario: Admin views either page on desktop

- **WHEN** an Admin opens Operations or Policies on a wide viewport
- **THEN** the page content is centered and no wider than 1120px
- **AND** the page title and supporting copy use the same visual type scale on both pages
- **AND** panels and controls follow the established Admin surface and control styling

#### Scenario: Admin views either page on a narrow viewport

- **WHEN** an Admin opens Operations or Policies on a narrow viewport
- **THEN** the content uses the available width without exceeding the viewport
- **AND** form fields and tab controls remain readable and operable
- **AND** the document has no horizontal overflow

### Requirement: Operations tab navigation has no visible scrollbar

The Operations tab selector MUST NOT display a horizontal scrollbar. If the tabs do not fit, all tabs MUST remain reachable through the existing keyboard tab navigation and touch scrolling. The selected tab, tab-panel relationships, and role-authorized destinations MUST remain unchanged.

#### Scenario: Operations tabs fit or overflow

- **WHEN** an Admin views the Operations tabs at desktop or narrow widths
- **THEN** no horizontal scrollbar track is visible beneath the tabs
- **AND** each tab remains available by its accessible name
- **AND** keyboard navigation can reach and select every tab
- **AND** touch users can reach tabs that overflow the available width

### Requirement: Operations and Policies copy uses plain language

Operations and Policies MUST use short, clear, sentence-case copy without unnecessary implementation or backend terminology. Labels MUST retain the meaning and units of their existing values. The pages MUST continue to disclose material policy-save behavior and status, including that changes are recorded and that a policy changed elsewhere must be reloaded before saving. The copy update MUST NOT change policy values, validation, branch scope, authorization, or save behavior.

#### Scenario: Admin reads the Operations workspace

- **WHEN** the Operations page or its Controls tab is displayed
- **THEN** its page description reads “Check system health, view reports, and manage key settings.”
- **AND** controls explain their destination in concise, user-facing language
- **AND** health summaries and trends use familiar labels such as “Pending events,” “SMS delivery,” “Sync issues,” “Overdue events,” “Open fraud alerts,” and “Reports to refresh” instead of internal terms
- **AND** trend history describes recorded hours and missing updates in plain language
- **AND** the page does not use verbose prototype or internal-system copy

#### Scenario: Admin edits a branch policy

- **WHEN** the Policies page is displayed
- **THEN** its heading reads “Policies”
- **AND** its description reads “Set purchase and redemption rules for each branch.”
- **AND** explanatory and status copy is concise and understandable without backend terminology
- **AND** field labels preserve their current business meaning and units
- **AND** loading, error, save, and version-conflict states remain clear and truthful
