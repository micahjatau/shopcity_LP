# Tasks

> Checkboxes represent completion supported by current implementation and review evidence. The bounded management lookup, Supervisor workflows, responsive evidence, launch matrix, independent second pass, and final validation are recorded below. The final web production build and route smoke ran in an isolated copy so the existing root `.next` output and servers remained untouched.

## 1. Confirm baseline and contracts

- [x] 1.1 Record branch, HEAD, dirty-tree paths and preservation boundary; do not stage, reset, or absorb pre-existing changes. Branch/HEAD and inherited-path boundary are recorded in `second-pass-review.md` and owner-confirmed; no files were staged/reset.
- [x] 1.2 Re-read Review 80 and applicable OpenSpec 78/79 scope; record overlap and keep shell/prototype work outside this targeted change. Scope separation is documented in `proposal.md` and `design.md`.
- [x] 1.3 Confirm current Supervisor routes, tab/deep-link conventions, registration-flow reuse seam, generated client/API responses, current controllers/services/DTOs and existing frontend tests before editing; source-confirmed contracts and route conventions are recorded in `design.md`.
- [x] 1.4 Resolve or explicitly record assumptions about eligible customer/card fields, customer status transitions, blocked-card reactivation and idempotency behavior. Source-confirmed rules and remaining assumptions are documented in `design.md`; operator approval is limited to the bounded lookup and Supervisor-only tablet CSS exception.

## 2. Introduce the four focused workspaces — Review 80 implementation order 1

- [x] 2.1 Keep `/supervisor/customers` and `/supervisor/cards` paths; implement Customers tabs `Register customer` / `Manage customers` and Cards tabs `Assign card` / `Manage cards`.
- [x] 2.2 Ensure only the active tab's primary workspace is rendered; establish direct-link/default/invalid-tab and browser history behavior.
- [x] 2.3 Implement accessible tab labels, selection/panel semantics, keyboard behavior, focus and responsive selected-panel layout.
- [x] 2.4 Test exactly one active workspace per route and direct tab reload/back/forward behavior; evidence: `apps/web/tests/workflow-routes.spec.ts` active-panel/responsive case and tab reload/history tests. Card test performs a real tab click and verifies Back/Forward; external Playwright result `/tmp/review80-pw-results/.last-run.json` passed.

## 3. Separate create registration from profile editing — Review 80 implementation order 2

- [x] 3.1 Make Register customer open blank and independent of selected customer/search/deep-link state.
- [x] 3.2 Move customer search, explicit selection, profile editing and customer-status controls to Manage customers.
- [x] 3.3 Remove initial first-result auto-selection; allow a linked context ID only after authoritative reload.
- [x] 3.4 Test blank registration after selection, explicit manage selection, profile/status actions and invalid/stale ID behavior; evidence: `apps/web/tests/supervisor-customer-workflows.spec.tsx` selection-to-blank, explicit-selection/profile/status, deep-link and stale-ID cases.

## 4. Preserve atomic first-card registration — Review 80 implementation order 3

- [x] 4.1 Preserve required full name, phone and initial card serial and optional existing profile fields; use existing registration API and idempotency contract exactly once.
- [x] 4.2 Keep create customer + initial card as one backend operation; do not create partial-registration sequence or separate assignment request.
- [x] 4.3 Make review and confirmed success state explicit: customer registered and first card assigned; provide ID-based next-step links.
- [x] 4.4 Test valid payload, duplicate phone/card, field validation, API error, safe retry/idempotency and no false/partial success. Duplicate-phone recovery tests cover authorized exact-phone search, authoritative detail reload, ID-based handoff and safe prefilled recovery; evidence is in `apps/web/tests/supervisor-customer-workflows.spec.tsx`, `apps/web/tests/customer-registration-flow.spec.tsx`, and `test/phase-1.int-spec.ts`.

## 5. Build explicit existing-customer assignment — Review 80 implementation order 4

