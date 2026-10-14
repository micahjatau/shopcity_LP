# Session Handoff — SMS Providers and WebAuthn / Device Attestation KEK

Updated: 2026-10-14

## Repository state and guardrails

- Repository: `/root/github-repos/micahjatau/shopcity_LP`
- Branch: `workflow-states-implementation`
- Working tree: heavily dirty, including substantial unrelated frontend, generated, documentation, provider, and OpenSpec changes. Preserve all existing changes; do not reset, clean, stage broadly, or commit without reviewing the exact scope.
- No database migration was made for the SMS work. The only external SMS action was the separately authorized one-recipient Twilio test described below.
- `.env.local` is git-ignored. Never copy credentials, full numbers, message bodies, ciphertexts, or provider payloads into this handoff, logs, or chat.

## SMS work and current operational state

### Implemented

- Added the official Twilio Node SDK and an explicitly selectable `TwilioSmsProvider`; eBulkSMS remains the default.
- Twilio configuration requires API-key authentication and exactly one sender: an E.164 `From` number or a Messaging Service SID.
- Twilio acceptance is stored as `SENT`; delivery callbacks are not ingested. No delivery claim should be made from the create response.
- Because Messages creation has no documented provider idempotency key, Twilio dispatch claims a local tenant/outbox reservation before submission. Fresh reservations prevent duplicate dispatch; stale/ambiguous attempts dead-letter for provider-history review. Only explicit HTTP 429 is automatically retryable.
- OpenSpec change `twilio-programmable-sms-provider` is complete and strict validation passed. Focused SMS/config/worker Jest, targeted ESLint, build, Semgrep, Prettier, and `git diff --check` passed. The implementation changes remain uncommitted in the dirty worktree.

### One-off Twilio test and current state

- The full worker was **not** started. The outbox was inspected in a remote Supabase read-only transaction: at that snapshot there were no unprocessed outbox events or eligible SMS sends. Worker startup also runs a credit-expiry sweep that can enqueue new reminder messages, so an empty snapshot alone does not authorize starting it.
- After the user approved the exact test and configured sender, one direct, recipient-scoped Twilio API request was made with automatic SDK retries disabled. Twilio returned initial status `accepted`; the user confirmed receipt. The message was not written to ShopCity's outbox/SMS table, and its SID was not retained here.
- The user reported Truecaller marked the sender as scam, then later reported that issue sorted. Treat the Truecaller issue as user-reported resolved; do not send more tests unless separately approved.
- At the last local check, `.env.local` selected Twilio in real mode with exactly one Messaging Service sender configured. Values are not recorded here. Full application environment validation still fails because `DEVICE_ATTESTATION_KEK` is missing. **Do not start the worker until the KEK dependency is safely resolved and the outbox/send scope is reviewed.**

### Other SMS-provider blockers — do not retry

