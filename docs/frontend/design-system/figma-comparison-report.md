# Figma-to-React comparison scaffold

## Status

Phase 6 inventory and evidence scaffold completed against reference SHA `410ecd75`. A deterministic one-to-one pixel comparison is **blocked** for the current reference set: the committed Figma assets are component/crop exports, while the existing Playwright `prototype-*` images are full rendered-page captures. No crop/landmark mapping exists that would make a direct pixel diff honest.

This report intentionally does not claim Figma fidelity. The follow-on implementation is tracked in [issue #46](https://github.com/micahjatau/shopcity_LP/issues/46).

## Reference inventory

Source of truth: `docs/frontend/prototype-reference-manifest.json`, reference directory `figmaExport/`, reference SHA `410ecd75`.

| Surface           | Route                      | Figma reference             | Fixture                            | Reference viewport | Comparison status       |
| ----------------- | -------------------------- | --------------------------- | ---------------------------------- | ------------------ | ----------------------- |
| Login             | `/login`                   | `Landing-1.png`             | `unauthenticated-login`            | 1440×923           | blocked: crop alignment |
| Overview          | `/cashier`                 | `Overview.png`              | `cashier-overview-bounded-feed`    | 1440×923           | blocked: crop alignment |
| Find Customer     | `/cashier/lookup`          | `Find-Customer.png`         | `cashier-customer-discovery`       | 1440×923           | blocked: crop alignment |
| Capture Purchase  | `/cashier/earn`            | `Capture-Purchase.png`      | `cashier-earn-verified-card`       | 1440×923           | blocked: crop alignment |
| Redeem Credit     | `/cashier/redeem`          | `Redeem-Credit.png`         | `cashier-redeem-verified-card`     | 1440×923           | blocked: crop alignment |
| Register Customer | `/supervisor/customers`    | `Register-New-Customer.png` | `supervisor-customer-registration` | 1440×923           | blocked: crop alignment |
| Transactions      | `/supervisor/transactions` | `Transactions.png`          | `bounded-transactions`             | 1440×923           | blocked: crop alignment |

Derived surfaces remain explicit: Transactions/Cashier and Sync Queue do not have original Figma assets and use the approved derived workflow evidence described in `reference-provenance.md`.

## Existing deterministic evidence

- `apps/web/tests/prototype-acceptance.spec.ts` verifies all seven manifest paths exist, stay under `figmaExport/`, and have non-zero image dimensions.
- `apps/web/tests/workflow-routes.spec.ts` provides fixed route/state fixtures and Chromium captures at desktop/tablet/mobile sizes.
- `apps/web/tests/visual-regression.spec.ts` provides separate React visual baselines.
- `docs/frontend/prototype-deviation-registry.md` records accepted contract/accessibility deviations.

These signals must remain separate from the future Figma comparison runner. Existing React baselines are not relabeled as Figma matches.

## Required comparison contract for issue #46

The implementation should emit one record per route/state/viewport with:

- reference asset and reference SHA;
- rendered route, fixture, browser, viewport, and loaded-font status;
- crop/landmark mapping and candidate capture path;
- pixel and computed-style tolerances;
- measured diff counts/ratios and pass/fail/blocked status;
- linked intentional deviation or a precise blocker.

The runner must fail closed when a reference, crop mapping, candidate capture, font, or tolerance is missing.