- [x] 5.1 Require deliberate customer search-result selection or an ID deep link followed by authoritative detail reload; never submit to the first search match.
- [x] 5.2 Enable assignment only for an active customer with no active card according to existing authoritative response; fail closed on unknown/loading/error.
- [x] 5.3 Use a dedicated blank serial field that is not populated from an existing linked card; review customer and new serial before submit.
- [x] 5.4 Route existing active-card cases to Manage cards; explain blocked/ineligible customer state without bypass.
- [x] 5.5 Test duplicate tenant serial, stale eligibility, existing active card, blocked customer, no selection, deep-link reload and exact existing create-card request.

## 6. Separate replacement, blocking and reactivation — Review 80 implementation order 5

- [x] 6.1 Implement the operator-approved, read-only `GET /api/v1/cards/management/lookup/{serialNumber}` for Supervisor/Admin only. Always derive tenant from authenticated context; canonicalize case-insensitive serial matching; support ACTIVE/BLOCKED/REPLACED; return only card `{ id, serial, status, issuedAt, blockedAt, replacedAt, replacedByCardId }` and customer `{ id, fullName, status }`; exclude phone/email/balance/audit/internal actor details; return 404 for no tenant match; fail closed on ambiguous canonical matches; and apply the existing card-lookup throttle policy. Preserve existing cashier `GET /cards/lookup/:serialNumber` and active-card behavior. Read-only: no DB/schema, RBAC-policy or status-policy change.
- [x] 6.2 Reveal only operation-specific controls: replace active card, block active card, reactivate blocked card only where existing API/customer state permits; treat replaced as terminal.
- [x] 6.3 Require fresh replacement serial and clear target/impact confirmation for replacement and status changes.
- [x] 6.4 Generate/update OpenAPI and generated client using repository CLIs (`npm run openapi:export`, then `npm run client:generate`); do not hand-edit generated artifacts. Use generated-client calls, CSRF/idempotency, backend confirmation and authoritative refresh; do not change RBAC/status policy.
- [x] 6.5 Verify lost-card replacement keeps the same customer/wallet and does not create balance-transfer UI/call; replacement tests cover same-customer identity, no balance operation, conflict/failure and status boundaries (`apps/web/tests/supervisor-card-management.spec.tsx`, `src/modules/cards/cards.service.spec.ts`, `test/phase-1.int-spec.ts`). Existing service/integration evidence preserves balance and audit semantics.

## 7. Remove implementation-facing and duplicate UI — Review 80 implementation order 6

- [x] 7.1 Remove Detail-led/Route-backed/Contract-driven badges, instructional implementation note cards, duplicate badge/context panels, generic route-context alerts and raw action-response JSON from supervisor UI.
- [x] 7.2 Remove default ledger history from registration and assignment; keep only relevant customer/card context, functional status and actionable error/confirmation states.
- [x] 7.3 Ensure customer status is distinct from card status and each selected task owns one clear primary action.
- [x] 7.4 Test that removed content is absent while user-facing errors, statuses, confirmation and accessibility announcements remain.

## 8. Desktop/mobile composition — Review 80 implementation order 7

- [x] 8.1 Review all four active workspaces at 1440, 1024, 768, 390, and 375px using rendered routes; evidence: `apps/web/tests/workflow-routes.spec.ts` responsive Supervisor workspace test.
- [x] 8.2 Confirm selected-panel-only rendering, responsive DOM stacking, and that all page controls (including the shared shell) are unclipped with no horizontal document overflow at each tested width; validated in Playwright at all five widths, with a Supervisor-only tablet shell rule and Admin/Cashier isolation checks.
- [x] 8.3 Capture 20 ephemeral screenshots under `apps/web/test-results/workflow-routes-workflow-r-d4cec-er-and-card-task-workspaces/`; verify keyboard arrow-tab behavior and input focus across all four tasks and widths.

## 9. Launch test matrix — Review 80 implementation order 8

