## 1. Production SMS Delivery

- [x] 1.1 Run GitNexus impact analysis for SMS provider symbols before editing `src/jobs/sms.provider.ts` and `src/jobs/sms.provider.factory.ts`, and note blast radius in the implementation log or PR notes.
- [x] 1.2 Replace the generic real SMS HTTP adapter with an explicit eBulkSMS provider that builds the vendor `/sendsms.json` JSON request, uses configured username/API key/sender ID, renders SMS text, and correlates messages with the outbox event ID.
- [x] 1.3 Map eBulkSMS success, authentication failure, invalid recipient, malformed request, rate-limit, timeout, server error, and unknown response cases into `SmsSendResult` statuses with correct retryable or terminal failure categories.
- [x] 1.4 Keep the SMS timeout active through both `fetch()` and response-body parsing, and return retryable timeout failure when the provider stalls headers or body.
- [x] 1.5 Update SMS provider environment validation, `.env.example`, and README configuration docs for eBulkSMS credentials, timeout, sender ID, fake-provider production override, and `PURCHASE_AMOUNT_CEILING_KOBO`.
- [x] 1.6 Reject deterministic and sandbox providers in production by default, with tests proving only an explicit fake-provider override permits them.
- [x] 1.7 Add mocked HTTP contract tests for the exact eBulkSMS request and response mapping, including invalid response shape and stalled response body cases.

## 2. Approval Expiry And Policy

- [x] 2.1 Run GitNexus impact analysis for approval decision symbols before editing `LoyaltyService.decideApproval` and approval controller/schema code, and note blast radius in the implementation log or PR notes.
- [x] 2.2 Change expired approval handling so `EXPIRED`, `decidedAt`, decision actor metadata, and expiry reason commit before `APPROVAL_EXPIRED` is returned to the caller.
- [x] 2.3 Preserve concurrent decision safety with conditional updates on tenant, approval ID, and `PENDING` status, returning `APPROVAL_ALREADY_DECIDED` when another process already changed the row.
- [x] 2.4 Add an integration regression that attempts a decision on an expired approval and asserts persisted `EXPIRED`, non-null `decidedAt`, and no ledger entry, credit lot, or SMS outbox event.
- [x] 2.5 Add or complete stale-policy integration coverage that changes approval policy context before decision and asserts rejection without ledger, credit lot, or SMS outbox side effects.
- [x] 2.6 Update approval decision OpenAPI schema to document 422 error envelopes and the successful decision `reason` field, then regenerate/verify `docs/api/openapi.json` as required by repo scripts.

## 3. SMS Worker Reliability Edges

- [x] 3.1 Run GitNexus impact analysis for worker recovery symbols before editing outbox worker/runtime code, and note blast radius in the implementation log or PR notes.
- [x] 3.2 Require reconstructed SMS payloads to include a real `receiptId`; dead-letter missing-receipt payloads instead of substituting the outbox event ID.
- [x] 3.3 Track the initial recovery cycle as active recovery so `stop()` waits before closing BullMQ, Prisma, and related worker resources.
- [x] 3.4 Add worker/recovery regression tests for missing receipt ID dead-lettering and shutdown during the initial recovery cycle.

## 4. CI And Release Evidence

- [x] 4.1 Run GitNexus impact analysis for CI wrapper or script symbols before editing GitNexus execution scripts, and note blast radius in the implementation log or PR notes.
- [x] 4.2 Update `.github/workflows/ci.yml` so the GitNexus job installs from the repository lockfile and invokes the repository-installed GitNexus binary or hardened wrapper instead of `pnpm dlx`.
- [x] 4.3 Pin any package-manager tooling used by the GitNexus CI path through repository configuration or explicit workflow versioning.
- [x] 4.4 Update OpenSpec task/proposal claims or repo documentation that currently overstate GitNexus determinism or migration verification.
- [x] 4.5 Update `docs/database/migration-tracker.md` so migration evidence says current-head verification is pending unless a visible successful run exists; record evidence only after static, GitNexus, e2e, and integration jobs pass for the current head.

## 5. Verification

- [x] 5.1 Run targeted unit tests for SMS provider/factory and worker/runtime changes.
- [x] 5.2 Run targeted approval integration tests with `npx jest <path-to-spec> --runInBand` or the repo's integration command as appropriate.
- [x] 5.3 Run `npm run openapi:lint`, `npm run openapi:diff`, and generated OpenAPI cleanliness checks after schema updates.
- [x] 5.4 Run `npm run verify:fast`, `npm run build`, and `npm run prisma:validate`.
- [x] 5.5 Run `npm run test:integration` when Docker/Testcontainers dependencies are available.
- [x] 5.6 Run GitNexus `detect_changes()` or the repo-supported equivalent before committing to confirm affected symbols and flows match the planned change scope.
