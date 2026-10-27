# Cashier visual contract

This contract records the canonical presentation values used by the six Cashier routes. It references the generated token sheet and shared component styles; it is not a second token source.

## Canonical owners

| Surface           | Owner                                                                                             | Required contract                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Page title        | `.sc-page-head h1` in `styles/primitives.css` and the shared `CashierPageHeader`                  | Display sans family, 34px desktop title, zero margin, compact mobile sizing through the existing responsive rule          |
| Description       | `.sc-page-head p`                                                                                 | Muted semantic text, 8px top rhythm unless a named route header intentionally composes its own zero-margin description    |
| Cards             | `.sc-card` and named variants in `styles/cashier-design-system.css`                               | One-pixel border, prototype surface, 16px radius; variants change layout only                                             |
| Fields            | `.sc-control` plus `.sc-input`, `.sc-select`, or `.sc-combobox__input` in `styles/primitives.css` | 44px standard height, 10px radius, shared border/focus treatment, 16px text and 16px horizontal padding                   |
| Primary buttons   | `.sc-button.sc-button--primary`                                                                   | Full-radius pill, semantic primary surface/text, shared compact/standard/large heights                                    |
| Secondary buttons | `.sc-button.sc-button--secondary`                                                                 | Full-radius pill, semantic surface, strong border, primary text, shared heights                                           |
| Search            | `.global-shell-search`, `.global-shell-search__control`, and route search controls                | 300px maximum on desktop, 230px mobile shell width, 36px global-search control height, no horizontal overflow             |
| Status            | `.sc-status` and tone modifiers                                                                   | 20px bottom spacing and semantic tone colors; status is not an interactive control                                        |
| Tables            | `.visual-table-wrap` and `.visual-table` or the canonical transaction table owner                 | 16px bounded surface radius, one-pixel border, shared row padding/dividers, narrow screens scroll inside the table region |
| Dialogs           | `.visual-dialog` and `.visual-dialog__panel`                                                      | 16px outer surface radius, 24px panel radius, shared surface/border/shadow, keyboard focus trap and return focus          |
| Focus             | global `:focus-visible` rule                                                                      | 2px semantic focus outline with 2px offset; keyboard focus must remain visible in shell, controls, drawers, and dialogs   |

## Shared shell geometry

At the desktop reference viewport the shared shell uses 244px expanded sidebar, 76px collapsed sidebar, 64px topbar, 16px top/24px horizontal/40px bottom content padding, and a 1120px content maximum. Navigation links have a 44px minimum height. The Overview/global shell search is at most 300px wide.

At widths below the existing tablet breakpoint, the current React mobile drawer remains authoritative. The drawer owns focus entry, Escape dismissal, focus return, scroll locking, and reduced-motion behavior. Content and search controls contract to the existing 230px mobile search rule and must not create document-level horizontal overflow.

## Verification boundary

The route conformance fixture checks every matching canonical instance on the six Cashier routes and role shell routes. A component that is not rendered by a route state is recorded as optional rather than treated as a silent pass. Focus, drawer, reduced-motion, target-size, and overflow behavior are verified by the bounded browser tests. Visual snapshots remain separate evidence and are not replaced by these computed-style checks.
