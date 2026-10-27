## Context

See `proposal.md` for motivation. The Supervisor transaction table already uses accessible resizer controls with pointer dragging and keyboard resizing; narrow-screen styling removes those controls. The vertical line is a decorative pseudo-element on each resizer.

## Goals / Non-Goals

**Goals:**

- Hide only the decorative vertical line while idle and reveal the relevant boundary on column-heading hover, handle hover, keyboard focus, or active drag.
- Preserve the existing resizer hit target, accessible role/name, pointer/keyboard behavior, and mobile rules.

**Non-Goals:**

- No changes to column widths, table data/layout, other role tables, or transaction behavior.
- No changes to horizontal row dividers or the transaction API.

## Decisions

- Change the resizer pseudo-element’s opacity instead of hiding the control with `display: none`. This keeps pointer and keyboard interaction intact while removing the idle visual line.
- Reveal the line on the resizable heading’s hover and on the handle’s hover/focus/active states. The heading-level hover makes the column boundary discoverable before the pointer reaches the narrow handle; focus/active states keep keyboard and drag interactions perceptible.
- Leave existing narrow-screen rules and the neutral/red emphasis on the actual handle unchanged.

## Risks / Trade-offs

- [A hidden divider is difficult to discover] → Hovering anywhere in its resizable heading reveals it; keyboard focus also keeps it visible.
- [A style change reaches unrelated Supervisor tables] → Use only the existing `.supervisor-transaction-table`-specific selectors.

## Migration Plan

Deploy as a CSS-only change with focused browser coverage. Roll back by reverting the scoped CSS rule; no data migration or API coordination is required.
