# Review 73: reconciled implementation audit

## Evidence boundary

Planning inspected branch `workflow-states-implementation`, HEAD `8d9eb98`, on 2026-09-19. This is **not** the review's `fix/prototype-topbar-customer-lookup` / `72980fe0` baseline. The working tree was already dirty. No runtime or pixel-parity result is asserted by this audit.

Preserved existing work includes `AGENTS.md`, `CLAUDE.md`, Admin/Supervisor overview edits, `apps/web/next.config.mjs`, test/build artifacts, untracked screenshots, frontend setup files, review documents, preview-framing documentation and its OpenSpec change. Do not use a blanket reset, clean, stash, checkout, or snapshot update to isolate this proposal.

The GitNexus index was refreshed successfully with `npm run gitnexus:analyze`; status reports current HEAD. The index includes the inspected working tree, not a guarantee of committed-only source. Repository-scoped Graphiti search (`shopcity_LP`, cashier/prototype/design-token/lookup terms) returned zero facts. Transport/backend status was healthy; ingestion, model generation, embeddings, and post-write searchability were not established by that read.

## Current-source findings

| Surface             | Observed owner/problem                                                                                                                           | Implementation consequence                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Token source        | `docs/frontend/design-system/tokens.json` already contains semantic, primitive, and prototype groups                                             | Promote semantics in source; do not add a parallel root-only theme                                                                                                 |
| Token generator     | `apps/web/scripts/generate-tokens.mjs` walks explicit groups and resolves `{path}` aliases to CSS variables; it also emits html/body/reset rules | A new group requires generator support; separating base rules requires regeneration, not manual generated-file edits                                               |
| Token drift check   | `check-token-drift.mjs` runs generation and compares output                                                                                      | It mutates the generated file on drift; record status before/after and test invalid references separately                                                          |
| Global entry        | `globals.css` imports Tailwind, tokens, primitives; contains login/page styles, gradients, and a bare `button` layout rule                       | Preserve Tailwind layer behavior; move page-specific rules without accidentally repainting login; remove broad component styling only after explicit classes exist |
| Primitive system    | Existing `Button` has primary/secondary/ghost/danger/link and compact/standard/large, with disabled/loading/ref/native props                     | Extend/reuse this contract; do not introduce a competing button implementation                                                                                     |
| Overview            | `app/(shell)/cashier/page.tsx` and `CashierOverviewLookup` both embed CSS                                                                        | One header, metric, and table ownership model must replace both sets together                                                                                      |
| Undefined variables | Overview uses `--sc-color-warning-300`; overview lookup uses `--sc-color-success-700`; source uses named warning/success strengths instead       | Replace with valid semantic state tokens and test unresolved variables recursively                                                                                 |
| Shared workflows    | `CashierWorkflowRoute` contains header/step/panel CSS, inline heading margin, and `section:first-of-type` rules                                  | Explicit components/classes must replace structural selector dependencies                                                                                          |
| Financial lookup    | `VerifiedCardLookupStep` embeds CSS; Earn wraps it while initial Redeem renders it directly                                                      | Normalize a single panel owner; avoid double panels and blank Earn wrappers after confirmation                                                                     |
| Financial forms     | Earn/Redeem forms still contain static inline layout objects                                                                                     | Extract visual layout while preserving hooks, mounting identity, props, callbacks and request lifecycle                                                            |
| Transactions        | Cashier route owns much of the toolbar/table/modal CSS; `TransactionDashboard` owns content, requests and modal keyboard handling                | Extract modal presentation without losing stale-response invalidation, Escape, focus trap, and trigger restoration                                                 |
| Generic Dialog      | `components/ui/dialog.tsx` currently lacks the transaction modal's full keyboard/focus lifecycle                                                 | It is not a drop-in safe replacement. Harden/reuse a single dialog behavior owner with tests before migration                                                      |
| Sync Queue          | `app/(shell)/cashier/sync/page.tsx` mixes queue hooks/handlers, JSX, embedded CSS and named `CSSProperties` objects                              | Remove visual objects, not refresh/sync/retry/clear behavior; route-local controller extraction is unnecessary unless separately justified                         |
| Shell               | Current sidebar and global-search changes are newer than review-71 instructions                                                                  | Preserve collapse/persistence, mobile drawer, role-aware search and authorized navigation; do not re-add a removed bell                                            |
| Tooling             | Next 15 / React 19; existing Tailwind import, Lucide, custom UI primitives; Jest, Playwright and token scripts                                   | No new framework or icon dependency is needed                                                                                                                      |

## State and data differences the implementation must respect

