# Frontend stabilization Phase 8 baseline

- **Commit:** `54cad11`
- **Build:** production `next build`
- **Server:** `next start` on `127.0.0.1:3200`
- **Auth:** unauthenticated evidence only; authenticated storage state was unavailable
- **Browser:** Playwright Chromium, `en-NG`, `Africa/Lagos`, light scheme
- **Collection:** `tmp/performance/frontend-stabilization-phase8-baseline.json`

## Cold route evidence

| Route                   | Status | API requests | JavaScript encoded bytes | Warm API requests |
| ----------------------- | -----: | -----------: | -----------------------: | ----------------: |
| `/cashier`              |    200 |            1 |                  155,590 |                 1 |
| `/cashier/lookup`       |    200 |            1 |                  157,330 |                 1 |
| `/cashier/earn`         |    200 |            1 |                  157,329 |                 1 |
| `/cashier/redeem`       |    200 |            1 |                  157,330 |                 1 |
| `/supervisor/approvals` |    200 |            1 |                  150,901 |                 1 |
| `/admin/operations`     |    200 |            1 |                  150,901 |                 1 |

The warm-navigation JavaScript payload is above the 150 KB target on every measured route. This is an evidence-backed optimization exception; authenticated performance and hydration/LCP metrics remain unavailable until an approved storage-state file is supplied.
