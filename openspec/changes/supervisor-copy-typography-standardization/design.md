# Design: Supervisor copy and typography standardization

## Principles

- Match the Cashier hierarchy rather than inventing a second typography system. Use `CashierPageHeader` / `cashier-route-header` styling for the page title and description; use existing semantic font, color, weight, spacing, and card tokens for sections and body copy.
- Keep one H1 per route, followed by section-level H2s and readable supporting paragraphs. Page copy should answer: what workspace is this, what can the supervisor do here, and what does the current status mean?
- Preserve each page's own job and copy only claims supported by its current data and actions. Do not imply reports are current when freshness is unknown, an approval is decided before its result returns, a fraud flag is resolved by selection, or a reversal edits/deletes the original transaction.
- Avoid repeated navigation instructions, redundant route-context alerts, implementation jargon, and duplicate page/card headings when the surrounding structure already makes the purpose clear.

## Route coverage

| Route                      | Primary job                                       | Copy direction                                                                                                                                                          |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/supervisor`              | Route-backed overview and review-lane launch      | Introduce the supervisor workspace and describe where to review customers/cards, transactions, approvals, fraud, and reports. Keep existing live panels and navigation. |
| `/supervisor/approvals`    | Review a pending decision and selected detail     | Explain that supervisors inspect evidence and submit a decision; do not imply a decision is accepted until the existing result confirms it.                             |
| `/supervisor/cards`        | Find a customer and manage card assignment/status | Distinguish card management from customer profile management; keep search, assignment, replacement, and status actions.                                                 |
| `/supervisor/customers`    | Search and manage customer profiles/cards         | State what the search finds and which profile/card operations are available to this role.                                                                               |
| `/supervisor/fraud`        | Review flags and supporting evidence              | Explain evidence review and backend-recorded resolution without overstating detection or outcome.                                                                       |
| `/supervisor/reports`      | Filter and inspect operational reports            | Explain selectable reports, filters, and row detail while preserving freshness/export limitations.                                                                      |
| `/supervisor/transactions` | Inspect a transaction and preview/submit reversal | Describe transaction lookup and compensating reversal; preserve the immutable-original boundary and current availability rules.                                         |

## Implementation boundaries

- Add a Supervisor-scoped style owner; do not change global tokens, broad element selectors, or shared primitive defaults.
- Route-owned pages compose the shared `CashierPageHeader` and existing `ShopCityCard`/status components where suitable.
- `CustomerWorkspace` and `TransactionWorkspace` are shared. If their markup needs a distinct Supervisor title/description, expose an explicit opt-in presentation variant with the existing default unchanged. Do not fork domain logic or copy the workspace implementation.
- Keep `ApprovalsPanel`, `FraudFlagsPanel`, and `ReportsWorkspace` behavior and shared default content untouched unless a concrete copy issue cannot be fixed at the Supervisor route boundary. Prefer scoped styles and avoid modifying their data/request/decision code.
- Keep route-specific labels, table content, filters, statuses, and actions intact unless a copy assertion proves the existing wording is misleading or redundant.

## Phased execution

- **Phase 1 — overview and review/report routes:** create route-scoped hierarchy/styles and update `/supervisor`, `/supervisor/approvals`, `/supervisor/fraud`, `/supervisor/reports`.
- **Phase 2 — customer/card/transaction workspaces:** update `/supervisor/customers`, `/supervisor/cards`, `/supervisor/transactions`; gate shared workspace presentation changes behind explicit Supervisor-only props.
- **Phase 3 — verification and polish:** compare computed page-header styles to `/cashier/lookup`; exercise all seven routes at 1440, 768, and 375 CSS px; regression-test Admin/Cashier consumers of shared workspaces.

## Risks and safeguards

- Shared workspace components have multiple role callers; use opt-in variants and verify defaults on Admin and Cashier.
- Scoped CSS can still alter nested headings in shared panels. Keep selectors rooted at the Supervisor wrapper and confirm non-Supervisor computed styles are unchanged.
- Copy changes must not alter permissions, available actions, financial claims, data scope, or the semantics of server-derived states.
- Preserve the existing dirty/untracked worktree; implementation children may touch only the paths assigned to their phase, and no child may commit or reset files.
