# Design: Role-Aware Search and Shared Financial Lookup

## Context

`AppTopbar` currently renders a read-only input, an inactive notification button, and a permanent online label. Customer discovery already exists through `customersControllerListCustomersV1`; Cashier responses are masked by the backend. Exact card verification is `cardsControllerLookupCardV1` and must remain submit-driven because it is rate-limited. The Earn and Redeem forms each render their own card serial input/status/context block before their financial fields.

The existing `/users` endpoint is Admin-only and returns broad user data. It must not be reused or widened for Supervisor search. A dedicated cashier directory endpoint will return a minimal safe summary and enforce tenant plus branch scope for Supervisor/Admin.

## Decisions

1. **One search component, role-derived categories.** `GlobalShellSearch` receives the authoritative session role and selected-record callbacks. It only renders categories permitted by role; it does not infer authorization from client input.
2. **Directory queries are debounced; card lookup is explicit.** Customer and cashier directory requests run after a short settled-query delay and cancel/ignore stale responses. Card search runs only from an explicit Search Cards action or Enter, never on every keystroke.
3. **Safe result view models.** Customer results render only backend-provided safe fields; Cashier results use a dedicated minimal DTO and branch-scoped authorization. No frontend filtering can expand access.
4. **Shared `VerifiedCardLookupStep`.** The component owns heading, card input, submit, status, verified context, loading/error/found states, and stable classes. It accepts route-specific form width as a wrapper concern while keeping inner geometry/tokens identical. The existing `useCashierLookupController` remains the authority and is passed through as controlled state/actions.
5. **No generic Redeem lookup fallback.** Redeem’s initial workflow stage always mounts the shared lookup step; later stages render only after verified context, so an empty generic section is not left mounted.
6. **Topbar has truthful status only.** Remove notification and permanent online copy. Keep accessible session diagnostics and the existing offline indicator; connection status is represented only when backed by actual offline/online state.
7. **Generated contracts are regenerated, not hand-edited.** If the cashier directory endpoint is added, regenerate OpenAPI/client artifacts with the repository CLI and include authorization tests.

## Risks

- Debounced directory results can race with role/route changes; use request generations and abort/ignore guards.
- Search result deep links must not expose IDs unavailable to Cashier-safe responses.
- Shared lookup extraction can regress Earn/Redeem transitions; preserve controller props and add paired state tests/screenshots.
- Generated contract changes may affect lint/client checks; regenerate and run contract diff gates.

## Verification

Use deterministic mocked role fixtures for Cashier, Supervisor, and Admin. Test categories, authorization, masking, exact card lookup call counts, stale responses, keyboard/Escape/focus restoration, deep links, paired lookup geometry, 1440/390 responsive shell states, lint, typecheck, build, integration, Semgrep, and final SHA CI.
