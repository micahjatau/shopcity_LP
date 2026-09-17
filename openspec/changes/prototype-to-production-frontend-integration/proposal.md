# Proposal: Migrate the prototype into the production frontend

## Why

The prototype establishes a stronger visual direction, but it is a second, partially wired frontend rather than a replacement for the existing Next.js/React application. Its two highest-frequency financial flows can lose authoritative card context and submit `cardSerialNumber: null`; customer registration contradicts cashier RBAC and claims to issue a card when it does not; scanner, offline, session, logout, and error handling are simplified; and bounded cashier activity is presented as a paginated transaction dashboard. The prototype also omits mature Supervisor/Admin capabilities and duplicates static artifacts in two repository locations.

The change will move the design language into the existing production routes and close every functional, contract, UX, and release gap identified in `docs/repo_review_70.md` without creating a second source of truth.

## What Changes

### Production frontend integration

- Apply the prototype visual language to the existing React shell and role-specific routes.
- Preserve the generated API client, backend-owned session/RBAC enforcement, CSRF and idempotency handling, scanner integration, offline queue, error contracts, and authoritative server state.
- Keep `/login`, `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, and `/cashier/sync` as the production destinations.
- Add accessible loading, empty, unauthorized, offline, validation, conflict, and server-error states to each migrated workflow.

### Prototype/React parity contract

Parity means more than matching colors or screenshots. A prototype screen is considered migrated only when the corresponding React route preserves the prototype's information hierarchy and interaction intent while using the production application's contracts, security boundaries, responsive behavior, and state model.

For every screen, the migration must produce a route-level parity record containing:

- Prototype reference path and approved viewport states.
- Production React route and owning component/module.
- Design elements carried over: page structure, typography hierarchy, spacing, color roles, icon meaning, primary/secondary action order, and responsive composition.
- Production behavior retained or added: real API methods, session/bootstrap requirements, scanner/offline behavior, navigation, loading, empty, error, pending, success, and unauthorized states.
- Data authority for every visible value, including the endpoint and DTO field; no visual field may be backed by a fixture or guessed client value.
- Role, tenant, branch, device, and session constraints.
- Keyboard, focus, screen-reader, touch-target, and mobile requirements.
- Unit/contract, accessibility, Playwright, and visual evidence links.

The parity mapping is:

| Prototype intent        | React destination                                        | Parity requirement                                                                                                                                                |
| ----------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login and role redirect | `/login`                                                 | Keep the prototype's focused sign-in hierarchy, but use real session issuance, role routing, error handling, recovery behavior, and logout lifecycle.             |
| Cashier overview        | `/cashier`                                               | Keep the launcher-first composition, compact operational context, and today-activity summary without embedding financial forms or inventing system health.        |
| Find customer           | `/cashier/lookup`                                        | Keep search/discovery affordances, but make scanner/card-serial lookup the financial entry point and preserve masked projections.                                 |
| Capture purchase        | `/cashier/earn`                                          | Keep the receipt-and-amount task flow, but require verified card context, integer-kobo validation, idempotency, and explicit confirmed/pending/rejected outcomes. |
| Redeem credit           | `/cashier/redeem`                                        | Keep the balance-and-redemption hierarchy, but read balance/policy from the authoritative lookup and render server outcomes.                                      |
| Sync queue              | `/cashier/sync`                                          | Keep queue-first recovery and batch controls, but use authenticated device/offline state and real reconciliation results.                                         |
| Transactions            | Existing transaction workspace or approved history route | Preserve search/detail intent only when the backend scope supports it; remove fake pagination and synthesized audit history.                                      |
| Register customer       | Supervisor/Admin customer workspace                      | Preserve the form only for persisted fields and show card assignment as a separate truthful operation.                                                            |
| Workflow states         | Developer/test harness only                              | Do not expose the mixed-role harness as a production page; split concepts into role-safe workspaces.                                                              |

A route fails parity if it is visually similar but loses a production capability, uses a different authority source, exposes a role-inappropriate action, omits a meaningful server state, or ships only as static HTML.

### Authoritative cashier workflows

- Make lookup begin with scanner/card-serial input and resolve through `GET /cards/lookup/{serial}`.
- Carry the authoritative card/customer projection into Earn and Redeem without trusting URL parameters, client balances, status, roles, or eligibility.
- Ensure Earn and Redeem submit the real card serial and render confirmed, pending-approval, duplicate, inactive-card, insufficient-balance, offline, and retry outcomes.
- Treat customer-directory search as a discovery aid only; it must not substitute for card verification.
- Make deep links resolve or reject safely instead of silently discarding selected customer context.
- Make normal cashier login provide the authenticated device context required by Offline Earn; remove manual device/cashier/branch entry from production UX.

### Customer and card lifecycle semantics

- Restrict customer registration to Supervisor/Admin workspaces and remove it from Cashier navigation.
- Implement customer creation and initial barcode-card assignment as one authorized, atomic backend workflow, matching the TRD registration sequence.
- Remove birthday, consent, marketing, and consent/version inputs from the MVP registration UI because the TRD customer model and registration contract do not define them. Reintroduce them only through a separately approved TRD/API change.
- Add production UX for customer edit, block/unblock, staff marking, card assign, replace, block, and reactivate using existing contracts.

### Activity, transactions, and session behavior

- Keep the existing bounded `cashier-today` activity feed for the MVP and label it as recent/loaded activity.
- Remove fake browser pagination and do not introduce a new transaction-history endpoint in this change; the TRD catalog defines transaction detail, ledger pagination, and reporting, but not a cashier transaction-history endpoint.
- Preserve transaction detail and reversal workflows through the existing authoritative endpoints; do not synthesize audit history from transaction fields.
- Implement real logout and session-expiry handling across migrated surfaces.
- Provide a real password-recovery route or remove the inactive recovery affordance until its contract exists.
- Replace hard-coded system status, notification, avatar, and global-search controls with real contracts or clearly non-interactive presentation.

### Supervisor/Admin coverage

- Redesign existing role-specific routes with the prototype visual language rather than rebuilding them in static HTML.
- Ensure production workspaces cover cards, customers, transactions, reversals, adjustments, approvals, fraud investigation, audit, reports, exports/materialization, SMS operations, pilot health, users, devices, branches, and offline reconciliation.
- Keep shared Customer, Card, Transaction, Approval, Fraud, Reporting, and Operations workspaces reusable while enforcing role capabilities at the route and API boundaries.
- Split the developer workflow harness into role-safe concepts; do not expose a mixed Cashier/Supervisor/Admin "Workflow states" page as production UX.
- Add an Admin policy/configuration workspace and audited mutation API with validation, optimistic concurrency, and role/tenant scope.

### Prototype and release hygiene

- Keep one clearly marked design/reference location during migration.
- Remove duplicate root-level HTML/CSS/JS and artifact copies after React parity, or exclude them from production artifacts with an explicit repository policy.
- Add contract, unit, accessibility, Playwright, visual, and role-boundary coverage for every migrated workflow.
- Preserve the release gates for runtime issues #39–#42: duplicate-receipt 409 evidence, authenticated report-isolation performance evidence, worker/real-SMS terminal-state evidence, and the final exact-SHA certification bundle.

## Capabilities

### New Capabilities

- `prototype-production-parity`: prototype visual designs are implemented by the existing production frontend architecture.
- `authoritative-cashier-card-context`: Earn, Redeem, scanner lookup, and offline flows use verified card/session context.
- `cashier-activity-history`: cashier activity has an honest bounded contract or a real cursor-paginated history contract.
- `policy-configuration-administration`: policy configuration is either an audited Admin workflow or explicitly operator-managed and absent from product navigation.

### Modified Capabilities

- `frontend-shell-routing`: role navigation, shell status, route ownership, and mobile/accessibility behavior use the production React shell.
- `workflow-coverage-expansion`: all role workflows use backend-backed shared workspaces and no mixed-role prototype page.
- `session-gated-shells`: logout, expiry, device binding, and recovery affordances reflect real session contracts.
- `financial-workflow-contracts`: cashier financial submissions preserve authoritative card context and explicit outcome/error states.
- `accessible-component-hardening`: migrated prototype surfaces meet keyboard, focus, semantic, and responsive requirements.
- `frontend-release-evidence`: parity, security, visual, runtime, and exact-SHA evidence gates include the migrated workflows.

## Non-Goals

- Replacing the Nest backend with a new API architecture.
- Introducing GraphQL, a second frontend framework, or inline-script production pages.
- Trusting frontend-supplied balances, roles, approvals, eligibility, device identity, or policy values.
- Treating the developer workflow harness as a customer-facing application.
- Declaring runtime certification complete without staging evidence for issues #39–#42.

## Impact

Affected surfaces include:

- `apps/web/app/**`, `apps/web/components/**`, `apps/web/lib/**`, and frontend tests/evidence.
- Cashier, Supervisor, Admin, auth/session, scanner, offline, reports, transaction, card, customer, and operations routes.
- Backend DTO/controller/service contracts only where the existing contract cannot represent the required truthful workflow, especially transaction history and policy administration.
- OpenAPI/client artifacts when contracts change.
- `openspec/specs/**`, release evidence, and repository prototype artifacts.

The change is intentionally phased so visual migration can land independently from additive backend contracts and runtime certification, while the final acceptance gate requires all phases to be reconciled.