- Find Customer is not the same operation as exact financial card verification. Share search presentation, not search semantics, callbacks, debounce rules, or financial authority.
- `CashierWorkflowRoute` currently owns confirmation flags and flow-step reporting; Earn and Redeem expose different labels/stages. Unify presentation, not transition logic.
- `TransactionDashboard` uses the bounded cashier-today feed, exact normalized matching against receipt/id, existing status/operation/amount filters, and a separate detail request. Do not silently change match behavior to substring search while extracting a search field.
- Sync Queue currently counts `waiting-to-sync`, `syncing`, `awaiting-approval`, `confirmed`, `rejected`, and `retry-required`; queueable records also include `saved-on-device`. The review's four conceptual cards do not authorize dropping approval/saved states or altering count semantics.
- Sync requires the authenticated device association; clearing confirmed local records requires `CLEAR`. Local clearing is not deletion of backend ledger entries.
- Existing session, policy and money controllers remain the source for visible data. Unknown values remain unknown, and pending/offline outcomes must not acquire confirmed-success styling/copy.

## Reference and test gaps

`docs/frontend/prototype-reference-manifest.json` pins `410ecd75`, references committed `figmaExport` assets, and records 1440×923 viewports. It contains seven entries, with Transactions pointing to `/supervisor/transactions` and **no Sync Queue entry**. `apps/web/tests/prototype-acceptance.spec.ts` assumes exactly seven entries. Preserve existing mappings; add explicit Cashier/derived-Sync coverage with provenance, and replace a brittle fixed count with required-entry/schema assertions when appropriate.

Untracked root screenshots are not automatically approved references. Freeze their provenance only with explicit approval. Sync Queue should inherit approved operational primitives, then receive its own reviewed derived baseline; do not pretend a missing Figma page exists.

`apps/web/playwright.config.ts` defaults to 1440×2200, not the manifest viewport. It uses one worker, `en-NG`, `Africa/Lagos`, light scheme, DPR 1, and optional server reuse. Conformance/visual fixtures must explicitly set the intended viewport and avoid accidentally testing an unrelated running server.

Existing `workflow-routes.spec.ts` already covers paired Earn/Redeem lookup screenshots, modal interaction, sidebar geometry, lookup handoff/error/offline, transaction outcomes, narrow Sync Queue controls, device gating, local Earn reconciliation, and double-submit prevention. Extend these fixtures instead of replacing them with a synthetic happy-path gallery. Existing Jest tests cover shell, search, lookup, transaction forms/dashboard, draft persistence, session bootstrap and offline queue.

## Proposal-time blast radius

Commands use `npm run proposal:impact -- --file <path> <symbol>` (default upstream, tests included). `Button` required `--kind Function` to disambiguate the forwardRef const/function pair.

| Symbol / path                                                                  | Risk         | Upstream | Direct | Processes |
| ------------------------------------------------------------------------------ | ------------ | -------: | -----: | --------: |
| `Button`, `components/ui/button.tsx`                                           | **CRITICAL** |       53 |     24 |        29 |
| `CashierWorkflowRoute`, `components/workflows/cashier-transaction-route.tsx`   | **HIGH**     |        4 |      4 |         3 |
| `VerifiedCardLookupStep`, `components/workflows/verified-card-lookup-step.tsx` | **HIGH**     |        5 |      1 |         3 |
| `TransactionDashboard`, `components/workflows/transaction-dashboard.tsx`       | LOW          |        2 |      2 |         1 |
| `CashierOverviewLookup`, `components/workflows/cashier-overview-lookup.tsx`    | LOW          |        2 |      2 |         1 |
| `AppShell`, `components/app-shell.tsx`                                         | LOW          |        2 |      2 |         1 |
| `CashierSyncPage`, `app/(shell)/cashier/sync/page.tsx`                         | LOW          |        0 |      0 |         0 |

Workflow processes include `CashierEarnPage`, `CashierRedeemPage`, and `CashierLookupPage`. Button impact reaches Cashier, Supervisor, Admin, login, customer/card/approval/report and operational surfaces. Graph-derived counts are **not CSS reachability**: a zero-caller route is still user-facing, and global selectors/tokens can affect all consumers regardless of graph classification.

Before implementation, rerun impact on every actual edited function/class/method, including token generator helpers, form components and dialog behavior if changed. This audit is proposal evidence, not a blanket preauthorization for later symbol edits.

## Reconciliation with other specifications

- `docs/TRD.md` remains the architecture/business baseline: backend financial authority, integer kobo, append-only history, offline earning pending acceptance, no offline redemption.
- Review 71 established prototype references and controller/view separation, but its removal of the collapse control conflicts with newer sidebar repair. Preserve the newer implemented behavior; record a design deviation rather than reverting it.
- `role-aware-global-search-financial-lookup` remains the search and verification behavior contract. This package finishes presentation ownership without broadening its API scope.
- `accessible-component-hardening`, `financial-workflow-contracts`, session, offline and data-minimization specs remain unchanged.
- This package neither certifies other active changes nor touches preview framing, deployment configuration, or the user's in-flight frontend tooling additions.
