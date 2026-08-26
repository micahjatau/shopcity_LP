## 1. Cashier overview

- [x] 1.1 Rework `/cashier` into a compact launcher-first layout.
- [x] 1.2 Move supplementary copy and helper cards behind the primary cashier actions.
- [x] 1.3 Compact the cashier shell/header context so branch, device, session, and sync state stay visible without dominating the page.

## 2. Workflow pages

- [x] 2.1 Rebalance the lookup page so the scan/search action is the first visible task.
- [x] 2.2 Rebalance the earn page so the form and lookup context appear before secondary notes.
- [x] 2.3 Rebalance the redeem page so the form and balance context appear before secondary notes.
- [x] 2.4 Remove repeated launcher-style route grids from cashier workflow pages.

## 3. Sync queue

- [x] 3.1 Rework `/cashier/sync` so queue summary and batch submission come before record detail.
- [x] 3.2 Keep selected-record recovery visible without making detail tables the dominant surface.

## 4. Verification

- [x] 4.1 Update cashier Playwright coverage to reflect the new hierarchy and route flow.
- [x] 4.2 Update cashier visual-regression snapshots for the compact overview, focused workflow pages, and sync queue.
- [x] 4.3 Run typecheck and build for the affected web surfaces.
