## Context

`docs/repo_review_55.md` describes three overlapping tracks: P0 correctness/security and deployment truthfulness, cashier UX, and frontend performance. The current web implementation confirms the coupling:

- `apps/web/components/session-bootstrap.tsx` performs client bootstrap and is consumed independently by shell and workflow components.
- `apps/web/components/workflows/cashier-transaction-route.tsx` loads public config and customer/ledger data inside the route-level client boundary.
- `apps/web/app/(shell)/cashier/page.tsx` still owns lookup state, customer reads, launch-card navigation, connection state, and overview rendering in one client surface.
- `apps/web/components/workflows/customer-workspace.tsx` owns search, selection, card management, status mutation, and ledger loading in one broad workspace; its initial search can compete with a route-selected `?id=`.
- `apps/web/components/auth/login-form.tsx` currently reads and writes the device ID and raw attestation secret in browser local storage.
- The backend already exposes customer create/update operations and backend-owned device/session contracts; this change should consume and harden those contracts rather than create frontend authority.

The implementation must preserve append-only financial behavior, integer-kobo money handling, backend authorization, the canonical shell navigation registry, and durable offline reconciliation. UI work is for an operational POS used under time pressure, not a marketing dashboard.

### Design read

Reading this as: a trust-first operational POS redesign for cashiers and supervisors, with a calm, high-clarity utility language, leaning toward a restrained ShopCity design system with compact typography, strong semantic grouping, and purposeful motion.

