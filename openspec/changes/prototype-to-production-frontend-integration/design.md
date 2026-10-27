# Design: Prototype-to-production frontend integration

## Context

`docs/repo_review_70.md` identifies a mismatch between a visually improved static prototype and a mature but older React application. The React application owns the security and domain integrations. The prototype must therefore be treated as design input, not as an implementation to extend.

The change spans UI migration, a small number of truthful contract decisions, role-safe product coverage, repository cleanup, and release certification. It must not weaken backend trust boundaries while making the common cashier path faster and clearer.

## Goals

- One production frontend implementation.
- Prototype visual language on the existing React route and component architecture.
- Verified card context before every Earn/Redeem operation.
- Honest customer, activity, session, offline, and authorization behavior.
- Role-complete Supervisor/Admin experiences using shared, capability-aware workspaces.
- Evidence that protects financial correctness, accessibility, and release lineage.

## Non-Goals

- Reimplementing session, CSRF, idempotency, scanner, offline, or RBAC logic in browser scripts.
- Broad backend redesign unrelated to a demonstrated contract gap.
- Removing mature React capabilities merely to match the smaller prototype.
- Calling a static design harness production functionality.

## Prototype/React parity model

### Definition of parity

Parity is a controlled translation from a design reference to a production route, not a pixel-copy exercise. The prototype defines the intended visual hierarchy and interaction emphasis. React remains responsible for routing, data fetching, session state, authorization, typed API responses, scanner input, offline persistence, reconciliation, and all financial safeguards.

For each screen, implementation should be reviewed in four layers:

1. **Visual parity:** the same primary action, content hierarchy, density, typography roles, color semantics, icon affordances, responsive layout, and empty-space rhythm at the approved breakpoints.
2. **Interaction parity:** the same user journey and affordance sequence, including focus order, cancel/back behavior, confirmation points, keyboard-wedge scanner input, mobile navigation, and recovery paths.
3. **Contract parity:** every displayed or submitted value maps to a real DTO/client method, with server-owned values clearly separated from draft input; no prototype fixture or guessed field may survive.
4. **Operational parity:** the production route retains role/tenant/branch/device/session scope, CSRF/idempotency, offline/retry behavior, accessibility, telemetry/evidence, and truthful error/pending states.

A parity record is complete only when it names the prototype asset, React route/component owner, data authorities, permitted roles, responsive states, test selectors, and evidence artifacts. A screenshot comparison alone is insufficient.

### Screen migration matrix

| Screen          | React composition                                          | Must preserve                                     | Must correct or add                                                            |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Login           | Auth route + session provider                              | Focused sign-in, role-aware redirect              | Real logout, recovery contract, session errors, no dead links                  |
| Overview        | Cashier shell + launcher + bounded activity                | Quick actions, compact branch/device/sync context | No embedded forms, no fake health/notifications, honest activity scope         |
| Lookup          | Scanner input + card lookup + masked customer result       | Search/discovery and result context               | Scanner wiring, authoritative card verification, safe deep links               |
| Earn            | Verified-card workflow + generated client                  | Receipt and purchase entry hierarchy              | Real serial, integer kobo, idempotency, pending/duplicate/offline/error states |
| Redeem          | Verified-card workflow + balance/policy context            | Redemption task hierarchy                         | Server-owned balance/policy, approval/insufficient outcomes, retry handling    |
| Sync            | Offline queue/reconciliation workspace                     | Queue summary and recovery priority               | Authenticated device context, real reconciliation state, no manual IDs         |
| Transactions    | Existing transaction workspace or new scoped history route | Filter/detail intent                              | Honest scope, real pagination or no pagination, authoritative audit/reversal   |
| Registration    | Supervisor/Admin customer workspace                        | Clear creation form                               | RBAC, persisted fields only, explicit card assignment, truthful consent        |
| Workflow states | Test-only harness                                          | Developer diagnostic value                        | Remove from production navigation and split role-specific concepts             |

