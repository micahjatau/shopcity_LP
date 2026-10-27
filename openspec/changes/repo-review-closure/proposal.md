# Repo Review Closure

## Why

The review of `workflow-states-implementation` at `9ae97bcee0cf9132c716431819124f45d1e9a285` identified pilot risks across adjustment retry identity, paired settlement reversals, POS authentication certification, privacy wording, environment identity, mutation idempotency, operational UX, and specification governance. CI success does not establish real-provider or physical-POS acceptance. These risks need a single actionable closure plan before pilot readiness can be claimed.

## What Changes

- Make adjustment retries stable across ambiguous responses by reusing the logical operation's idempotency identity and effective timestamp; cover ambiguous commit/retry, double-submit, payload changes, and new operations with tests.
- Implement the Product/Finance-approved atomic grouped compensating reversal for combined Redeem+Earn settlement, covering both ledger effects and redemption allocations in one audited/idempotent transaction; no ordinary-adjustment substitute. Cases that cannot be safely reversed remain fail-closed for manual review.
- Align staging smoke with DEVICE_TOKEN and define authorized physical POS and real-provider acceptance gates. Physical acceptance requires approved staging `POS_DEVICE_TOKEN_HMAC_KEY` and `SHOPCITY_BACKEND_URL`, authorized accounts, and a real target POS/browser; do not claim acceptance until these are available and evidence is recorded.
- Require approved privacy/consent wording and a single versioned source for displayed and recorded consent; include choices in registration review.
- Remove environment-specific deployment identity from committed configuration and validate deployment-specific identity safely.
- Make branch-creation idempotency guarantees truthful and consistent between UI and backend.
- Improve financial-unit presentation, stale operational wording, and crawler directives.
- Close the device-auth OpenSpec's final `5.4` review checkbox and the fraud-review OpenSpec's visual-review checkbox. CI visual tests are evidence for CI only, not authorized live/staging acceptance.
- Reconcile overlapping OpenSpec changes, archive only when supported by implementation/test evidence, and validate the resulting source of truth.
- Require exact-candidate CI and separately required security checks, plus rollback/support readiness, before limited-pilot approval.
- Certify online checkout before offline Earn; keep offline Earn excluded until its binding, replay, eligibility, limit, and recovery behavior is separately verified.
- Defer broad file refactoring, reporting expansion, fraud UI deduplication, and public asset cleanup unless a concrete need is approved.

## Impact

- Affected areas: adjustments, reversals/settlement, POS auth and smoke tests, customer consent/registration, SMS/outbox acceptance, deployment configuration, branches, admin UI, crawler metadata, and OpenSpec governance.
- No financial data migration is presumed. Any schema change requires a separate reviewed migration plan and migration-tracker update.
- No deployment, remote device pairing, real customer onboarding, or production-provider action is authorized by this proposal.
- Pilot remains NO-GO until P1 decisions and authorized runtime acceptance evidence are complete.

## Source and caveats

This proposal captures the complete findings supplied in the review and `docs/development/repo-review-closure-plan.md`; it does not independently re-verify those findings. The supplied review's final recommended-action list was truncated, so no missing recommendations are inferred.
