# Cashier reference provenance

- Reference manifest: `docs/frontend/prototype-reference-manifest.json`
- Reference SHA: `410ecd75`
- Reference directory: `figmaExport/`
- Browser evidence environment: Playwright Chromium, 1440×923 desktop; 768×900 tablet; 375×812 mobile; system font loading is awaited by screenshot assertions.
- Cashier Transactions is a derived route surface. It has no separate Figma asset and is mapped to the bounded transaction behavior in the workflow tests.
- Sync Queue is a derived offline surface. It has no original Figma asset; `sync-queue-mobile-empty.png` and the mixed/local reconciliation tests are the approved derived baseline.
- Existing manifest entries remain unchanged. Any visual deviation is accepted only when the behavior contract or shared design-system owner requires it and is covered by a focused test.
