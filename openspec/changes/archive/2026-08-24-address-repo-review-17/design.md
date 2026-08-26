## Context

Repo review 17 identified two Sprint 2 release blockers and several high-priority verification gaps. The current `RealSmsProvider` posts ShopCity's internal SMS payload to a generic URL with bearer-token auth, but the configured provider target is eBulkSMS, whose JSON API requires a vendor-specific request envelope, credentials in the request body, and provider-specific response status mapping. The approval decision flow in `LoyaltyService.decideApproval` updates expired approvals inside the same interactive transaction that throws the `APPROVAL_EXPIRED` error, so Prisma rolls the update back and the approval remains `PENDING`.

The same review also found production can still use the sandbox SMS provider, GitNexus CI bypasses the repository dependency by using `pnpm dlx`, approval OpenAPI schemas omit real 422/error fields, and some SMS/worker edge cases remain insufficiently constrained. The change must keep the backend-first modular monolith shape, preserve immutable ledger/audit behavior, and avoid trusting frontend-submitted roles, balances, or approvals.

## Goals / Non-Goals

**Goals:**

- Implement eBulkSMS as an explicit production provider instead of treating real SMS as a generic HTTP echo contract.
- Ensure fake SMS providers cannot be selected in production by default.
- Persist expired approval state durably before returning the expiry domain error.
- Add regression coverage for the vendor SMS contract, expired approval persistence, stale policy rejection, worker shutdown safety, and invalid SMS reconstruction payloads.
- Make GitNexus CI deterministic through repository-managed dependencies and correct migration/release evidence documentation.
- Keep OpenAPI aligned with actual approval decision success and 422 error behavior.

**Non-Goals:**

- Add redemption features or start Sprint 3 work.
- Replace BullMQ, Prisma, Supabase/Postgres, or the existing REST/OpenAPI API shape.
- Redesign the broader approvals/loyalty module boundary beyond the minimum needed to fix expiry and policy behavior.
- Introduce new SMS vendors beyond eBulkSMS.

## Decisions

1. Add an `EbulkSmsProvider` as the concrete real provider.

   The provider factory should construct an eBulkSMS-specific adapter for `SMS_PROVIDER_MODE=real` using explicit credentials such as URL, username, API key, sender ID, and timeout. This avoids encoding vendor assumptions into a generic `RealSmsProvider` and makes tests assert the exact `/sendsms.json` JSON contract.

   Alternative considered: keep `RealSmsProvider` and add eBulkSMS branches inside it. This was rejected because the generic name already led to a mismatched contract and would make future provider behavior ambiguous.

2. Render SMS templates before vendor submission.

   The provider should translate `SmsSendInput.template` plus `payload` into a concrete message string before building the eBulkSMS request. The outbox event ID should remain the idempotency/provider correlation key where eBulkSMS supports `msgid` or equivalent metadata.

   Alternative considered: pass the template key and payload through to eBulkSMS. This was rejected because the vendor API sends rendered SMS text, not ShopCity's internal event shape.

3. Map vendor responses into ShopCity's existing `SmsSendResult` contract.

   eBulkSMS statuses such as `SUCCESS`, authentication errors, invalid recipients, throttling, and server failures should be normalized into `SENT`/`FAILED` plus `failureCategory` values. Authentication and invalid-recipient responses are terminal; transient provider/network failures are retryable.

   Alternative considered: expose vendor status strings to downstream worker code. This was rejected to keep the worker independent of vendor-specific response formats.

4. Make production fake-provider use opt-in and obvious.

   In production, both deterministic and sandbox modes should throw unless a deliberately named emergency override, for example `ALLOW_FAKE_SMS_IN_PRODUCTION=true`, is enabled. The default production path must be `real`.

   Alternative considered: only block deterministic mode. This was rejected because sandbox also records `SENT` without sending to customers.

5. Persist approval expiry outside the rollback path.

   The expiry branch should commit `EXPIRED`, `decidedAt`, decision actor, and reason before returning or throwing `APPROVAL_EXPIRED`. A minimal approach is to return a structured expired result from the transaction and throw outside it, or perform the expiry update in a separate committed transaction before throwing.

   Alternative considered: rely only on a scheduled expiry process. This was rejected because the decision endpoint must be correct even when an approval expires before the scheduler runs.

6. Keep failed expiry and stale-policy decisions side-effect-free for financial records.

   Expiry and stale-policy rejection paths must not create ledger entries, credit lots, or SMS outbox events. Integration tests should reload the approval and related financial/outbox tables after the failed request.

   Alternative considered: mark the receipt rejected automatically on expiry. This is out of scope unless existing business rules require it.

7. Use repository-installed GitNexus in CI.

   The GitNexus workflow should install dependencies from the npm lockfile and invoke the local binary or existing hardened wrapper rather than `pnpm dlx`. If Corepack/package-manager tooling is needed, pin it explicitly and keep execution governed by repository files.

   Alternative considered: continue `pnpm dlx gitnexus@1.6.9` with a pinned version. This was rejected because it still downloads and executes outside the repository lockfile.

## Risks / Trade-offs

- eBulkSMS response variants may differ from the currently documented examples -> Cover known statuses in unit/contract tests and treat unknown response shapes as terminal invalid provider responses rather than success.
- Template rendering could produce incomplete customer messages if payload keys are missing -> Validate rendered output and fail terminally when required template data is absent.
- Production fake-provider override could be misused -> Require an explicit, noisy environment variable and test that production defaults reject fake modes.
- Splitting approval expiry out of the transaction could introduce race conditions -> Use conditional updates on `tenantId`, `approvalId`, and `PENDING` status and return `APPROVAL_ALREADY_DECIDED` when the row is no longer pending.
- CI GitNexus native dependencies may still need build-script allowances -> Keep the allowance in repository-managed install or wrapper logic, not in runtime `dlx` execution, and document the expected verification command.
- Migration tracker wording can drift again -> Update it only after visible current-head evidence exists, or clearly mark evidence as pending.

## Migration Plan

- Add the eBulkSMS provider and environment validation without changing database schema.
- Update `.env.example` and README environment documentation for provider credentials, fake-provider override, and `PURCHASE_AMOUNT_CEILING_KOBO`.
- Deploy code with production environments configured for `SMS_PROVIDER_MODE=real` and eBulkSMS credentials.
- If production SMS credentials are unavailable, keep deployment blocked or explicitly set the emergency fake-provider override with operational approval.
- Fix approval expiry logic in application code only; no data migration is required for future decisions.
- Existing stuck pending approvals whose `expiresAt` is in the past should be handled by the existing/scheduled expiry process or a separate operational cleanup if needed.
- Update CI to use lockfile-backed GitNexus, then record visible successful current-head verification in `docs/database/migration-tracker.md`.

## Open Questions

- Which exact eBulkSMS credential variable names should be used in this repo: keep `SMS_PROVIDER_TOKEN` as API key for compatibility, or introduce explicit `SMS_PROVIDER_USERNAME` and `SMS_PROVIDER_API_KEY` names?
- Which template rendering source should be authoritative for SMS text if no current renderer exists: a small provider-local renderer for known receipt templates, or a shared SMS template registry?
