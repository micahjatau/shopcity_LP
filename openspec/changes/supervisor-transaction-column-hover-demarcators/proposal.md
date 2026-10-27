## Why

The vertical resize demarcators in the Supervisor transactions table remain visible when the table is idle, adding visual noise to the data rows. Reveal them on column hover while preserving keyboard-focus visibility and the existing resize affordance.

## What Changes

- Hide desktop transaction-column divider indicators at rest.
- Reveal the relevant indicator when its resizable heading or handle is hovered, focused, or active.
- Preserve pointer/keyboard resizing and the existing narrow-screen layout.

## Capabilities

### New Capabilities

- `supervisor-transaction-column-hover-demarcators`: Visibility and accessibility behavior for Supervisor transaction-table column dividers.

### Modified Capabilities

None.

## Impact

- `apps/web/styles/supervisor-routes.css`.
- Focused Playwright coverage for the Supervisor transactions page and existing resize tests.
- No API, database, financial, or decision behavior changes.
