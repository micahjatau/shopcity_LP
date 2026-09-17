# Tasks: Prototype-to-production frontend integration

## 1. Baseline, decisions, and contracts

- [x] 1.1 Inventory prototype screens, existing React routes, generated client methods, session/bootstrap state, scanner/offline infrastructure, role capabilities, and current test/evidence coverage.
- [x] 1.2 Run GitNexus impact analysis for the cashier shell, card lookup, Earn, Redeem, customer registration, activity reporting, session logout, and policy configuration surfaces; record blast radius in `docs/development/gitnexus-impact-tracker.md`.
- [x] 1.3 Decide and document pilot ownership from the TRD: Supervisor/Admin-only registration, atomic initial barcode-card assignment, TRD fields only, bounded cashier activity, and product-owned policy configuration.
- [x] 1.4 Define the authoritative card-context state machine and typed UI outcome model for lookup, Earn, Redeem, duplicate, approval, offline, retry, and session-expiry states.
- [x] 1.5 Define role/tenant/branch/device acceptance fixtures and prohibit client authority for balance, status, role, eligibility, approval, or policy values.
- [x] 1.6 Update or create OpenSpec capability specs for prototype parity, card context, activity history, and policy configuration before implementation.

## 2. Prototype/React parity foundation

- [x] 2.1 Inventory each prototype asset's viewport states, intended hierarchy, controls, copy, data fields, and backend claims; record findings in `docs/development/prototype-react-parity-matrix.md`.
- [x] 2.2 Map every prototype screen to one React route and owning component/module; document deliberate deviations and why they are required by security, contract, accessibility, or responsive behavior.
- [x] 2.3 Define reusable React design tokens and primitives for prototype typography, spacing, surfaces, status colors, buttons, inputs, tables, cards, dialogs, empty states, and responsive containers.
- [x] 2.4 Define semantic status and action patterns so confirmed, pending, offline, warning, rejected, and unauthorized states have consistent copy, iconography, color, and accessible text.
- [x] 2.5 Establish a parity evidence convention: approved reference screenshots, route/viewport matrix, stable selectors, accessibility assertions, API/authority map, and visual diff artifacts.
- [x] 2.6 Add a route-level parity review checklist to frontend tests/review documentation; a screenshot match alone MUST NOT pass a route.

## 3. Production shell and visual migration

- [x] 3.1 Extract the prototype visual language into reusable React tokens, primitives, shell components, and accessible patterns without introducing inline-script production pages.
- [x] 3.2 Apply the design to `/login`, preserving the existing auth/session implementation and role-aware redirects.
- [x] 3.3 Apply the design to `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, and `/cashier/sync` while preserving deep links and route guards.
- [x] 3.4 Keep branch, device, session, connection, and sync context visible in the production shell without duplicating launcher grids.
- [x] 3.5 Implement responsive desktop, tablet, and mobile navigation with keyboard access, focus containment, escape handling, and background inertness.
- [x] 3.6 Add loading, empty, offline, unauthorized, validation, conflict, server-error, pending, success, and session-required states to each migrated route.
- [x] 3.7 Remove or make explicitly non-interactive every prototype control without a real production contract, including fake notifications, decorative global search, static health status, dead recovery, and `#logout` links.
- [x] 3.8 Add stable semantic selectors, accessibility assertions, route tests, and visual snapshots for every migrated shell and workflow route at desktop, tablet, and mobile breakpoints.
- [x] 3.9 Complete and review the parity record for each screen before marking its migration complete.

## 4. Authoritative cashier workflows

- [x] 4.1 Make scanner/card-serial input the first-class lookup entry point and wire it to `GET /cards/lookup/{serial}`.
- [x] 4.2 Ensure directory search can discover customers but cannot unlock financial actions without verified card context.
- [x] 4.3 Carry the verified card projection from Lookup to Earn/Redeem and reject stale, missing, wrong-tenant, wrong-branch, inactive, staff, or ineligible context safely.
- [x] 4.4 Ensure Earn submits the authoritative card serial, integer-kobo amount, receipt number, CSRF, and idempotency headers through the generated client.
- [x] 4.5 Ensure Redeem submits the authoritative card serial and renders server-authoritative balance, policy, approval, insufficient-balance, and success outcomes.
- [x] 4.6 Cover confirmed, pending approval, duplicate, inactive card, insufficient balance, network retry, offline queue, and idempotency replay states.
- [x] 4.7 Make normal cashier login/bootstrap expose usable device, branch, actor, and session context for Offline Earn; remove manual identity fields from production UI.
- [x] 4.8 Add unit, contract, integration, Playwright, accessibility, and visual coverage for scanner focus/Enter, context handoff, financial rejection, and offline reconciliation.

## 5. Customer, card, and session semantics

