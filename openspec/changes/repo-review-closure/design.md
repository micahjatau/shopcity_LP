# Design: Repo Review Closure

## Approach

Deliver pilot closure as gated workstreams rather than a broad feature sprint. Each workstream needs an owner decision where behavior or policy is not yet settled, focused OpenSpec requirements/tests, GitNexus impact analysis before implementation, and exact-scope verification. Keep the backend modular monolith and existing append-only financial/audit constraints.

## Workstreams and decisions

1. **Adjustment retry identity:** keep one idempotency key and `effectiveAt` bound to a logical draft operation through ambiguous outcomes, including page reloads in the same browser tab. Persist only a digest of the canonical payload plus the operation identity in session storage; never persist raw customer/reason/amount payload. Bind retry recovery to the backend's seven-day idempotency retention; if an unresolved identity is expired or unavailable, fail closed and direct the operator to resolve the prior outcome before creating another adjustment. Clear only the successfully resolved operation identity, not other unresolved ones.
2. **Combined settlement correction:** Product/Finance selected atomic grouped compensating reversal on 2026-10-17. Treat exactly one confirmed REDEEM debit and its correlated confirmed net-spend EARN credit on the same tenant/customer/receipt as one full reversal unit. Resolve either original ID to the pair; lock the idempotency key and receipt group; prevalidate both effects, the unused/unexpired Earn lot, and every exact historical allocation before writing. Create both immutable compensation entries, restore those exact allocations, update redemption state, record one grouped audit event, queue one customer SMS, and persist a response containing both IDs and amounts in the same serializable transaction. Same-key/same-reason retries through either leg replay the original response; concurrent attempts commit at most once. Malformed, partial, expired, consumed, or inconsistent state returns `REVERSAL_REVIEW_REQUIRED` with no writes. Async delivery failure after durable notification intent commits does not undo financial history; failure to persist the transactional outbox intent itself aborts the database transaction, preserving atomic notification intent.
3. **DEVICE_TOKEN certification:** change smoke tooling to provision/authenticate with DEVICE_TOKEN; preserve auth-mode exclusivity. Runtime certification requires approved staging key/backend, authorized accounts, and a physical POS/browser. None may be fabricated or assumed.
4. **Provider acceptance:** conduct provider-specific authorized smoke. Distinguish accepted/SENT from DELIVERED, especially for Africa's Talking without DLR; untrackable Arkesel acceptance remains uncertain/terminal and must not auto-retry.
5. **Consent/privacy:** obtain product/legal wording approval or use approved interim language. Establish one versioned notice/consent source used by both display and persistence. Surface loyalty and marketing choices in review.
6. **Deployment identity:** deployment environment variables determine tenant/project/origin identity. Validate missing and cross-environment values safely; committed configuration describes requirements, not target identity.
7. **Branch create semantics:** either implement backend persisted idempotency bound to tenant/payload, or remove the UI's misleading idempotency claim and define safe ambiguous-outcome behavior.
8. **Operator UX and hygiene:** present naira/percent while preserving integer kobo/BPS at the API boundary; update stale workflow wording; set noindex/nofollow and disallow crawling as hygiene only.
9. **Spec governance and deferred work:** inventory, reconcile, and archive only after evidence. Online checkout precedes offline Earn certification. Broad file splitting, public-asset cleanup, tracked build-info removal, and fraud component deduplication are deferred unless justified by a concrete issue.

## Safety and compatibility

- Keep money in integer kobo; preserve immutable/append-only financial history and audit trails.
- Financial corrections are compensating events, not edits/deletes.
- Do not downgrade or fall back between HMAC_LEGACY, WEBAUTHN, and DEVICE_TOKEN modes.
- No shared-database changes, staging deployment, POS pairing, real customer onboarding, or provider send without appropriate authorization.
- Existing dirty tracked/untracked checkout content is out of scope and must be preserved.

## Verification

Use focused unit/integration tests and full relevant suites for financial/auth changes; root/web lint, typecheck and build; Semgrep; Playwright/accessibility for UI; strict OpenSpec validation; and GitNexus impact plus exact-scope detect-changes. Verify Supabase only if DB/RLS changes occur. Require exact-candidate CI and separate required security checks. Staging/POS/provider claims need recorded authorized runtime evidence, not CI inference.

## Release gate

Pilot remains NO-GO while any P1 mutation/accounting issue, unresolved privacy approval, deployment identity risk, or required staging/provider gate is open. Limited pilot GO requires owner sign-off, exact-SHA CI/security evidence, authorized POS/provider acceptance, and support/rollback readiness. Offline Earn remains excluded until separately certified.