### Route-level parity checklist

Before a route is declared migrated, reviewers must verify:

- The route is reachable from the canonical role navigation and direct deep links behave safely.
- The first visible task matches the prototype's intent without hiding required operational context.
- Every control has a real handler, or is visibly non-interactive; no `#logout`, dead recovery, decorative search, or fake notification control remains.
- API data is loaded through the generated client or an explicitly reviewed typed adapter.
- Server-owned values cannot be overwritten by query parameters, local storage, fixture data, or form defaults.
- Loading, empty, unauthorized, offline, validation, conflict, pending, success, and unexpected-error states are designed at the same quality level as the happy path.
- Desktop, tablet, and mobile layouts are intentional; mobile navigation traps focus and restores it predictably.
- Keyboard and screen-reader order follows the visual task order, touch targets are usable, and sensitive cashier data remains masked.
- Unit/contract, accessibility, Playwright, and visual evidence pass for the route.

## Decisions

### 1. React is the only production frontend

Prototype HTML/CSS/JS remains reference material until a route reaches parity. New production behavior is implemented in `apps/web/app`, `apps/web/components`, and shared typed client/session modules. Once parity is accepted, duplicate root-level artifacts are deleted and the remaining reference is either retained in one documented location or removed.

### 2. Card lookup is the financial workflow boundary

The lookup state machine is:

```text
scan or enter serial
  -> GET /cards/lookup/{serial}
  -> verify authoritative card/customer projection
  -> render eligibility and balance from server
  -> submit Earn/Redeem with verified serial and idempotency key
  -> render typed result state
```

Directory search can locate a customer for non-financial navigation, but it cannot unlock Earn/Redeem without a subsequent card lookup. URL customer IDs are hints only and never establish authorization, balance, or eligibility.

### 3. Registration is Supervisor/Admin-only and atomic

Cashier will not see customer registration. The TRD assigns registration to Supervisor/Admin and defines the flow as full name, normalized phone, unused card barcode, atomic customer/card creation, audit event, and optional registration SMS. The production form therefore submits only the approved MVP contract. Birthday, consent, marketing, and consent/version fields are removed rather than collected and discarded; adding them requires a TRD amendment, schema design, API contract, and legal/operational approval.

The operation must have one idempotency boundary, one truthful success state, and rollback behavior that cannot leave the UI claiming a card exists when the transaction rolled back.

### 4. Activity stays bounded for the MVP

The cashier overview continues to use the bounded cashier-today feed for lightweight metrics and labels it honestly. The TRD does not define a cashier transaction-history endpoint; it defines transaction detail, paginated customer ledger/audit access, and management reports. This change will remove fake browser pagination and present the feed as recent/loaded activity. A full transaction-history workspace is a later, separately specified API change.

### 5. Session and device state stay backend-owned

Logout calls the real session invalidation contract. Expiry returns the user to the session-required state and clears local sensitive workflow state. Cashier Offline Earn reads device, branch, and actor context from the authenticated session/bootstrap contract. No production form accepts manually typed identity values.

### 6. Shared workspaces expose capabilities, not roles by inheritance

Customer, Card, Transaction, Approval, Fraud, Reporting, and Operations workspaces are shared components with explicit capability props and server-enforced route guards. Supervisor and Admin pages compose these workspaces; they do not import or repurpose Cashier page implementations. The developer workflow harness is kept separate and role-neutral only where safe.

### 7. Policy configuration is a product capability

Add validated Admin-only policy read/write endpoints, audit records, optimistic concurrency/version checks, tenant/branch scope enforcement, and an Admin configuration screen. The generated client and UI must display the authoritative persisted version and conflict outcome. Policy values remain backend-owned and are never accepted from cashier or ordinary client workflow submissions.

### 8. Release certification is a gate, not UI decoration

Prototype parity cannot be called complete while the release candidate lacks evidence for duplicate-receipt correctness, authenticated report isolation/performance, worker plus real SMS terminal state, and final exact-SHA certification. These gates remain linked to the existing release OpenSpec changes and are recorded as dependencies rather than hidden inside visual tests.