- [x] 5.1 Remove Cashier customer-registration CTAs and routes; expose registration only in Supervisor/Admin workspaces.
- [x] 5.2 Move registration into Supervisor/Admin workspaces and send only the TRD-defined full name, normalized phone, and initial card barcode fields.
- [x] 5.3 Implement and test the atomic customer-plus-initial-card backend workflow with one idempotency boundary and truthful rollback behavior.
- [x] 5.4 Remove birthday, consent, marketing, and consent/version inputs from the MVP UI; create a separate proposal if the TRD is later amended to require them.
- [x] 5.5 Add customer edit, block/unblock, staff marking, card assign, replace, block, and reactivate production workflows using existing RBAC and idempotency rules.
- [x] 5.6 Implement real logout, session-expiry cleanup, and recovery routing; remove dead `#logout` and fake password-recovery behavior.
- [ ] 5.7 Add role, tenant, branch, device, logout, expiry, and recovery regression tests.

## 6. Activity, transaction, and audit truthfulness

- [x] 6.1 Keep the cashier-today overview bounded and label it as recent/loaded activity; defer full transaction history to a separate API proposal.
- [x] 6.2 Label the bounded overview/activity as loaded/recent activity and remove fake pagination and unsupported full-day totals.
- [x] 6.3 Remove browser-only pagination and ensure the UI does not claim full history beyond the bounded feed.
- [x] 6.4 Port transaction detail and reversal actions through authoritative endpoints; do not synthesize audit trails from transaction fields.
- [ ] 6.5 Add tests for scope, cursor boundaries, timezone/day boundaries, pagination, transaction detail, reversal authorization, and audit visibility.

## 7. Supervisor/Admin product coverage

- [ ] 7.1 Apply the prototype visual language to existing Supervisor/Admin shells and role-specific dashboards without importing Cashier pages as implementations.
- [ ] 7.2 Complete card lifecycle UX: assign, replace, block/reactivate, replacement SMS state, and audit context.
- [x] 7.3 Complete customer lifecycle UX: edit, block/unblock, staff marking, masked projections, and branch/tenant scope.
- [ ] 7.4 Complete transaction, reversal, adjustment, approval, and fraud workspaces with explicit capabilities and backend outcome states.
- [ ] 7.5 Complete reporting UX: management reports, exports, materialization controls, SMS operations, transaction-level inspection, and pilot health indicators.
- [ ] 7.6 Complete users, devices, branches, and offline queue/reconciliation administration surfaces.
- [ ] 7.7 Replace the mixed-role Workflow States page with role-safe workspace coverage; retain any harness only as non-production developer tooling.
- [ ] 7.8 Add role-matrix, wrong-tenant, wrong-branch, authorization, accessibility, contract, and Playwright coverage for every shared workspace.

## 8. Policy/configuration capability

- [x] 8.1 Implement the decided product-owned policy capability and update Admin navigation/runbooks.
- [x] 8.2 Add Admin-only validated policy read/write endpoints, optimistic version checks, audit records, integer/bounds validation, OpenAPI, client generation, and integration tests.
- [x] 8.3 Add stale-version conflict handling and Cashier/Supervisor rejection coverage for policy mutations.
- [x] 8.4 Add the Admin configuration UI after the contract and audit behavior are complete.

## 9. Repository hygiene and generated artifacts

- [x] 9.1 Choose one documented prototype reference location during migration.
- [x] 9.2 Remove duplicate root-level HTML/CSS/JS and `.artifact.json` copies after React parity, or explicitly exclude them from production and document why they remain.
- [x] 9.3 Ensure generated OpenAPI/client artifacts are regenerated by CLI after contract changes rather than hand-edited.
- [x] 9.4 Add a repository check preventing duplicate production frontend implementations and sensitive prototype artifacts from shipping.

## 10. Verification and runtime certification

- [x] 10.1 Run frontend typecheck, lint, unit tests, accessibility tests, visual tests, and affected Playwright workflows.
- [ ] 10.2 Run backend contract/integration tests, Semgrep, build, OpenAPI lint/diff, and architecture checks for affected surfaces.
- [ ] 10.3 Run GitNexus `detect_changes()` and confirm only expected symbols, flows, and generated artifacts changed.
- [ ] 10.4 Verify duplicate receipt returns 409 rather than 500 with durable evidence for issue #39.
- [ ] 10.5 Run authenticated report-isolation/performance evidence for issue #40 with exact SHA and valid fixtures.
- [ ] 10.6 Run worker and real-SMS terminal-state certification for issue #41 without fake production providers or sensitive evidence.
- [ ] 10.7 Assemble the final exact-SHA runtime certification bundle for issue #42, including deployment, security, backup/restore, and residual-risk evidence.
- [ ] 10.8 Review every proposal acceptance criterion, inspect the final diff/status, and record rollback and residual risks.
