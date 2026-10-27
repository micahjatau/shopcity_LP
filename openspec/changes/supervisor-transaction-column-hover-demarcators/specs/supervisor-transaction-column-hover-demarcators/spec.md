## Purpose

Keep the Supervisor transaction table visually quiet at rest while making column resizing discoverable on pointer hover and keyboard focus.

## ADDED Requirements

### Requirement: Supervisor transaction column dividers appear on demand

On desktop, the Supervisor transaction table SHALL hide its vertical column-divider indicators while idle. The divider for a resizable column SHALL appear when the pointer hovers over that column heading or its resize handle, and SHALL disappear when the pointer leaves unless keyboard focus or an active drag still requires it to remain visible. Existing horizontal row separators and table content SHALL remain unchanged.

#### Scenario: Transaction table is idle

- **WHEN** the desktop transaction table is rendered and no column heading or resize handle is hovered, focused, or active
- **THEN** the vertical column-divider indicators are visually hidden
- **AND** the column resize controls remain available to assistive technology and keyboard navigation

#### Scenario: Pointer hovers a resizable column

- **WHEN** the pointer enters a resizable column heading or its divider handle
- **THEN** that column’s divider indicator becomes visible
- **AND** it returns to hidden when the pointer leaves and no focus or drag is active

#### Scenario: Keyboard focus or pointer drag is active

- **WHEN** a resize control receives keyboard focus or a pointer drag is active
- **THEN** its divider remains visible while preserving the existing resize behavior

#### Scenario: Narrow-screen table layout is used

- **WHEN** the transaction table switches to the narrow-screen labeled row-card layout
- **THEN** resize handles and column-divider indicators remain absent from that layout
