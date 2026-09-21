# Cashier reference provenance

- Reference manifest: `docs/frontend/prototype-reference-manifest.json`
- Immutable reference SHA: `410ecd75`
- Reference directory: `figmaExport/`
- Browser evidence environment: Playwright Chromium with stable fixtures and `document.fonts.ready`; current derived viewports are 1440×923 desktop, 1024×1366 tablet, and 390×844 mobile.
- The manifest records actual PNG dimensions separately from the 1440×923 source design context. Crop assets are not treated as full-page references.

## Evidence categories

- **A — Direct Figma parity:** mapped immutable reference plus measured full-page or crop/landmark coordinates. Current full-page mappings include `Landing.png`, `Landing-1.png`, and the inspected `Landing-2.png` through `Landing-18.png`; named crop source bounds remain blocked.
- **B — Prototype/design-system conformance:** approved prototype HTML/CSS, tokens, computed styles, accessibility, and ownership checks.
- **C — Derived product conformance:** production behavior, responsive/reduced-motion checks, React baselines, and functional workflow evidence.

## Current provenance boundaries

- `/cashier/transactions` is a derived consumer of the original supervisor transaction design. `Landing-17.png` and `Landing-18.png` identify the original transaction list/detail states; cashier-specific behavior remains Category C.
- `/cashier/sync` has no original Figma asset and is Category C using functional, accessibility, responsive, and React baseline evidence.
- Shared buttons, fields, cards, tables, dialogs, shell/sidebar, and focus behavior use Category B prototype/design-system evidence where no aligned Figma reference exists.
- Tablet and mobile viewports remain Category B/C until matching Figma references exist.

## Crop mapping contract

For every crop reference, the manifest records `sourceAsset`, `sourceSha`, `sourceViewport`, actual `cropWidth`/`cropHeight` through `actualDimensions`, `sourceBounds`, `targetLandmark`, state, comparison mode, and approved deviation. `sourceBounds` is `null` when the original full-page coordinate system is unavailable; such records are explicitly `source-bounds-blocked`.

The approved initial engineering tolerances are landmark position/size ±2 CSS px, control height/radius ±1 CSS px, spacing/padding ±2 CSS px, line height ±1 CSS px, exact border width/colors/approved font family-size-weight, and ≤1% differing pixels only for aligned font-matched regions. The 8% React-regression threshold is never used for Figma parity.

## Typography

Current configured fonts are accepted for derived checks only. Browser-computed font family, size, weight, line height, and letter spacing must be recorded. Figma-exact typography remains blocked until the original Figma font families, weights, and availability are confirmed.

Any future visual deviation must reference the manifest category, immutable source, measured bounds/landmark, or the approved deviation registry. No source bounds or route mapping may be inferred solely from a filename or selected dynamically by image similarity.
