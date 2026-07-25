# GitNexus Impact Tracker

Use this tracker when preparing a spec proposal. Run `npm run proposal:impact -- --file <path> <symbol>` for the planned change surface, then record the symbol-level blast radius here.

## Rules
- Run impact analysis before drafting a spec proposal.
- Record the exact symbol, risk, and impacted count.
- Call out HIGH or CRITICAL results explicitly.
- Update the tracker whenever proposal scope changes.

## Findings
| Date | Symbol | Risk | Impacted | Direct Dependants | Notes |
|---|---|---:|---:|---:|---|
| 2026-07-20 | `RequestThrottleService` | LOW | 7 | 3 | Process-local throttling implementation has limited blast radius, but proposal-time work should still treat it as shared infrastructure. |
| 2026-07-20 | `RequestThrottleGuard` | LOW | 6 | 2 | Route-level throttling guard affects login/config/card lookup entry points. |
| 2026-07-20 | `CardsService.updateStatus` | LOW | 2 | 2 | Directly affects `CardsController.updateStatus`; verify card-state changes with integration coverage. |
| 2026-07-20 | `ConfigurationService.getPublicConfig` | LOW | 2 | 2 | Directly affects the configuration module; validate inactive-tenant/branch behavior. |
| 2026-07-20 | `seedFoundation` | LOW | 2 | 2 | Bootstrap path is narrow but operationally important; keep proposal-time credential changes explicit. |
| 2026-07-20 | `UsersService.createUser` | LOW | 1 | 1 | Branch ownership changes flow through the users controller. |
| 2026-07-20 | `CustomersService.createCustomer` | LOW | 2 | 1 | Branch ownership changes flow through the customers controller. |
| 2026-07-20 | `CardsService.createCard` | LOW | 2 | 1 | Card creation blast radius is small and localized. |
| 2026-07-20 | `AuditService.recordWithClient` | CRITICAL | 35 | 15 | Broadest blast radius in the repo; proposal changes touching audit should be treated as high-risk and require explicit review. |
| 2026-07-25 | `RealSmsProvider` | LOW | 9 | 4 | Repo review 17 SMS provider replacement affects the provider implementation and interface-level worker usage. |
| 2026-07-25 | `createSmsProvider` | LOW | 6 | 3 | Provider factory changes affect worker bootstrap paths `bootstrap` and `bootstrapWorker`. |
| 2026-07-25 | `LoyaltyService.decideApproval` | HIGH | 7 | 3 | Approval expiry persistence fix affects receipt approval/rejection and approvals decision processes. |
| 2026-07-25 | `ApprovalsController.decideApproval` | LOW | 0 | 0 | OpenAPI response schema update has no indexed upstream callers. |
| 2026-07-25 | `OutboxWorkerRuntime` | MEDIUM | 8 | 6 | Worker recovery edits affect worker bootstrap paths and background job recovery behavior. |
