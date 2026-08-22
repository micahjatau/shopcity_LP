## Why

ShopCity's current frontend has reached the point where correctness, trust, performance, and cashier usability are coupled release concerns rather than independent review backlogs. `docs/repo_review_55.md` identifies P0 correctness/security gaps (including browser persistence of device attestation secrets and a customer deep-link race), duplicated session/config work that inflates route payloads, and cashier surfaces that expose diagnostic context instead of helping a cashier complete one task quickly.

This change establishes one coordinated frontend stabilization program with three implementation tracks and one release gate. It preserves the existing backend-first and canonical-shell architecture while closing the remaining trust-boundary defects, making the cashier workflows task-focused, reducing duplicated route work, and producing measurable evidence for deployment and performance decisions.

## What Changes

### Track A — Correctness, security, and truthful routing (P0)

- Remove persistent raw device attestation secrets from `localStorage` and define a secure POS provisioning flow that presents a newly issued secret once, supports secure copy/recovery behavior, and clears transient plaintext from browser state.
- Keep device identity session-owned and device-bound; do not silently fall back to browser-local identifiers or invented device labels for Offline Earn.
- Preserve a customer selected by `?id=` while the initial customer search is loading; a background search must not replace a route-selected customer.
- Expose the existing backend customer create and update contracts to Supervisor/Admin workflows with explicit permissions, validation, optimistic feedback only after authoritative responses, and no frontend-owned balances or roles.
- Remove role-specific links from shared Transaction workspaces and make workflow actions resolve through canonical shell navigation or explicit capability props.
- Differentiate Customer and Card workflows by intent and information hierarchy instead of maintaining near-duplicate megasurfaces.
- Remove remaining page-local navigation registries and ensure shell navigation remains the only primary route map.
- Remove, disconnect, or document the stale duplicate Vercel project context so deployment evidence cannot report a misleading second failure.
- Require exact-head CI and canonical deployment evidence before the stabilization program can be declared releasable.

### Track B — Cashier task UX and accessibility

- Replace the cashier overview megascreen with a calm operational launch surface: branch/device/connection context, three primary actions (Earn, Redeem, Find customer), sync queue status, and recent activity.
- Make `/cashier/lookup` the focused entry point for scan/type, customer identity, card status, available balance, and next actions.
- Make `/cashier/earn` show only customer/card context, purchase amount, contextual earn rate, expected credit, review, and authoritative confirmation.
- Make `/cashier/redeem` show only customer/card context, available credit, basket amount, applicable maximum, review, and authoritative confirmation.
- Keep detailed policy/configuration values out of normal cashier task surfaces; disclose only values needed to explain the current transaction or an actionable exception.
- Provide complete loading, empty, error, disabled, confirmation, and offline/sync states for cashier workflows.
- Preserve accessible focus order, visible keyboard focus, semantic headings/labels, minimum touch targets, reduced-motion behavior, and clear contrast in expanded, collapsed, tablet, and mobile shell states.
- Use a restrained, operational visual language: one ShopCity accent, compact typography, purposeful grouping instead of decorative card repetition, and motion only for hierarchy, feedback, or state transition.

### Track C — Performance, shared context, and deployment topology