## Route and capability map

| Design source     | Production route                                    | Required behavior                                               |
| ----------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Login             | `/login`                                            | real login, role redirect, recovery contract, logout            |
| Overview          | `/cashier`                                          | launcher, authoritative today activity, shell context           |
| Find customer     | `/cashier/lookup`                                   | scanner/card lookup first, masked projection, safe discovery    |
| Capture purchase  | `/cashier/earn`                                     | verified card context, receipt/amount validation, typed outcome |
| Redeem credit     | `/cashier/redeem`                                   | verified card/balance context, policy/error outcome             |
| Sync              | `/cashier/sync`                                     | authenticated device queue, reconciliation and recovery         |
| Transactions      | existing role workspace or new scoped history route | honest bounded or cursor-paginated history, real detail/audit   |
| Register customer | Supervisor/Admin customer workspace                 | persisted fields, explicit card assignment                      |
| Workflow states   | test/developer harness only                         | no mixed-role production page                                   |

## Phased migration

### Phase 1: Contracts and decisions

Inventory current generated client methods, session bootstrap, scanner/offline state, role capabilities, route coverage, and backend DTOs. Resolve registration ownership, consent persistence, card assignment semantics, activity scope, and policy configuration ownership before visual migration.

### Phase 2: Cashier critical path

Port prototype styling into the React shell and cashier routes. Implement scanner-first authoritative card lookup, verified Earn/Redeem handoff, offline device context, typed outcomes, logout/expiry, and honest activity labels. Add route, contract, accessibility, and visual tests.

### Phase 3: Role-complete workspaces

Apply the design system to existing Supervisor/Admin surfaces. Fill the missing UX for card/customer lifecycle, reversals, adjustments, approvals, fraud, reports, SMS/operations, users, devices, branches, and reconciliation. Add shared workspace capability tests and remove mixed-role assumptions.

### Phase 4: Additive backend contracts

Only where Phase 1 confirms a gap, add cursor history, audited policy mutation, consent persistence, or transactional customer-plus-card issuance. Regenerate OpenAPI and the typed client; add contract and integration tests. Keep all financial writes integer-kobo, idempotent, append-only, and server-authoritative.

### Phase 5: Cleanup and certification

Remove duplicate prototype artifacts after parity, run static/security/accessibility/visual checks, execute affected workflows, and complete the existing #39–#42 runtime certification evidence on one exact candidate SHA.

## Risks and mitigations

- **Financial context regression:** require card-lookup state and backend contract tests before enabling Earn/Redeem.
- **RBAC leakage:** test every route/API with Cashier, Supervisor, Admin, wrong branch, and wrong tenant fixtures.
- **Prototype visual churn:** use stable semantic selectors and route-level visual snapshots.
- **Scope expansion:** keep additive backend work behind explicit contract tasks and do not rewrite mature domain services.
- **False release confidence:** make runtime evidence and exact-SHA lineage blocking acceptance criteria.
- **Data/privacy exposure:** preserve masked cashier projections and prohibit client-side authority fields.

## Rollback

Each phase is independently revertible. Keep the existing React route implementation behind the same route paths until parity tests pass. If a migrated surface fails contract or visual gates, restore its previous React composition; never fall back to the static prototype for financial operations. Backend contract additions use expand-and-contract migration and remain backward-compatible until all clients are updated.

## Resolved product decisions

- Customer registration is Supervisor/Admin-only.
- Customer creation and initial card issuance are atomic.
- Birthday, consent, marketing, and consent/version fields are excluded from the MVP UI because they are absent from the TRD registration contract.
- Cashier activity remains a bounded summary; cursor pagination remains reserved for TRD-defined ledger/audit surfaces unless a future transaction-history contract is approved.
- Policy configuration is a product-owned Admin capability with audited mutation and concurrency protection.