- [x] 9.1 Registration: duplicate normalized phone, duplicate initial card serial, validation, atomic success, uncertain failure/retry.
- [x] 9.2 Assignment: blocked/inactive customer, customer already has active card, duplicate new serial, stale/unavailable authoritative details, explicit selection and blank serial.
- [x] 9.3 Card lifecycle: active card block, blocked card reactivation when permitted, replaced card terminal, lost-card replacement, duplicate replacement serial, unchanged customer balance.
- [x] 9.4 Failure/recovery: pending duplicate-submit prevention; validation/409/403/network/5xx/timeout responses; safe idempotent retry and authoritative refresh without false success.
- [x] 9.5 Roles/security: Supervisor/Admin UI scope, unauthorized role route/API denial, stable-ID deep links, no trusted URL status/balance and no raw private response output.
- [x] 9.6 Accessibility/responsive: tabs, labels, status announcements, focus, confirmation, DOM order, narrow viewports and no overflow.
- [x] 9.7 Run relevant focused frontend tests, affected browser tests, lint/typecheck/build; retain existing backend contract/integration regression evidence where available (current: 41 focused Jest; 5 phase-1 integration; 3 targeted tab-history Playwright; web lint/typecheck; isolated web production build/route smoke; Nest lint/build passed. Retained earlier: 2 responsive/role Playwright, 131 accessibility, and 19 card HTTP contract tests. Evidence and the untouched root `.next` boundary are recorded in 11.1/`second-pass-review.md`.
- [x] 9.8 Test management lookup API/OpenAPI/client contract: authorized SUPERVISOR/ADMIN versus denied CASHIER/other roles; authenticated-context tenant isolation and cross-tenant 404; canonical/case-insensitive matching; ACTIVE/BLOCKED/REPLACED; no-match 404; ambiguous canonical match fail-closed; exact response allowlist and absence of phone/email/balance/audit/internal actor details; existing throttle policy; read-only behavior; and unchanged cashier active-card lookup regression.

## 10. Independent second pass — evidence gate before final validation

- [x] 10.1 After implementation but before final validation, perform a fresh review of all concerns from `docs/repo_review_80.md` against current UI states, links, calls and tests; independent full review and follow-up are recorded in `second-pass-review.md`.
- [x] 10.2 Explicitly map each numbered implementation order item 1–8 to implementation and test evidence; disposition every other review concern as confirmed/evidenced, already satisfied with proof, non-reproducible with reason, or blocked with owner/next step; see `second-pass-review.md`.
- [x] 10.3 Verify Review 80-owned changes are limited to the approved read-only lookup plus Supervisor workflows/OpenAPI/generated client/tests and the approved `.shell-body:has(.sc-page)` tablet rule; verify no DB/schema, RBAC/status policy, Admin/Cashier behavior, or AppShell/AppSidebar logic changes. The reviewer confirmed the inherited CSP diff (`apps/web/next.config.mjs`) is outside scope and flagged broad dirty-path provenance; owner confirmed these inherited paths must remain untouched and uncommitted for this change. No files are staged. This is not a claim that the whole tree is clean or approval of CSP semantics; the CSP change remains for separate review before any commit.
- [x] 10.4 Treat the second pass as a prerequisite evidence gate, not implementation execution; implementation completion is supported by the separately recorded final checks in 11.1–11.3, with the unavailable final web build disclosed rather than inferred from review.

## 11. Final validation and scope report (after second pass)

- [x] 11.1 Final focused validation: 41 Jest tests (`/tmp/review80-focused-jest.json`), 3 targeted tab-history Playwright tests (`/tmp/review80-pw-results/.last-run.json`), 5 phase-1 integration tests (`/tmp/review80-phase1-integration.json`), `npm run web:lint`, `cd apps/web && ./node_modules/.bin/tsc --noEmit --incremental false`, `npm run lint`, and `npm run build` (Nest) passed. A final Next production build passed in a temporary source copy using a separate `.next-review80` directory (`/tmp/review80-web-build.log`); its isolated `next start` served both Supervisor routes with HTTP 200. The existing root `.next` and port-3100 server were left untouched; the tracked root Playwright `.last-run.json` still says failed, while the external artifact above is the successful final run.
- [x] 11.2 `git diff --check` passed; final inventory was captured at `/tmp/review80-final-status.txt` (89 dirty/untracked status rows), `git diff --cached --name-only` is empty, branch is `workflow-states-implementation` at `153d567`. Inherited dirty/untracked paths remain unstaged and untouched.
- [x] 11.3 `npm run openspec:validate` passed all 27 active changes, including Review 80. Test artifacts and order 1–8 mappings are linked above and in `second-pass-review.md`; residuals (root `.next`, stale tracked Playwright metadata, and separately reviewed inherited CSP) are disclosed.
