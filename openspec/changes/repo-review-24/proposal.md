## Why

Repo review 24 shows Sprint 3 still has cross-layer contradictions even after the previous hardening pass. The biggest gaps are runtime HTTP status mismatches, invalid redemption SMS payloads, and unsafe migration evidence, so this change keeps the hardening freeze in place until those release blockers are closed.

## What Changes

- Restore truthful pending-redemption responses so accepted-for-approval requests return HTTP 202 at runtime.
- Centralize confirmed-redemption SMS payload construction and validate template data before provider selection.
- Tighten financial contract truthfulness around redemption, approval, transaction-read, and reversal-boundary behavior.
- Reconcile remote migration history with deployable migration evidence and backup/restore verification.
- Add the remaining release gates and current-head evidence needed before Sprint 3 resumes.
- Keep reversal execution and manual adjustment expansion blocked until the hardening exit gates pass.

## Capabilities

### New Capabilities
- `sprint-3b-hardening`: Coordinates the remaining hardening freeze, exit gates, and release-evidence requirements for closing the last Sprint 3 contradictions.

### Modified Capabilities
- `financial-workflow-contracts`: Redemption status codes, approval/runtime truthfulness, transaction-read fidelity, and reversal-boundary requirements become stricter.
- `sms-delivery-truthfulness`: Redemption-confirmed SMS payload structure and validation requirements expand to enforce complete, typed payloads.
- `migration-safety`: Migration history, deploy verification, and backup/restore evidence requirements expand to cover the remaining shared-environment risk.

## Impact

Affected areas include redemption and approval controllers/services, transaction read models, SMS/outbox rendering, Prisma migrations and migration tracking, OpenAPI and generated-client truthfulness, CI/release evidence, and the Sprint 3 planning trackers.