- Establish a production-build baseline for `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, `/supervisor/approvals`, and `/admin/operations`.
- Record document/HTML bytes, RSC transfer, JavaScript transfer, TTFB, FCP/LCP, INP, hydration duration, total API calls, `/auth/me` calls, and `/config/public` calls.
- Introduce one shared application context above shell routes for session, user, role, branch, device, tenant, and frontend-safe policy data.
- Eliminate route-level duplicate `useSessionBootstrapState()`/`/auth/me` work where the shared context already contains the data.
- Cache frontend-safe public configuration with tenant/branch-aware keys, approximately five-minute freshness and thirty-minute stale-while-revalidate behavior, plus explicit invalidation when relevant branch/policy state changes.
- Split oversized client boundaries into server-rendered composition and small interactive islands, prioritizing cashier overview, cashier transaction routes, Customer workspace, and cashier sync.
- Measure browser-to-proxy-to-backend-to-database topology and document whether Vercel/Next, backend, and Supabase regions are aligned well enough for pilot workflows.
- Establish initial performance gates of below 150 KB warm navigation payload, zero warm-route `/auth/me` and `/config/public` refetches, no duplicate API calls, warm route usability below 500 ms where the environment permits, LCP below 2.5 s, and INP below 200 ms. Record exceptions with evidence rather than weakening gates silently.

### Shared release gate

A stabilization release is valid only when:

- P0 correctness/security behaviors are covered by automated tests.
- Cashier flows are task-focused, accessible, and visually reviewed at desktop, tablet, and mobile sizes.
- Device-bound login and Offline Earn work through the real UI path.
- Performance measurements use a production build and show the agreed target or a documented, approved exception.
- Exact-head CI is green and the canonical deployment is the only release evidence source.
- OpenSpec, review documentation, performance evidence, and deployment evidence agree with the implementation.

### Explicit non-goals

- No GraphQL, microservices, or alternate frontend shell architecture.
- No replacement of backend authorization with frontend capability checks.
- No frontend-authored balances, roles, approvals, ledger entries, or policy authority.
- No broad visual redesign of unrelated admin/supervisor workflows beyond the shared shell and components needed for consistency.
- No production optimization claims based solely on development-mode measurements.

## Capabilities

### New Capabilities

- `cashier-task-workflows`: Focused Lookup, Earn, Redeem, and cashier overview experiences with explicit state and accessibility contracts.
- `frontend-performance-observability`: Production-build route-size, request-waterfall, Web Vital, hydration, and topology measurement with release thresholds.
- `pos-device-provisioning`: Secure one-time POS device secret presentation, transient handling, session binding, and recovery/rotation UX.
- `shared-frontend-context`: Shared session, branch, device, tenant, and cached policy context that prevents duplicate route bootstrap work.

### Modified Capabilities

- `cashier-data-minimization`: Extend the existing requirement from reduced payload fields to task-specific cashier information hierarchy and contextual policy disclosure.
- `durable-offline-persistence`: Clarify that durable offline transaction drafts may use approved durable storage, but raw device attestation secrets must never be persisted in browser local storage.
- `frontend-shell-routing`: Require no role leakage from shared workspaces, no page-local primary route maps, and complete route resolution from the canonical shell registry.
- `session-gated-shells`: Require the authenticated device identity to be surfaced from the backend-owned session and reused by Offline Earn without browser placeholder fallbacks.
- `workflow-coverage-expansion`: Add customer create/update, deep-link race, device provisioning, focused cashier workflows, performance instrumentation, and visual/accessibility regression coverage.
- `frontend-release-evidence`: Add exact-head CI, canonical deployment identity, production-build performance evidence, and region/topology evidence to the release gate.
- `accessible-component-hardening`: Apply the shell and cashier accessibility requirements to keyboard focus, touch targets, loading/error states, reduced motion, contrast, and mobile drawer behavior.

## Impact

### Frontend code

- `apps/web/app/(shell)/cashier/**`
- `apps/web/components/workflows/cashier-transaction-route.tsx`
- `apps/web/components/workflows/customer-workspace.tsx`
- `apps/web/components/session-bootstrap.tsx`
- `apps/web/components/app-shell.tsx`
- `apps/web/components/shell-navigation.ts`
- `apps/web/components/auth/login-form.tsx`
- cashier sync, offline, scanner, policy, and shared UI components
- route, browser, a11y, visual-regression, and performance tests

### Backend/API contracts

- Existing `POST /api/v1/customers` and `PATCH /api/v1/customers/:id` contracts and their generated web client bindings.
- Existing auth/device session and POS provisioning contracts; any contract adjustment must remain backend-owned and OpenAPI-first.
- Existing `/api/v1/auth/me` and `/api/v1/config/public` contracts, with caching and shared consumption rather than duplicated route fetches.

### Infrastructure and operations

- CI workflows and exact-head release checks.
- Canonical Vercel project/deployment metadata and stale duplicate project context.
- Production-build measurement harness, browser performance evidence, and deployment-region documentation.
- Supabase/backend/database topology evidence where runtime latency or auth/config behavior depends on deployment placement.

### Risk and rollout

The change is intentionally phased so correctness/security blocks release while UX and performance work can proceed behind measured checkpoints:

1. Baseline and evidence contract.
2. P0 security, customer correctness, and routing fixes.
3. Shared shell/session/config context.
4. Cashier overview and Lookup redesign.
5. Earn/Redeem and offline/device UX completion.
6. Client-boundary decomposition and cache/performance optimization.
7. Infrastructure/deployment cleanup and exact-head certification.
8. Cross-mode visual, accessibility, E2E, performance, and OpenSpec verification.

Rollback is feature-slice based: retain existing backend contracts, keep old route compositions available behind controlled commits until their focused replacements pass workflow tests, and revert cache/context changes independently if they increase stale or incorrect policy/session behavior.
