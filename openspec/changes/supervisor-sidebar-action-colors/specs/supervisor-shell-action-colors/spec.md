# Supervisor shell action colors

## ADDED Requirements

### Requirement: Supervisor primary actions match the sidebar

Enabled primary buttons and primary links in the Supervisor shell MUST use the solid sidebar color (`--sc-color-brand-700`) with white text. Hover on enabled primary actions MUST use the darker brand color (`--sc-color-brand-800`). Selected Supervisor tabs MUST use the sidebar color with white text. The selected-state color MUST remain distinguishable from neutral inactive tabs.

Secondary and inactive tab treatments, danger actions, disabled styling, focus indicators, control dimensions, labels, and behavior MUST remain unchanged. Admin, Cashier, and public surfaces MUST retain their existing styling.

#### Scenario: Supervisor page renders a primary action

- **WHEN** a Supervisor page renders an enabled primary button or link
- **THEN** its background matches `--sc-color-brand-700` and its label is white
- **AND** its hover background matches `--sc-color-brand-800`

#### Scenario: Supervisor tabs distinguish selected state

- **WHEN** a Supervisor report, approval, or customer-profile tab is selected
- **THEN** the selected tab uses `--sc-color-brand-700` with white text
- **AND** inactive tabs remain neutral

#### Scenario: Other action states and roles are preserved

- **WHEN** a secondary, danger, disabled, or non-Supervisor action is rendered
- **THEN** its current treatment remains unchanged
