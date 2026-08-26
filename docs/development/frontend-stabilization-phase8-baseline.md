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

## Post-boundary measurement

After moving the cashier overview's static header and action composition into the server page and isolating session/offline context in `CashierOverviewContext`, `/cashier` measured **150,614 encoded JavaScript bytes**, down 4,976 bytes (3.2%). API count remained one. The other measured routes were unchanged, confirming the change was scoped to the overview route. Full output is recorded in `tmp/performance/frontend-stabilization-phase8-post-boundary.json`.

The cashier transaction route now imports `createApiRequest` from the narrow request module rather than the `lib/api` barrel, avoiding the barrel's generated-client re-export in that megascreen boundary. This did not change request counts or the route's measured transfer after tree-shaking, but removes the unnecessary dependency edge.
