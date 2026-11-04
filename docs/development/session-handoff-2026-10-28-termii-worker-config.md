# Session Handoff — Termii SMS and Worker Configuration

Updated: 2026-10-28

## Repository and worktree

- Repository: `shopcity_LP`; branch: `workflow-states-implementation`.
- Worktree is dirty with uncommitted Termii integration, worker-configuration scope, and prior landing-page/CI work. Preserve all existing changes; do not reset or clean.
- `apps/web/.next-dev/` is a pre-existing untracked artifact and must be preserved.
- `.env.local` is gitignored and contains local provider configuration/secrets. Do not copy its values into logs, commits, handoffs, or chat.
- No database changes or migrations were made. No commit was created.

## Current user intent and safety constraints

- Termii is an explicitly selectable transactional SMS provider using the DND route; eBulkSMS remains the code default.
- The user authorized one generic live test SMS to their own number. Do not retain or repeat the recipient or message text here.
- Do not send additional live SMS unless the user explicitly authorizes another attempt. Never claim handset delivery based on provider submission alone.
- Termii account DND activation and an approved/registered sender ID remain prerequisites.

## Implemented work

### Termii provider

- Added `TermiiSmsProvider`, explicit provider selection, environment configuration, truthful `SENT` mapping, DND routing, reservation-based duplicate protection, and terminal outcome-unknown handling.
- `TERMII_API_URL` uses the account-specific full send endpoint. The current local endpoint is the Termii v4 host with `/api/sms/send`.
- OpenSpec change `openspec/changes/termii-sms-provider/` has proposal, specs, design, and tasks; strict validation passed. It is not archived.

### Background-worker configuration

- Added a separate OpenSpec change at `openspec/changes/background-worker-config-scope/`.
- `workerEnvValidationSchema` is used by outbox/SMS, the SMS provider factory, and credit-expiry configuration. Missing `DEVICE_ATTESTATION_KEK` no longer blocks background-worker validation.
- The API remains on `envValidationSchema`, which continues to require and validate the KEK. No auth, legacy device-attestation, key-rotation, or secret-storage behavior was removed.
- All tasks are checked and strict OpenSpec validation passed. The change is not archived.

## Current local sender-ID blocker

- The user requested changing the configured sender whitespace to an underscore; `.env.local` was normalized accordingly during the one-off attempt.
- The application currently validates sender IDs as 3–11 alphanumeric characters (`^[A-Za-z0-9]{3,11}$`), so an underscore is rejected during worker/SMS configuration validation.
- A sanitized local validation showed the worker schema no longer reports a missing KEK; it still reports the Termii sender-ID pattern error. The full API schema reports the KEK requirement as expected.
- Do not relax the sender-ID validator or update the Termii spec based on assumption. First confirm with Termii that the exact registered sender ID permits an underscore. Otherwise use the account's approved alphanumeric sender ID.

## One-off live Termii attempt

- After the user supplied the destination and asked for a generic sample message, one direct HTTP POST was made to the Termii v4 send endpoint using `type: plain` and `channel: dnd`.
- The request used the underscore-normalized sender value. Termii returned HTTP 422; there was no `code: ok` and no provider message ID. The request was not retried, no outbox row was created, and delivery was not confirmed.
- The exact recipient and message body are intentionally omitted. Treat the rejection cause as unconfirmed; verify sender registration/account routing before any new attempt.
- The direct one-off request bypassed the application's sender-ID validator; the normal worker path still rejects the current underscore value.

## Verification

- Full Jest suite passed (`npm run test -- --runInBand`).
- `npm run lint`, `npm run typecheck`, and `npm run build` passed.
- Strict OpenSpec validation passed for both active changes; Prettier and `git diff --check` passed.
- GitNexus impact checks were LOW for worker config loaders/provider factory; final change detection reported LOW risk and zero affected processes. The GitNexus index is stale (`df42d4d` vs current `139f0e9`), so treat graph coverage as limited.
- Semgrep was attempted but the executable could not be launched in this environment.

## Next steps

1. Confirm the sender ID's exact registration and allowed characters with the Termii account dashboard/support; do not copy credentials into support requests.
2. If underscores are supported and registered, update the Termii OpenSpec requirement, sender validation, and tests before using that sender in the normal worker path. Otherwise configure the approved alphanumeric sender ID.
3. Revalidate local worker configuration without printing secrets. Remember that API startup still requires `DEVICE_ATTESTATION_KEK`; that requirement is separate from SMS/background workers.
4. Do not start the real-mode worker or retry the rejected live request until sender/DND configuration is resolved and the user explicitly authorizes another send.
