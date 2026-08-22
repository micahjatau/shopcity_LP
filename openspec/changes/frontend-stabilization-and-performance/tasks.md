## 1. Baseline, inventory, and release evidence contract

- [x] 1.1 Run GitNexus impact analysis for the shared shell, session bootstrap, cashier workflow route, customer workspace, login/device provisioning, and navigation registry symbols; record blast radius in `docs/development/gitnexus-impact-tracker.md` before implementation edits.
- [x] 1.2 Freeze the route matrix and current behavior inventory for `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, `/cashier/sync`, `/supervisor/approvals`, `/admin/operations`, Customer, Card, and Transaction workspaces.
- [x] 1.3 Add a production-build performance harness that records route, commit SHA, environment, browser, timestamp, document/RSC/JS bytes, TTFB, FCP/LCP, INP, hydration duration, total API calls, `/auth/me`, `/config/public`, and duplicate requests.
- [x] 1.4 Capture the pre-change baseline with `npm --prefix apps/web run build` and production start; store evidence without converting missing metrics into passes.
- [x] 1.5 Document frontend runtime, API/backend, and Supabase/database regions for the baseline environment and identify any cross-region hop that affects cashier workflows.
- [x] 1.6 Define exact-head CI and canonical deployment evidence fields, including candidate SHA, canonical Vercel project/deployment, excluded duplicate context, and exception ownership.

## 2. P0 device security and provisioning

- [ ] 2.1 Run the existing auth/device GitNexus context and inspect backend provisioning/rotation contracts, DTOs, audit events, and generated OpenAPI bindings before changing the UI.
- [x] 2.2 Remove all raw device attestation secret reads/writes from `localStorage`, `sessionStorage`, URL state, analytics, and ordinary browser logs.
- [ ] 2.3 Implement the controlled one-time POS provisioning surface: secret-once presentation, explicit copy action, warning/recovery copy, completion state, and transient state clearing on completion/unmount/navigation.
- [ ] 2.4 Ensure normal cashier login consumes the backend-owned device/session association and exposes the authenticated device ID through the shared session bootstrap.
- [ ] 2.5 Add device-unready gating for Offline Earn and sync queue creation; reject undefined, browser-generated, or session-label-derived device context.
- [ ] 2.6 Add unit, browser, and security tests proving raw secrets never enter browser storage or URL state and are cleared after provisioning.
- [ ] 2.7 Add end-to-end coverage for provisioned POS sign-in, device rotation/re-authentication, missing-device recovery, and Offline Earn readiness.

## 3. Customer correctness and role-safe workflows

- [ ] 3.1 Run GitNexus impact analysis for CustomerWorkspace, customer controller/service create/update methods, transaction workspace links, and shared navigation before editing affected symbols.
- [x] 3.2 Fix Customer workspace deep-link selection so `?id=` wins over the initial list-search result while the selected detail request is pending; add invalid-ID and explicit user-selection behavior.
- [x] 3.3 Add Supervisor/Admin customer registration UI using the existing `POST /api/v1/customers` contract, with backend validation feedback and no frontend authority fields.
- [x] 3.4 Add Supervisor/Admin customer profile editing UI using the existing `PATCH /api/v1/customers/:id` contract, preserving authoritative status/balance/role boundaries.
- [x] 3.5 Separate Customer and Card workflow intent through explicit workspace modes/capabilities and remove near-duplicate megasurface content.
- [x] 3.6 Remove hard-coded `/supervisor` or `/admin` links from shared Transaction, Customer, Card, Approval, and Fraud workspaces; use canonical registry destinations or explicit route callbacks.
- [x] 3.7 Add tests for customer deep-link race, create/update success and validation failure, role capability visibility, and shared workspace route neutrality.

## 4. Shared session, branch, device, and policy context

- [x] 4.1 Run GitNexus impact analysis for `useSessionBootstrapState`, `bootstrapSession`, `AppShell`, cashier routes, and any policy/config consumers before introducing the provider.
- [x] 4.2 Define typed shared context states for session, user, role, branch, device, tenant, policy, freshness, stale-while-revalidate, and unavailable outcomes.
- [x] 4.3 Add the provider at the authenticated shell boundary with logout/reset and branch/tenant scope transitions.
- [x] 4.4 Migrate AppShell, SessionBootstrap, cashier sync, cashier workflow routes, and relevant supervisor/admin surfaces to consume shared context.
- [x] 4.5 Remove route-level `/auth/me` and `/config/public` requests that only reconstruct fresh shared context; retain explicit refresh only for invalidation or recovery.
- [x] 4.6 Implement tenant/branch-safe public-config caching with five-minute freshness, thirty-minute stale-while-revalidate, single-flight revalidation, stale indicator, and mutation invalidation hooks.
- [x] 4.7 Add tests for provider loading/auth/error/stale states, branch/tenant cache isolation, logout reset, cache invalidation, and zero duplicate bootstrap requests on warm navigation.

## 5. Canonical shell and navigation cleanup

- [x] 5.1 Run GitNexus impact analysis for `shellNavigationByRole`, AppShell navigation rendering, dashboard quick actions, and route-resolution tests before editing.
- [x] 5.2 Remove remaining page-local primary navigation maps and make dashboard quick actions a deliberate subset or projection of the canonical registry.
- [x] 5.3 Verify every visible role navigation href resolves to an actual page and add/maintain the route-resolution test for all roles.
- [x] 5.4 Finish real collapsed rail behavior with reduced width, stable icon slots, accessible labels/tooltips, active-state styling, and keyboard operation.
- [x] 5.5 Make tablet default to the rail layout and confirm the main content width and focus order remain usable.
- [x] 5.6 Harden the mobile drawer as a modal interaction with focus trap, Escape handling, return focus, inert background, scroll containment, and shell skip link.
- [x] 5.7 Reduce the topbar to compact operational context without hiding connection, sync, branch, or device status needed for a cashier.
- [x] 5.8 Add desktop-expanded, desktop-collapsed, tablet-rail, and mobile-drawer visual/a11y regression coverage in light/dark modes where supported.

## 6. Cashier overview and Lookup redesign

- [x] 6.1 Run GitNexus impact analysis for the cashier page, cashier workflow route, scanner context, offline indicators, and workflow UI primitives before editing.
- [x] 6.2 Replace the cashier overview megascreen with a static composition containing branch/device/connection context, sync queue summary, recent activity, and three primary actions: Earn, Redeem, Find customer.
- [x] 6.3 Remove embedded detailed lookup, full policy tables, UUIDs, developer explanations, and duplicated navigation from `/cashier`.
- [x] 6.4 Decompose `/cashier/lookup` into a focused lookup client island with scan/type input, shape-matched loading, empty/error states, minimal selected customer/card summary, and explicit Earn/Redeem/Customer actions.
- [x] 6.5 Ensure Lookup context can deep-link into Earn/Redeem without relying on overview-local React state and preserves card/customer context through route parameters or shared workflow context.
- [x] 6.6 Add browser and visual tests for overview and Lookup success, empty, failure, offline, narrow viewport, keyboard, and reduced-motion states.

## 7. Earn, Redeem, Sync, and Offline UX redesign

- [x] 7.1 Run GitNexus impact analysis for `CashierWorkflowRoute`, `EarnTransactionForm`, `RedeemTransactionForm`, sync page, offline persistence, and scanner scope before editing.
- [x] 7.2 Refactor Earn into static page composition plus a small interactive form island showing customer/card, purchase amount, contextual earn rate, expected credit, review, submit, and authoritative result.
- [x] 7.3 Refactor Redeem into static page composition plus a small interactive form island showing customer/card, available credit, basket amount, maximum redemption, review, submit, and authoritative result.
- [x] 7.4 Remove broad policy/configuration tables from Earn/Redeem and retain only values that explain the active transaction or an actionable restriction.
- [x] 7.5 Add complete loading, validation, disabled, server-error, success, offline, queued, and sync-failure states without claiming server confirmation for local queueing.
- [x] 7.6 Migrate sync page to shared session/device context and remove localStorage/session-label fallback logic.
- [x] 7.7 Verify IndexedDB/durable offline persistence retains idempotency, branch, device, and sync context but never raw device secrets.
- [x] 7.8 Add real-UI E2E tests for Earn, Redeem, Offline Earn save, reconnect/sync, duplicate submission protection, and authoritative server outcomes.

## 8. Client-boundary and payload optimization

- [x] 8.1 Measure the baseline and use bundle/request evidence to prioritize `cashier/page.tsx`, `cashier-transaction-route.tsx`, `customer-workspace.tsx`, and `cashier/sync/page.tsx` rather than refactoring by file size alone.
- [x] 8.2 Move static headers, summaries, policy explanations, and route composition out of client boundaries where they do not require browser state.
- [x] 8.3 Keep scanner input, transaction forms, drawer controls, and other interactive behavior in isolated client islands with typed props/context.
- [x] 8.4 Remove duplicated generated-client calls and shared helper imports introduced only by the old megascreens.
- [x] 8.5 Rebuild and remeasure the route matrix; attribute changes to document/RSC/JS transfer, API counts, hydration, LCP, and INP.
- [x] 8.6 Meet the below-150-KB warm navigation target or record an evidence-backed exception with the responsible owner and next action.

## 9. API, OpenAPI, and generated client alignment

- [x] 9.1 Confirm customer create/update, auth/session/device, config/public, card lookup, ledger, earn, redeem, and sync contracts in OpenAPI before changing consumers.
- [x] 9.2 Regenerate the OpenAPI export and web client with the repository CLI after any contract change; do not hand-edit generated client output.
- [x] 9.3 Add contract tests proving frontend forms map only approved request fields and cannot submit balances, roles, approvals, or ledger authority.
- [x] 9.4 Verify error statuses and response shapes used by loading/error states against backend integration tests.

## 10. Deployment, topology, and exact-head certification

- [ ] 10.1 Inspect the canonical Vercel project and duplicate context; disconnect or explicitly mark the stale duplicate project through the approved operational path.
- [ ] 10.2 Align CI workflows so lint, typecheck, build, Semgrep, unit/integration, affected Playwright, performance, and release evidence checks run against one exact candidate SHA.
- [ ] 10.3 Update deployment evidence with canonical project/deployment ID, commit SHA, runtime regions, and excluded duplicate context.
- [ ] 10.4 Compare frontend runtime, backend, and Supabase/database placement; document any accepted latency or region mismatch and mitigation.
- [ ] 10.5 Add the release-evidence verifier checks for missing SHA, mixed deployment identity, missing performance metrics, and undocumented exceptions.
- [ ] 10.6 Verify Docker/worker/backend release behavior remains unaffected by frontend-only optimization and no unsupported Vercel function architecture is introduced.

## 11. Full verification, review, and documentation reconciliation

- [ ] 11.1 Run formatting, lint, typecheck, build, generated-client typecheck, unit tests, integration tests, Semgrep, affected Playwright/a11y/visual tests, and production performance evidence.
- [ ] 11.2 Run `gitnexus detect_changes()` and confirm only expected symbols, flows, tests, docs, and deployment evidence are affected.
- [ ] 11.3 Run OpenSpec validation and check each requirement scenario against implementation evidence.
- [ ] 11.4 Reconcile `docs/repo_review_55.md`, release evidence, deployment notes, performance artifacts, and migration/operational trackers with the actual branch state.
- [ ] 11.5 Review the UI using the design-taste anti-slop pass and Impeccable audit: hierarchy, density, type scale, contrast, focus, responsive behavior, reduced motion, copy clarity, and absence of decorative noise.
- [ ] 11.6 Record durable Graphiti memory for validated architecture decisions, device-secret handling, shared-context/cache behavior, and performance measurement lessons.
- [ ] 11.7 Produce the final stabilization report listing changed surfaces, passed gates, exceptions, remaining risks, exact candidate SHA, canonical deployment, and next action.