- **eBulkSMS (#22; blocks #17):** two prior authorized attempts returned failure without provider message IDs or DLRs; the user reported no dashboard logs. Confirm acceptance/charge/history and diagnose account/API/sender/endpoint configuration before retry. Existing attempt correlation IDs are tracked in the related SMS notes/todos.
- **Arkesel (#27; blocks #24):** previous live/sandbox attempts returned 422/500 without provider IDs or DLRs. Check provider history, credits, and request diagnostics before any further request.
- **Africa's Talking (#32 → #30 → #29):** two sandbox requests returned HTTP 401 without provider IDs. Resolve sandbox-key/account authorization with provider support before any retry.
- No credentials or destination numbers should be copied into support tickets. Do not treat missing provider IDs or dashboard evidence as proof that a send was not processed.

## Why `DEVICE_ATTESTATION_KEK` still exists after moving to WebAuthn

WebAuthn credentials and device-attestation secrets are separate mechanisms. Cashier login for a `WEBAUTHN`-bound device branches to `beginCashierWebAuthnLogin` before the legacy HMAC path and does not use this KEK. The key is still used by legacy/device-attestation operations and is unconditionally required by the shared environment schema.

The stored attestation secret is encrypted with AES-256-GCM; key material is SHA-256-derived. Existing ciphertext depends on the original key. Replacing a missing key with a new random value can make stored secrets undecryptable, so recover the intended key from its approved secret source or complete an approved forward migration—never guess or rotate casually.

### Known KEK consumers and bottlenecks to audit

| Surface / flow                                        | Current KEK dependency                                                                                                                                                                              | Required next-session action                                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/env.validation.ts`                        | `DEVICE_ATTESTATION_KEK` is globally required outside tests (minimum 32 characters); custom validation also requires it to differ from other secrets.                                               | Identify which processes truly need this requirement; preserve API protection while separating process-specific configuration.               |
| API bootstrap (`src/app.module.ts` / `ConfigModule`)  | Uses the shared schema, so API startup fails without the KEK even when the request path would be WebAuthn-only.                                                                                     | Keep the API requirement until legacy/device-secret consumers and data are inventoried or scope it deliberately.                             |
| Worker bootstrap (`src/worker.ts`)                    | `loadWorkerConfig`, `createSmsProvider`, and the credit-expiry worker's config loader validate against the same whole-app schema; this blocks SMS/background startup despite no SMS use of the KEK. | Give worker/SMS configuration a scoped schema that does not inherit unrelated API-only requirements, with tests for every worker entrypoint. |
| `AuthService.login` for `HMAC_LEGACY` devices         | Decrypts the stored attestation secret, then validates the HMAC proof. The `WEBAUTHN` branch returns before this code.                                                                              | Preserve exclusive mode behavior; keep this path/key until all legacy devices are migrated and the approved rollback window ends.            |
| Device-bound `AuthService.smokeSession`               | Requires a device attestation and decrypts its stored secret.                                                                                                                                       | Determine whether this test/bootstrap path is still used; retire or scope it only through an approved change.                                |
| `BranchesService.updateDevice` legacy-secret rotation | Rotation is limited to `HMAC_LEGACY` and encrypts a newly generated secret with the KEK.                                                                                                            | Retire the operation only after legacy migration and UI/API consumers are removed.                                                           |
| `scripts/backfill-device-attestation-secrets.ts`      | Uses the KEK to encrypt new secrets; it scans every device missing ciphertext without filtering by binding mode, revokes active sessions, and writes audit records.                                 | Never run as an inventory/check. Remove only after the migration contract permits it.                                                        |
| Local/dev/container/test setup                        | `.env.example`, local setup notes, live-E2E and Docker verification scripts provide/require test or development values.                                                                             | Distinguish test-only values from real key material and avoid accidentally using test keys with persisted ciphertext.                        |

`rg` found the shared schema used by the API module, outbox worker config, SMS provider factory, and credit-expiry worker config. Recheck the full call graph before changing it. Session-guard mode checks are related to exclusive HMAC/WebAuthn behavior but do not themselves decrypt the KEK.

### Authoritative WebAuthn migration gate

`openspec/changes/browser-pos-webauthn-attestation/tasks.md` task 7.4 explicitly defers disabling production HMAC, removing `x-device-attestation`, browser HMAC generation, secret/rotation UI, production KEK dependency, backfill utility, and legacy schema until production-device migration and rollback criteria pass. Do not remove the KEK globally just because new cashier login uses WebAuthn.

The phase-2 contract documents development-project evidence of 10 devices defaulted to `UNPAIRED` and none classified `HMAC_LEGACY`; this is **not** a production/shared-device inventory. No current production/shared device-mode or ciphertext-count audit has been done in this session.

### Required next-session KEK audit and resolution

1. Map all startup validators, API/auth paths, device-management operations, scripts, tests, deployments, and environment templates that require/read/write the KEK. Use GitNexus plus source search; record each direct consumer and transitive startup blocker.
2. Perform a read-only inventory per environment of device binding-mode counts, active WebAuthn credential counts, and presence counts for `attestationSecretCiphertext`. Never select or print ciphertext values, HMAC secrets, or keys. Treat production/shared state as unknown until explicitly inspected and authorized.
3. Locate the authoritative existing KEK in the approved secret store/backup. Do not generate a replacement until the ciphertext dependency and any re-encryption/session-revocation plan are established.
4. Separate API validation from worker/SMS validation so unrelated background processes can start without weakening auth checks. Add startup tests for API, outbox worker, SMS factory, and credit-expiry worker with the KEK absent/present as appropriate.
5. For any eventual API/global KEK removal, first satisfy WebAuthn OpenSpec task 7.4: complete inventory, exclusive per-device migration, production hardware/security gates, audit evidence, rollback-window closure, and data/ciphertext cleanup. Create/update OpenSpec before implementation; plan backups and an expand-and-contract migration if schema changes are needed.
6. Regression-test: WebAuthn cashier login succeeds without entering the HMAC path; `HMAC_LEGACY` remains fail-closed and works only with its correct KEK during the approved window; secret rotation/backfill cannot run accidentally; no WebAuthn-to-HMAC fallback or device-less cashier session is introduced.
7. Keep the worker stopped until its config path is safely unblocked and live-send conditions are reviewed. Never start a real-mode worker merely to validate configuration.

## Open work items

- SMS attempt diagnosis remains pending in todos #17/#22 (eBulkSMS), #24/#27 (Arkesel), and #29/#30/#32 (Africa's Talking). Keep them open until provider history/support resolves uncertainty.
- Todo #34 now tracks KEK dependency scoping; the user reports the Truecaller issue resolved.
- Todo #35 tracks this handoff and should be completed after the handoff/index update is verified.
- Twilio implementation todo #33 is complete; provider integration does not imply approval for additional sends.

## Safe continuation

Start the next session by reading this file, checking `git status` and the current local provider configuration without printing secrets, reviewing the OpenSpec WebAuthn migration gate, and doing the KEK/data inventory read-only. Preserve the existing worktree and do not start the worker or retry any provider attempt until its specific gates are satisfied.
