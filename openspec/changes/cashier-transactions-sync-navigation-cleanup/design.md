## Context

The proposal and delta specification define a frontend-only cleanup spanning the shared shell, Cashier transaction routes, transaction presentation, and the IndexedDB-backed sync queue. The current app already has generated API clients, role-aware navigation, a bounded Cashier Today feed, local queue/reconciliation behavior, and guided Earn/Redeem stages. These authorities must remain intact.

The approved prototype is the rendering reference, while backend responses remain authoritative for identity, balances, status, approvals, transaction details, and audit data. The current working tree contains unrelated changes that must not be absorbed into this change.

## Goals / Non-Goals

**Goals:**

- Establish a single role-aware navigation registry with the approved Cashier ordering and `/cashier/transactions` destination.
- Separate Cashier bounded activity presentation from Supervisor/Admin transaction data and reversal capabilities.
- Build a reusable transaction list/detail presentation boundary with explicit loading, error, empty, stale-request, focus, and modal lifecycle behavior.
- Keep search/filter view-models controlled and local, with request execution only on supported submit/actions.
- Preserve sync queue domain behavior while replacing its presentation with a compact state-driven workspace.
- Make screenshot, geometry, accessibility, and contract tests deterministic and reviewable against the supplied references.

**Non-Goals:**

- No new backend endpoint is assumed. A missing history/detail capability is documented and represented truthfully rather than simulated.
- No replacement of IndexedDB, queue reconciliation, generated clients, session/RBAC enforcement, or financial controllers.
- No generic design-system rewrite outside the affected Cashier/shell surfaces.

## Decisions

1. **Use the navigation registry as the only route authority.**
   `shell-navigation.ts` will define Cashier labels, order, icons, destinations, and active matching. Sidebar rendering and Overview shortcuts will consume that registry. This prevents the current Customer Records/Transactions divergence. A page-local route list is rejected because it has already caused inconsistent active states and links.

2. **Split transaction data sources by role and capability.**
   Cashier `/cashier/transactions` will consume the existing bounded Cashier Today projection and explicitly label its scope. Supervisor/Admin transaction views will retain their authorized report/detail/reversal source. Reusing the Cashier endpoint everywhere is rejected because it violates data-source and role semantics; inventing complete-history pagination is rejected because the contract does not guarantee it.

3. **Implement detail as a controlled modal state machine.**
   Transaction selection stores a request generation or selected transaction ID, clears stale detail state, and ignores responses that no longer match the active selection. The modal will use the existing React client boundary with a focus sentinel/trap, initial focus on the close control, Escape/backdrop dismissal, scroll containment, and restoration to the originating row. A permanently mounted detail card is rejected because it does not match the approved interaction or accessibility model.

4. **Normalize display state at the view-model boundary.**
   Backend statuses and nullable fields will be mapped to a small presentation model (`approved`, `failed`, `pending`, `reversed`, `unknown`, and truthful unavailable fields). Raw DTOs and backend error objects will not be rendered. This keeps copy stable while retaining the original response for authorized actions and auditability.

5. **Keep filtering local and truthful.**
   Search inputs will be controlled and applied on submit or an explicit clear action; no request will run per keystroke. Transaction matching will use the fields actually displayed (receipt number and transaction ID), status options will be normalized, and the amount label will say credit unless purchase subtotal filtering is implemented. Sync filters will operate over the full in-memory queue snapshot while summary counts remain unfiltered.

6. **Treat Sync Queue as a presentation adapter over existing queue operations.**
   The page will derive summary cards, filtered rows, selected-record detail, and action availability from the existing IndexedDB/session/reconciliation hooks. Actions will be named after their real operation and will not change retry, idempotency, cleanup, or offline policy. A new queue store or server synchronization protocol is rejected.

7. **Use layered visual evidence.**
   Route screenshots and landmark screenshots will be deterministic Playwright baselines with dynamic session/status masks. Reference assets and route metadata will be validated, and DOM geometry assertions will cover shell dimensions, landmark bounds, typography/control rhythm, and responsive states. Baselines will only be updated after an image diff is reviewed against the prototype HTML/Figma evidence.

## Risks / Trade-offs

- **[Bounded feed cannot provide complete history] →** Use explicit bounded-activity copy, omit misleading pagination, and document the missing capability.
- **[Async detail responses race] →** Compare the response transaction ID/request generation with current selection before committing state; add a race regression test.
- **[Modal focus handling regresses keyboard workflows] →** Test open, Tab/Shift+Tab containment, Escape, backdrop, close button, and restoration at desktop and mobile widths.
- **[Shared navigation change breaks role routes] →** Test every registry destination for Cashier, Supervisor, and Admin and run route authorization checks.
- **[Queue copy implies financial credit too early] →** Derive labels from authoritative local/backend states and explicitly distinguish queued, sending, approval, and confirmed credit.
- **[Visual snapshots hide prototype drift] →** Keep reference-manifest checks, inspect diff artifacts, and maintain a deviation registry for approved differences.
- **[Unrelated dirty files are accidentally committed] →** Stage only files in the change impact list and inspect `git diff --cached` before each commit.

## Migration Plan

1. Freeze the current route/visual evidence and inspect the approved reference assets.
2. Update navigation and routes without removing existing customer deep-link handlers.
3. Refactor transaction view-models and modal lifecycle while preserving generated-client calls and role boundaries.
4. Rework Sync Queue presentation over the existing queue hooks and operations.
5. Add/update unit, contract, Playwright, accessibility, visual, and geometry coverage; review screenshots.
6. Run lint, typecheck, build, Semgrep, OpenSpec validation, GitNexus change detection, and required CI gates.
7. Roll back by reverting the frontend commits; no database migration or backend rollback is expected.

## Open Questions

None. The bounded Cashier Today contract is the source of truth; any unsupported full-history or receipt-image capability is handled as an intentional limitation rather than deferred product behavior.
