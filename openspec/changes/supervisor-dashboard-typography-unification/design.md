# Design: Supervisor dashboard typography unification

## Principles

- Reuse the profile’s existing Inter and `--sc-font-size-profile-*` / `--sc-line-height-profile-*` tokens; do not introduce a second typography scale.
- Scope presentation to Supervisor page roots (`.supervisor-page`, `.supervisor-reports-page`, and page-level customer profile presentation). Keep Admin/Cashier route roots and shared component defaults untouched.
- Use near-black for primary page and section text, muted neutral text for labels and supporting content, and regular/medium/semibold/bold weights. Preserve all existing button, sidebar, and navigation colors.
- Change type properties only. Do not change margins, padding, grid/flex geometry, widths, colors, content, interactions, or data behavior.
- Do not reduce supporting type below 0.75rem. Where existing compact metadata cannot use the 12px caption token without harming layout, inspect and verify it remains readable.

## Hierarchy

| Role                      | Token direction                                               |
| ------------------------- | ------------------------------------------------------------- |
| Route title               | `profile-page-title`, bold, neutral-900, heading line height  |
| Major section heading     | `profile-section`, semibold, neutral-900                      |
| Body / table values       | `profile-body` or `profile-base`, regular/medium, neutral-900 |
| Labels / supporting text  | `profile-label`, medium, neutral-600                          |
| Captions / dense metadata | `profile-caption`, medium, neutral-600; never below 0.75rem   |
| Emphasized values         | existing metric/value tokens, semibold, neutral-900           |

## Implementation boundaries

- Add a Supervisor-scoped typography contract to the route stylesheet, and migrate existing Supervisor-owned explicit pixel font sizes and prototype display-font references where they conflict with the contract.
- Keep report-specific styles within `.supervisor-reports-page`.
- Do not use broad element selectors or `!important` overrides that affect unrelated routes or shared primitives.
- Verify all seven Supervisor route groups and customer profile at desktop/tablet/mobile widths. Compare representative Admin/Cashier routes before/after to ensure isolation.
