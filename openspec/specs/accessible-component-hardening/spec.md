# accessible-component-hardening Specification

## Purpose

TBD - created by archiving change frontend-critical-path-hardening. Update Purpose after archive.

## Requirements

### Requirement: Shared primitives satisfy keyboard and focus behavior

The system MUST provide accessible shared primitives for the approved component surface.

#### Scenario: Dialog opens and closes

- **WHEN** a dialog is opened with the keyboard
- **THEN** focus is managed correctly and returns to the invoking control when the dialog closes

#### Scenario: Combobox is navigated

- **WHEN** a user navigates a combobox with the keyboard
- **THEN** the highlighted option and selection state are communicated with correct ARIA semantics

### Requirement: Shared components expose contrast-safe semantic states

The system MUST use semantic colors and labels so success, warning and error states remain distinct from brand styling.

#### Scenario: Status badge is rendered

- **WHEN** a status badge is shown for a workflow outcome
- **THEN** the text, icon and color communicate the semantic state without relying on brand red alone

#### Scenario: Narrow viewport is used

- **WHEN** the component is displayed on a narrow viewport
- **THEN** it remains usable and the layout preserves legibility and touch target size
