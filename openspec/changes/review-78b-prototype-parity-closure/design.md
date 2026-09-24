# Design: Review 78b prototype parity closure

## Context

The approved HTML prototypes define visible hierarchy, grouping, content order, spacing, and responsive intent. Production React controllers define authenticated behavior, role authority, customer/card verification, financial outcomes, idempotency, offline capture, and reconciliation. This change joins those sources without allowing a visual reference to override production truth.

The repository already contains unrelated dirty changes. Baseline SHA, working-tree inventory, deployment identity, route, role, state, viewport, and browser must be recorded before new evidence is captured. The functioning `shopcity-lp` preview is the valid live comparison target; the alternate `web` preview's `/login` HTTP 500 / `FUNCTION_INVOCATION_FAILED` result is tracked separately and must not be mixed into visual acceptance evidence.

## Design principles

1. Prototype markup is the presentation reference, not a business-logic source.
2. Existing controllers and backend contracts remain the behavior owners.
3. Unsupported prototype fields or actions become documented deviations, never fabricated API behavior.
4. Structural evidence precedes screenshot comparison; updated React screenshots cannot prove parity with the original prototype.
5. Shared shell geometry is established before route-specific composition changes. The baseline is a 244px expanded sidebar, 76px collapsed rail, 64px topbar, 1120px main-content maximum, and 300px shared-search maximum; route CSS must not override the shell merely to fit one screenshot.

## DOM and page-content contract

The React routes must preserve the following prototype-derived hierarchy and content regions. Stable `data-od-id` landmarks should identify the major regions without replacing semantic HTML.

| Screen            | Required content order and structure                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login             | Brand/header → sign-in card → role presentation → email/phone field → password field/toggle → sign-in CTA → error/recovery region                                                                                     |
| Overview          | Shared shell/topbar → greeting/page heading → authorized quick actions → Today's Activity label → four metric cards → Recent Transactions heading → bounded table → footer/destination action                         |
| Find Customer     | Page heading → centered search panel → name/phone/card lookup controls → Search/Scan actions → loading/empty/error region → recent/discovered customer cards → verified-card context and permitted next actions       |
| Capture Purchase  | Persistent flow panel → Find customer → Confirm customer/card → Receipt details → Review summary → submit/pending/confirmed/failed/uncertain outcome                                                                  |
| Redeem Credit     | Distinct narrower flow panel → Find customer → basket subtotal → available credit → redemption amount → remaining payable amount → confirmation → pending/outcome region                                              |
| Register Customer | Registration heading → customer information form → supported initial-card/consent content → review → submit/pending/error → success; broader search/detail/card-management workspace stays outside this focused route |
| Transactions      | Heading/refresh → filters and toolbar → transaction table → bounded pagination/footer → two-column detail dialog                                                                                                      |
| Sync Queue        | Derived shared shell → queue metrics/status → toolbar → queue table/badges/actions → detail dialog → responsive recovery/error regions; this is not claimed as prototype HTML parity                                  |

Presentation changes must not flatten these regions into a generic form, reorder them for screenshot convenience, or hide accessible status/context content. Route-specific content may differ only for documented production, authorization, accessibility, or unsupported-contract reasons.

## Review 78b traceability and understated constraints

The following requirements are intentionally small but binding because they are called out in `docs/repo_review_78b.md`:

- Shared shell work precedes route work. Keep one sidebar/one topbar across Cashier, Supervisor, and Admin; role-aware search categories remain Customers/Cards for Cashier and add Cashiers only for Supervisor/Admin. Notification and avatar surfaces are presentation boundaries, not an unimplemented issue #45 contract.
- Overview keeps the prototype hierarchy but Cashier registration remains unauthorized. Quick actions must follow production role policy, and “Credit redeemed” must not label a redemption count as a money total.
- Find Customer must preserve exact card lookup, masked PII, tenant/branch scope, stale-response protection, keyboard selection, Escape/focus restoration, and deep-link handoff.
- Capture Purchase keeps receipt number, kobo-safe amount, authoritative review context, draft/idempotency recovery, and confirmed-versus-pending outcomes. Prototype-only fields such as Till are not added to the payload.
- Redeem keeps basket, available credit, requested amount, remaining payable amount, approval/pending distinction, and no offline redemption.
- Register Customer supports only backend-supported full name, phone, and initial-card data unless a new contract is separately approved. The broader workspace remains available for selected-customer and card-management operations.
- Transactions must retain table columns, badge/row density, dialog dimensions, mobile treatment, and honest bounded-history language.
- Sync Queue's production semantics include IndexedDB, device binding, and per-record reconciliation; visual derivation must not alter them.

