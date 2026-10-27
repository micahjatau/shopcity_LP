# Figma-to-React comparison report

## Status

Task 6.4 is closed as an honest reference-mapping and conformance exercise. This report distinguishes three evidence categories:

- **A — Direct Figma parity:** immutable reference asset at `410ecd75`, mapped route/state, and aligned full-page or measured crop/landmark comparison.
- **B — Prototype/design-system conformance:** approved prototype HTML/CSS, tokens, shared-component computed styles, and accessibility evidence where no aligned Figma image exists.
- **C — Derived product conformance:** production-approved behavior, responsive checks, React regression evidence, and functional assertions for surfaces or states without an original reference.

The seven named crop assets are inspected and recorded with their actual PNG dimensions. Their source bounds are deliberately `null` because the original full-page coordinate system is not committed; they remain **blocked for direct pixel parity**, not silently treated as full-page references. `Landing-1.png` is the only currently mapped full-page route reference for direct parity. `Landing-2.png` through `Landing-18.png` were inspected and mapped to visible route/state compositions without inferring from filenames alone.

Figma-exact typography remains blocked until the original font families, weights, and availability are confirmed. Derived checks record browser-computed font family, size, weight, line height, and letter spacing.

## Immutable source and comparison contract

- Reference manifest: `docs/frontend/prototype-reference-manifest.json`
- Reference SHA: `410ecd75`
- Reference directory: `figmaExport/`
- Desktop source design context: 1440×923; actual PNG dimensions are recorded separately.
- Browser evidence: Playwright Chromium with stable fixtures and `document.fonts.ready` waits.
- Approved tolerances: landmark position/size ±2 CSS px; control height/radius ±1 CSS px; spacing/padding ±2 CSS px; border width, primary token colors, and approved font family/size/weight exact; line height ±1 CSS px; aligned font-matched pixel regions ≤1% differing pixels.
- The existing 8% React snapshot threshold is not used as Figma-parity acceptance.

A comparison record must fail closed when its source bounds, target landmark, font status, tolerance, or reference asset is missing. No production region is selected dynamically by visual similarity.

## Inspected full-page reference states

| Asset            | Route                   | State                      | Category | Status                                           |
| ---------------- | ----------------------- | -------------------------- | -------- | ------------------------------------------------ |
| `Landing.png`    | `/login`                | hero login composition     | A        | mapped full-page alternate                       |
| `Landing-1.png`  | `/login`                | login form                 | A        | mapped full-page                                 |
| `Landing-2.png`  | `/cashier`              | bounded overview feed      | A        | mapped full-page                                 |
| `Landing-3.png`  | `/supervisor/customers` | customer-information step  | A        | mapped full-page                                 |
| `Landing-4.png`  | `/supervisor/customers` | consent step               | A        | mapped full-page                                 |
| `Landing-5.png`  | `/supervisor/customers` | review step                | A        | mapped full-page                                 |
| `Landing-6.png`  | `/supervisor/customers` | registration success       | A        | mapped full-page                                 |
| `Landing-7.png`  | `/cashier/lookup`       | empty search               | A        | mapped full-page                                 |
| `Landing-8.png`  | `/cashier/lookup`       | directory results          | A        | mapped full-page                                 |
| `Landing-9.png`  | `/cashier/lookup`       | no results                 | A        | mapped full-page                                 |
| `Landing-10.png` | `/cashier/lookup`       | customer discovery matches | A        | mapped full-page                                 |
| `Landing-11.png` | `/cashier/earn`         | customer/card selection    | A        | mapped full-page                                 |
| `Landing-12.png` | `/cashier/earn`         | confirmation               | A        | mapped full-page                                 |
| `Landing-13.png` | `/cashier/earn`         | receipt/details            | A        | mapped full-page                                 |
| `Landing-14.png` | `/cashier/earn`         | confirmed outcome          | A        | mapped full-page                                 |
| `Landing-15.png` | `/cashier/earn`         | credit outcome             | A        | mapped full-page                                 |
| `Landing-16.png` | `/cashier/redeem`       | customer/card selection    | A        | mapped full-page                                 |
| `Landing-17.png` | `/cashier/transactions` | bounded transaction list   | A/C      | original design state; cashier behavior derived  |
| `Landing-18.png` | `/cashier/transactions` | transaction detail popup   | A/C      | source state mapped; production behavior derived |

The actual dimensions and source bounds for every asset are recorded in the manifest. Full-page exports use their actual image bounds; crop exports explicitly remain source-bounds-blocked.

## Named crop references

| Reference                   | Actual dimensions | Route/state                             | Target landmark                    | Status                 |
| --------------------------- | ----------------: | --------------------------------------- | ---------------------------------- | ---------------------- |
| `Overview.png`              |            527×93 | `/cashier` overview                     | `[data-od-id="activity-metrics"]`  | blocked: source bounds |
| `Find-Customer.png`         |           547×252 | `/cashier/lookup` discovery             | `[data-od-id="customer-search"]`   | blocked: source bounds |
| `Capture-Purchase.png`      |           493×247 | `/cashier/earn` verified card           | `[data-od-id="capture-find"]`      | blocked: source bounds |
| `Redeem-Credit.png`         |           458×252 | `/cashier/redeem` verified card         | `[data-od-id="redeem-find"]`       | blocked: source bounds |
| `Register-New-Customer.png` |           547×400 | `/supervisor/customers` registration    | `[data-od-id="register-flow"]`     | blocked: source bounds |
| `Transactions.png`          |            701×92 | `/supervisor/transactions` bounded list | `[data-od-id="transactions-view"]` | blocked: source bounds |
| `Login.png`                 |           283×122 | `/login` crop                           | `[data-od-id="login-page"]`        | blocked: source bounds |

No crop coordinate is fabricated from the image dimensions. These references support inventory and future crop comparison, while current direct parity remains blocked until original source bounds are supplied.

## Derived conformance

- Shared buttons, fields, cards, tables, dialogs, shell/sidebar, and focus states: **B**, using approved tokens, prototype HTML/CSS, ownership checks, and computed-style comparisons.
- Loading, error, approval-pending, offline, and other financial states without source images: **B/C**, using workflow contracts and React/browser evidence.
- Cashier-specific transaction behavior: **C**.
- `/cashier/sync`: **C**, with functional, accessibility, responsive, and React baseline evidence.
- Tablet 1024×1366 and mobile 390×844: **B/C** until matching Figma exports exist.
- Animation/reduced motion: **B/C** unless an editable Figma motion reference is verified.

## Residual blockers

1. Source bounds for named crop exports are not committed.
2. Font identity and availability for the original Figma files are unconfirmed.
3. Full-page Figma references do not yet exist for every route, state, or responsive viewport.
4. The transaction popup source is mapped to `Landing-18.png`, but its production consumer remains derived.

These blockers do not invalidate derived conformance. They prevent an overall claim of one-to-one Figma-exact frontend parity.
