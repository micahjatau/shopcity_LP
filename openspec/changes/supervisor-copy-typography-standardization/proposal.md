# Standardize Supervisor copy and typography

## Why

Supervisor surfaces use a mixture of inline styles, browser-default heading scales, repeated route-context copy, and several shared workflow workspaces. The seven Supervisor routes should use the same clear title/body hierarchy and typography as Cashier, while retaining Supervisor-specific language and each route's real operational purpose.

## What Changes

- Standardize page titles and descriptions on `/supervisor`, `/supervisor/approvals`, `/supervisor/cards`, `/supervisor/customers`, `/supervisor/fraud`, `/supervisor/reports`, and `/supervisor/transactions` using the shared Cashier page-header typography.
- Establish a consistent single-H1, section-heading, supporting-copy hierarchy using existing design-system components and tokens.
- Rewrite repeated, route-technical, vague, or redundant Supervisor copy into concise task-oriented language. Preserve distinctions among reviewing approvals, investigating fraud, managing customers/cards, reading reports, and inspecting/reversing transactions.
- Scope typography and copy presentation to Supervisor routes. If a shared workspace needs a route-specific presentation variant, default Admin/Cashier behavior remains unchanged and is covered by role regressions.
- Add responsive and computed-style evidence for all seven routes against a Cashier page-header reference.

## Non-goals

- No changes to API requests, data scope, permissions, authorization, business rules, report definitions, approval/fraud/transaction decisions, reversal safeguards, or customer/card workflows.
- No redesign of Admin, Cashier, shell navigation, shared primitives, or global tokens.
- No changes to data-derived status labels, filtering values, empty/error/loading semantics, or financial meaning.

## Impact

All seven Supervisor route pages are in scope. Shared presentation consumers that may need a Supervisor-specific variant are `CustomerWorkspace` (also used by Admin and Cashier) and `TransactionWorkspace` (also used by Admin). `ApprovalsPanel`, `FraudFlagsPanel`, and `ReportsWorkspace` are shared with Admin and/or embedded in the Supervisor overview; prefer Supervisor-scoped CSS rather than editing their shared behavior or default copy.

Proposal-time GitNexus results are recorded in `docs/development/gitnexus-impact-tracker.md`. `CustomerWorkspace` is **CRITICAL** (five direct callers/five processes); `ApprovalsPanel`, `FraudFlagsPanel`, and `ReportsWorkspace` are **HIGH**. These warnings were reported before implementation. Any shared component edit must be limited to explicit Supervisor-only presentation options and verified on Admin/Cashier routes.

## Execution phases

1. Establish the route-scoped typography contract and standardize the Supervisor overview, Approvals, Fraud, and Reports page headers/copy.
2. Standardize Cards, Customers, and Transactions page headers/copy; add only opt-in Supervisor presentation variants to shared workspaces if required.
3. Verify all seven Supervisor routes plus Admin/Cashier shared-workspace consumers at desktop, tablet, and mobile sizes; finish copy assertions and regressions.

## Acceptance

- Every Supervisor route has one clear H1 and the same computed title/description typography as the shared Cashier page header.
- Section headings and body copy follow an explicit descending hierarchy with no redundant route-context prose.
- Copy explains the page's purpose without promising unsupported outcomes or changing product semantics.
- Shared workflow consumers retain their current behavior and default non-Supervisor presentation.
- OpenSpec validation, focused Playwright coverage, typecheck, lint, and formatting pass.
