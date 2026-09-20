# Cashier design-system conformance matrix

Baseline: `workflow-states-implementation` at `8d9eb98`; implementation evidence is recorded by route/state below. References remain governed by `docs/frontend/prototype-reference-manifest.json` and `docs/frontend/design-system/reference-provenance.md`.

| Route                   | Primary job                          | Required states                                                                                          | Desktop  | Tablet   | Mobile      | Existing behavior evidence                                 |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------- | -------- | ----------- | ---------------------------------------------------------- |
| `/cashier`              | Bounded activity overview            | loading, loaded, empty/error feed, quick actions, long/zero values                                       | 1440×923 | 768×1024 | 360/375/390 | reports feed, local receipt filter, role action visibility |
| `/cashier/lookup`       | Customer discovery/card verification | idle, loading, no result, API/offline error, scanner, directory result, verified handoff                 | 1440×923 | 768×1024 | 360/375/390 | lookup controller, masking, scanner, keyboard/deep-link    |
| `/cashier/earn`         | Capture purchase                     | idle/loading/error, verified/confirmation, receipt, review, confirmed, approval, offline-saved, failure  | 1440×923 | 768×1024 | 360/375/390 | integer kobo, CSRF/idempotency, policy, offline queue      |
| `/cashier/redeem`       | Redeem credit                        | idle/loading/error, verified/confirmation, basket/amount, review, approved/rejected; offline unavailable | 1440×923 | 768×1024 | 360/375/390 | authoritative balance, limits, policy, idempotency         |
| `/cashier/transactions` | Bounded activity/detail              | loading, empty/error, filters, detail loading/error/loaded, stale response, focus return                 | 1440×923 | 768×1024 | 360/375/390 | bounded feed, filters, modal request guard                 |
| `/cashier/sync`         | Offline reconciliation               | mixed queue statuses, device unavailable, retry, mixed batch, clear-confirmation                         | 1440×923 | 768×1024 | 360/375/390 | IndexedDB queue, device gate, batch DTO/status mapping     |

## Shared control conformance

Compare existing controls on real routes by component, variant, size, state and viewport. Required properties: font family/size/weight/line-height, height, border, radius, background/text color, padding, gap and focus treatment. Missing combinations are explicitly `N/A`; no controls are invented for coverage.

- Primary/secondary/ghost/danger/link buttons: Cashier plus login, Supervisor and Admin consumers.
- Text/search/money/select controls: lookup, financial forms, transactions, sync and representative shared forms.
- Cards/status/table/dialog: all six Cashier pages plus transaction modal and one non-Cashier consumer.

## Evidence status

| Evidence                                                           | Status                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Reference SHA and existing asset provenance                        | Planned; existing manifest pins `410ecd75`                                                      |
| Cashier Transactions mapping distinct from Supervisor Transactions | Required implementation update                                                                  |
| Sync Queue reference                                               | Required derived/reviewed reference; no original Figma asset claimed                            |
| Baseline token check                                               | Passed before implementation                                                                    |
| Baseline prototype reference verification                          | Passed before implementation                                                                    |
| Baseline web typecheck                                             | Passed before implementation                                                                    |
| Implementation conformance/browser/accessibility/build gates       | Passed for completed P3–P7 slices; remaining finalization evidence is tracked in OpenSpec tasks |
