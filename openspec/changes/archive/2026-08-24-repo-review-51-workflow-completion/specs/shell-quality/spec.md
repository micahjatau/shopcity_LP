## ADDED Requirements

### Requirement: Role-aware shell uses live public configuration

The frontend SHALL render branch, timezone, and policy context from public configuration wherever that context affects user decisions.

#### Scenario: Shell shows live branch and policy context

- **GIVEN** an authenticated user opens the application shell
- **WHEN** public configuration is available
- **THEN** the shell shows the current branch identity and timezone
- **AND** any policy values relevant to the active persona are available to the workspace that needs them

#### Scenario: Missing config fails gracefully

- **GIVEN** public configuration is temporarily unavailable
- **WHEN** the shell renders
- **THEN** the user sees a non-destructive fallback state
- **AND** the app does not invent branch or policy values

### Requirement: Placeholder controls are not rendered as actionable UI

The frontend SHALL NOT present buttons, cards, or metrics as actionable unless they trigger a real workflow.

#### Scenario: No-op button is removed or disabled with explanation

- **GIVEN** a control has no implemented navigation or mutation
- **WHEN** the workspace renders
- **THEN** the control is hidden, disabled, or replaced with a truthful placeholder
- **AND** the user is not misled into expecting a working action

#### Scenario: Demo metrics are replaced with live data

- **GIVEN** an operations card previously displayed demo numbers
- **WHEN** the new workflow loads
- **THEN** the card is backed by live data or omitted until the data source exists