Dials: `DESIGN_VARIANCE 4`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 5`. The product needs hierarchy and speed more than novelty. The design must avoid dashboard slop: no decorative gradients, no repeated glass cards, no oversized hero typography, no hidden labels, and no motion that competes with transaction entry.

The locally available UI/UX Pro Max entry is catalog-only; its full upstream pattern library is not installed. We therefore use its discovery intent plus the available anti-slop and accessibility guidance rather than claiming an unavailable pattern search. Impeccable is applied as an audit/polish pass after the functional surfaces exist.

## Goals / Non-Goals

**Goals:**

- Close the P0 security and correctness gaps identified in review 55.
- Make cashier overview, Lookup, Earn, and Redeem distinct, glanceable task surfaces.
- Establish shared session/branch/device/policy context and remove duplicate route bootstrap work.
- Make frontend-safe configuration cacheable with branch/tenant-safe keys and explicit freshness behavior.
- Reduce client boundaries and produce repeatable production-build performance evidence.
- Ensure the canonical route registry, workspace links, responsive shell, device identity, and deployment evidence are truthful.
- Provide complete accessible states: loading, empty, error, disabled, success, offline, and stale/syncing.
- Keep all UI values descriptive of backend-authoritative state; never allow UI submissions to establish balances, approvals, roles, or ledger history.

**Non-Goals:**

- Replacing the backend auth/session architecture or changing financial domain authority.
- Introducing GraphQL, microservices, a new frontend framework, or a second navigation architecture.
- Redesigning every admin/supervisor screen; only shared shell and workflow surfaces are in scope.
- Treating localStorage as acceptable for raw device secrets; durable offline transaction data remains a separate approved storage concern.
- Declaring performance success from dev-server measurements or a single aggregate bundle number.

## Decisions

### 1. Use one shared operational context above shell routes

Create a client provider at the authenticated shell boundary that owns one request lifecycle for session, user, role, branch, device, tenant, and frontend-safe policy configuration. Expose a typed context hook to shell and workflow components. The provider must distinguish loading, authenticated, unauthenticated, unavailable, and stale policy states.

**Why:** It eliminates repeated `/auth/me` and `/config/public` work without scattering cache logic through each page. It also gives the shell and Offline Earn one authoritative device identity.

**Alternative rejected:** Passing a large prop object through every route. This would preserve request duplication and make deep workflow composition brittle.

### 2. Use a tenant/branch-scoped stale-while-revalidate cache for public config

Implement a small cache adapter at the shared context boundary. The cache key must include tenant and branch scope; cached values must be frontend-safe policy data only. Use five-minute freshness and thirty-minute stale-while-revalidate as initial policy, with invalidation after branch/policy mutations where the app can identify them. A stale value may render with an explicit stale indicator while revalidation runs; an unavailable first load must not silently render authoritative-looking policy values.

**Alternative rejected:** A global unscoped singleton. It risks cross-branch policy leakage.

### 3. Keep server composition static and isolate interactive islands

Each cashier route should compose a small static shell/header/context summary and a focused client island for lookup or transaction entry. Shared forms must receive typed context and callback contracts rather than loading policy/session independently. Customer, sync, and shell surfaces follow the same boundary rule where measurable.

**Alternative rejected:** Converting every component to a Server Component regardless of interaction. The goal is smaller client boundaries and fewer requests, not a framework-label migration.

### 4. Design cashier workflows around one job per screen

- Overview: orient and choose a next task.
- Lookup: identify a customer/card and choose Earn, Redeem, or Customer.
- Earn: enter purchase amount, explain expected credit, review, confirm.
- Redeem: show available credit and applicable limit, review, confirm.

Use a consistent layout grammar: compact page header, one primary action region, one contextual summary, inline status feedback, and a secondary details disclosure. Use borders/dividers and spacing for grouping; cards are reserved for selected customer context, actionable queue status, or a confirmation boundary.

**Alternative rejected:** Keeping one polymorphic megascreen with hidden sections. It makes the visual hierarchy and hydration boundary track the largest possible workflow.

### 5. Treat device provisioning as a one-time secret ceremony

The backend remains the only issuer and verifier. The UI may display a newly issued secret exactly once in a controlled provisioning screen, offer an explicit copy action, warn that the value cannot be recovered from the browser, and clear component state on completion/navigation. Do not write the raw secret to localStorage, sessionStorage, URL parameters, analytics, logs, or query strings. Normal cashier login should use the backend-owned device/session association and return the device ID through the session bootstrap.

**Alternative rejected:** Encrypting a browser-local raw secret. Browser XSS/storage extraction still makes persistent secret material an unsafe trust boundary.

### 6. Preserve route-selected customer identity until it resolves

On Customer workspace mount, read `?id=` first. Set a route-selection lock while the selected customer is loading. The initial list request may populate candidate results, but it must not replace a non-empty route-selected ID. If the selected ID is invalid, show a clear not-found/error state and allow intentional search selection. Any selected customer change must be explicit user action or an explicit route change.

**Alternative rejected:** Delaying all search until the selected detail request completes. It makes the screen feel blocked and is unnecessary if selection writes are guarded.

### 7. Use explicit workspace modes, not pathname inference

Shared Customer/Card/Transaction/Approval/Fraud workspaces receive explicit capability/mode props from role pages. Shared components may expose actions only when a capability is granted; they must not infer role from pathname. Shared workflows link to canonical shell destinations or accept a route callback from the owning page.

**Alternative rejected:** Continuing cross-role page imports or inspecting `window.location.pathname`; both make reuse and authorization intent opaque.

### 8. Use performance evidence as a release artifact

Build and serve the production web app. Capture route-level document/RSC/JS bytes, Web Vitals, hydration, request counts, and timing data through a deterministic Playwright/performance harness. Store machine-readable evidence with environment, commit SHA, route, browser, and timestamp. Fail or mark the gate explicitly when limits are exceeded; never overwrite a failed measurement with a guessed baseline.

**Alternative rejected:** Treating the 478 KB review observation as the only metric. It lacks transfer-type and route attribution.

### 9. Use a restrained, accessibility-first motion and visual system

Use existing project tokens and components where possible. Choose one accent and semantic status colors with WCAG contrast. Motion is limited to feedback and hierarchy: focus/active states, drawer transitions, and optional short route-entry reveals. All non-essential motion honors `prefers-reduced-motion`. Use real loading skeletons that match the final shape, inline errors, empty-state next actions, and no decorative infinite animation.

**Alternative rejected:** Adding a new component library or visual theme during stabilization. It would increase payload and review surface.

### 10. Phase the rollout around reversible seams

Phase boundaries are API- and route-compatible:

1. Baseline/evidence harness.
2. Security, deep-link, customer mutation, and shared-route corrections.
3. Shared context/cache and shell consumption.
4. Overview/Lookup UI decomposition.
5. Earn/Redeem/device-bound login and offline readiness.
6. Client-boundary and payload optimization.
7. CI/deployment/topology evidence.
8. Full regression and release gate.

Each phase must leave the branch buildable and testable. Revert context/cache and visual slices independently if stale policy or session behavior is detected.

## Risks / Trade-offs

- **[Risk] Shared context introduces stale session or policy state.** → Include explicit freshness/status metadata, invalidation hooks, logout reset, branch/tenant-safe cache keys, and tests for stale/error transitions.
- **[Risk] Removing localStorage secret fallback blocks existing devices.** → Ship provisioning/recovery UX and backend readiness checks first; do not silently downgrade to a fingerprint or browser placeholder.
- **[Risk] Smaller client islands create prop/API churn.** → Define typed workflow context models and migrate one route at a time with contract tests.
- **[Risk] Customer deep-link guard leaves stale detail visible during route changes.** → Clear detail only on explicit route ID change or invalidation, show a loading boundary, and test rapid navigation.
- **[Risk] Cache hides a branch policy update.** → Invalidate on known mutations, expose stale state, and keep transaction submission authoritative on the backend.
- **[Risk] Performance thresholds vary by environment.** → Record environment and use stable local CI thresholds plus a separately labeled staging target; do not compare incomparable runs.
- **[Risk] UX simplification hides information needed for exception handling.** → Use progressive disclosure and role/capability-specific detail panels rather than deleting audit-relevant context.
- **[Risk] Duplicate Vercel context is outside source control.** → Record the canonical project/deployment identity and create an operational cleanup evidence item; do not pretend a repository-only edit disconnects a remote project.
- **[Risk] Scope is large enough to become another indefinite backlog.** → Enforce phase exit criteria and the shared release gate; gaps discovered outside the listed surfaces become a separate proposal.

## Migration Plan

1. Capture baseline evidence and freeze the current route/test inventory.
2. Add regression tests for secret persistence, customer deep links, canonical links, customer create/update, and device identity before changing implementation.
3. Introduce shared context in compatibility mode; keep existing consumers behind an adapter while migrating routes.
4. Migrate overview and Lookup, then Earn and Redeem, preserving backend request contracts.
5. Remove obsolete route-level bootstrap/config calls and localStorage secret code only after device provisioning tests pass.
6. Enable cache and client-boundary reductions behind evidence-producing tests; invalidate/remove the adapter once all consumers use context.
7. Re-run production build, browser/a11y/visual/E2E suites, Semgrep, lint, typecheck, backend tests, and deployment checks.
8. Roll back by phase if any authoritative-session, policy-freshness, device-attestation, or financial workflow regression is detected.

## Open Questions

- Which supported POS provisioning channel is approved for delivering the one-time secret to a physical device (admin screen, QR, managed device enrollment, or another controlled channel)?
- Is the canonical deployment target `shopcity-lp.vercel.app` still the intended frontend evidence source, and who has access to disconnect the duplicate Vercel project?
- What staging environment can provide stable region/topology and Web Vital measurements without Vercel authentication interstitials?
- Should recent activity on cashier overview use an existing bounded ledger/read endpoint or remain a compact sync queue summary until a dedicated endpoint is approved?
- What exact policy/branch mutation events are available to trigger frontend cache invalidation?
