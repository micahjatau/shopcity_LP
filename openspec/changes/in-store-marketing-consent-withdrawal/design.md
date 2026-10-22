## Context

Customer registration writes one tenant-scoped `CustomerConsent` row atomically with customer/card creation. That row is append-only and records the registration choice, not an indefinitely mutable preference. The registration consent OpenSpec explicitly deferred withdrawal tooling. The customer profile currently reads the registration snapshot, and the cashier customer route has a selected-customer action area.

The project has no direct-marketing sender in the repository. Transactional SMS and other service communications are separate and must not be suppressed by a marketing withdrawal. External campaign-list synchronization is not implemented and must not be implied by the UI.

## Goals / Non-Goals

**Goals:**

- Let store staff record a customer's in-person request to stop optional direct-marketing messages.
- Make the opt-out effective immediately in the ShopCity marketing preference, preserving the original registration evidence.
- Keep tenant, branch, and authenticated actor provenance; use server-owned time and an idempotency key.
- Make repeated submissions safe and expose current preference to authorized staff.
- Explain plainly that this action is marketing-only, not account deletion, and does not affect transactional/service messages.

**Non-Goals:**

- Delete or deactivate the customer account, cards, purchase/wallet data, ledger, or historical consent.
- Change required loyalty consent or registration behavior.
- Suppress transactional messages, authentication notices, or operational messages.
- Synchronize an external marketing provider/list; none is present in the repository.
- Provide a general privacy-rights request, data-export, or erasure workflow.

## Decisions

- Add an append-only `CustomerMarketingPreferenceEvent` record with `OPTED_OUT` state, `IN_STORE` source, tenant/customer, authenticated staff actor, assigned branch, and server timestamp. Add tenant-aware foreign keys and an update/delete rejection trigger. The immutable registration snapshot remains unchanged.
- Derive current preference from the latest preference event, falling back to the registration snapshot when no later event exists. Do not update `CustomerConsent.marketingOptIn` in place. Any future re-opt-in must be an explicit, versioned append-only event backed by a separate approved flow.
- Add an authenticated POST endpoint with a required idempotency key. Derive actor, tenant, and branch from the authenticated request; reject staff without a valid active assigned branch. Save preference event, audit record, and idempotency response atomically. Do not accept customer identity, actor, branch, timestamp, or consent version from the browser.
- The in-store UI requires staff to confirm the customer requested the change in person. It does not store a free-text explanation or claim independent customer identity verification. Search/select the existing customer first; do not create a customer as an opt-out workaround.
- On success, show a readable confirmation without database identifiers. Describe the resulting effective marketing preference and clearly state that the account/history remain and non-marketing service messages may continue.
- Use the profile projection to distinguish the original registration choice from the current marketing preference and show the effective-change time. If the preference lookup fails, report `Unavailable` and fail closed for any future marketing sender.
- Update generated API artifacts with the repository's OpenAPI/client generators. Keep audit metadata minimal and exclude name, phone, marketing message content, and free-text notes.

## Risks / Trade-offs

- A staff-recorded in-person request is an operational attestation, not cryptographic proof of the customer's identity. The action must be limited to authenticated branch staff and audited to the staff actor.
- External campaign systems cannot be automatically suppressed until integrated. The UI and docs must not claim provider-list removal; before such senders are used, they must consume the authoritative preference and reconcile their suppressions.
- Preference-read failure could lead a future sender to assume opt-in. Current marketing status must be represented as unavailable and senders must fail closed.
- A future re-opt-in cannot mutate the original row or erase withdrawal history; it requires a later append-only event with an approved, separately recorded consent version.

## Migration Plan

Add a new migration only; do not edit any applied migration. The migration creates the event table, tenant-aware foreign keys/indexes, and append-only trigger. Update the local migration tracker. Validate and test against a fresh disposable database/Testcontainers; do not apply to a shared environment as part of this change. No backfill is needed: registration choices remain the baseline, and only new in-store withdrawal requests create events.