## Ownership map

| Concern                                 | Owner                                                             |
| --------------------------------------- | ----------------------------------------------------------------- |
| Visual hierarchy and approved reference | `apps/web/public/prototype/*.html` and mapped reference artifacts |
| Route presentation                      | React route/workflow components                                   |
| Shared geometry and appearance          | App shell, design tokens, shared CSS/primitives                   |
| Lookup and financial state              | Existing frontend controllers and API contracts                   |
| Role/session authority                  | Backend and route guards                                          |
| Acceptance evidence                     | Same-SHA comparison matrix and documented deviations              |

## Implementation slices

### 1. Baseline and login

Freeze the comparison inputs, including the approved prototype/HTML and `Landing-1.png` through `Landing-18.png` reference inventory. Use deterministic intercepted responses for visual states and never submit prototype scripts against live accounts. Update `LoginForm` presentation so unsupported Owner selection is informational or unavailable; do not make the client-selected card authoritative.

### 2. Overview and lookup

Align Overview labels and loaded-zero semantics. Preserve bounded activity and role-authorized quick actions, including the Cashier registration restriction. Verify lookup states separately for directory discovery and verified active-card context, including masking, stale responses, keyboard/focus behavior, exact-card scope, and deep-link handoff. Confirm the heading/actions → metrics → recent-transactions DOM order and content regions before geometry comparison.

### 3. Financial workflows

Keep Capture Purchase's four-stage flow and Redeem's distinct basket/redemption flow. Preserve the explicit stage headings, review context, status regions, and outcome content in the DOM; do not reduce either route to a single generic form. Compare review, success, pending, failed, uncertain, and offline-safe states. Do not add unsupported fields such as a prototype-only till field to the API payload.

### 4. Registration, Transactions, and Sync Queue

Compose focused registration at `/supervisor/customers/new` and `/admin/customers/new` around `useCustomerRegistrationController`, retaining the broader customer workspace for search, detail, editing, and card management. Do not copy unsupported birthday/marketing-consent fields. Preserve the logical registration idempotency key across uncertain retries rather than generating a new request automatically. Preserve truthful transaction scope and pagination language. Derive Sync Queue from shared production primitives with explicit mobile reading order; do not reorder the DOM to satisfy a conflicting stale screenshot.

### 5. Certification

Run structural landmark checks, computed geometry checks, accessibility and keyboard checks, responsive checks, role/RBAC checks, focused workflow tests, build/typecheck/lint/Semgrep, and GitNexus change detection. Use the review's 1440×923 desktop context for pixel/geometry claims; call tablet/mobile results responsive conformance where no original design exists. Record unavailable deployment or browser evidence explicitly. For each screen, compare structure, geometry, and behavior at the same route/state/viewport; classify tablet/mobile results as responsive conformance where no original design exists.

## Reproducible comparison procedure

When local execution is available, run the two targets separately as prescribed by Review 78b:

```bash
cd apps/web && npm ci && npm run dev -- -p 3100
cd apps/web/public/prototype && python3 -m http.server 3101
```

Compare the prototype routes against their React routes: Overview → `/cashier`, Find Customer → `/cashier/lookup`, Capture Purchase → `/cashier/earn`, Redeem Credit → `/cashier/redeem`, Register Customer → the focused Supervisor/Admin route, and Transactions → `/cashier/transactions`. Use deterministic intercepted responses because prototype `/api/v1` calls do not automatically target the React backend. If local servers or authenticated browser access are unavailable, record that limitation rather than claiming pixel-level parity.

## Impact and risk

Proposal-time GitNexus results are recorded in `docs/development/gitnexus-impact-tracker.md`:

- `LoginForm`: LOW; login page process.
- `CashierOverviewLookup`: LOW; Cashier overview process.
- `TransactionDashboard`: LOW; cashier transactions process.
- `RedeemTransactionForm`: HIGH; lookup, earn, and redeem processes.
- `CustomerWorkspace`: CRITICAL; five admin/supervisor/cashier customer/card processes.
- `CashierWorkflowRoute`: target unresolved in the stale index; treat as a cross-route presentation surface and verify locally before editing.

The HIGH/CRITICAL findings require focused regression coverage and explicit review before changing shared workflow or customer workspace code. No backend or financial semantics should be modified in this change.

## Rollback

Revert route presentation and evidence changes slice-by-slice. Do not revert unrelated working-tree changes, backend contracts, database migrations, financial history, or queue state.
