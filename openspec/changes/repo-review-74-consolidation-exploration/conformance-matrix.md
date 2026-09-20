# Review 74 conformance matrix

## Evidence contract

- Browser: Chromium via repository Playwright configuration.
- Default reference viewport: 1440×923 where committed prototype evidence exists.
- Responsive checks: 1024×1366 tablet and 390×844 mobile.
- Modes: light; reduced-motion checks for animated surfaces.
- Wait condition: `document.fonts.ready` and stable fixture state before computed-style capture.
- Computed-style comparison: font family, size, weight, line height, foreground color, background, border width/style/color, radius, min-height/height, four padding sides, gap, focus outline/shadow.
- Tolerance: exact discrete values; at most 1 CSS pixel for documented subpixel layout measurements.
- Evidence provenance: committed prototype references remain distinct from derived Sync Queue references and untracked screenshots.

## Route and state matrix

| Surface                              | Required states / actions                                                                                                                    | Viewports                               | Evidence                                                                     | Status  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- | ------- |
| Cashier Overview `/cashier`          | normal bounded feed, empty feed, loading, error, quick-action permissions, long metric/table values                                          | desktop, tablet, mobile                 | route screenshot, computed styles, accessibility                             | pending |
| Find Customer `/cashier/lookup`      | idle, pending, no results, API error, offline/error, directory discovery, keyboard selection, deep-link handoff                              | desktop, tablet, mobile                 | workflow test, screenshot, request assertions                                | pending |
| Capture Purchase `/cashier/earn`     | lookup, confirmation, details, review, loading, validation/error, duplicate, approval-required, offline-saved, confirmed                     | desktop, tablet, mobile, reduced motion | paired workflow screenshots, computed styles, controller/request assertions  | pending |
| Redeem Credit `/cashier/redeem`      | lookup, confirmation, basket/details, validation, insufficient balance, pending, supported approval/rejection, confirmed, offline prohibited | desktop, tablet, mobile, reduced motion | paired workflow screenshots, computed styles, offline prohibition assertions | pending |
| Transactions `/cashier/transactions` | loaded list, empty/error, filters, detail loading/error/loaded, Escape, backdrop close, focus return, stale response                         | desktop, tablet, mobile                 | table/modal screenshot, request-generation tests, focus assertions           | pending |
| Sync Queue `/cashier/sync`           | waiting, syncing, awaiting approval, saved-on-device, confirmed, rejected, retry-required, mixed batch, missing device, clear confirmation   | desktop, tablet, mobile                 | derived reference, queue tests, status/count assertions                      | pending |
| Shared shell / Cashier               | expanded/collapsed sidebar, mobile drawer, search idle/results/keyboard/Escape, logout, session loading/error                                | desktop, tablet, mobile                 | shell screenshots, focus/role tests                                          | pending |
| Shared shell / Supervisor            | role navigation, search authorization, shell layout, logout                                                                                  | desktop, tablet, mobile                 | role smoke and regression evidence                                           | pending |
| Shared shell / Admin                 | role navigation, search authorization, shell layout, logout                                                                                  | desktop, tablet, mobile                 | role smoke and regression evidence                                           | pending |

## Ownership families

| Family                 | Required owner                                            | Current evidence                                                |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Buttons / action links | `primitives.css` and `cashier-design-system.css` variants | Known action selectors singular; generic enforcement incomplete |
| Cards / flow panels    | shared card/flow styles with named variants               | Cashier card selectors still include scoped input/heading rules |
| Forms / inputs         | shared form primitives                                    | Route-specific focus override remains to classify               |
| Search / filters       | shared search and toolbar styles                          | Shell search owner exists; route-wide computed parity pending   |
| Status / badges        | shared status components and semantic tokens              | Runtime state matrix pending                                    |
| Tables / dialogs       | shared table/modal owners                                 | Transactions computed/focus evidence pending                    |
| Shell                  | `shell-components.css`                                    | AppShell blocks migrated; topbar source reconciliation pending  |

## Completion rule

The consolidation cannot be marked complete until every required row has evidence, every ownership exception is documented, and the authoritative topbar/customer-discovery source is identified. Passing unit/build checks alone is insufficient.
