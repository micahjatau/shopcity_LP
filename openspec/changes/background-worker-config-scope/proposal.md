## Why

The shared environment schema requires `DEVICE_ATTESTATION_KEK` for every process, so background workers that do not use device-attestation secrets—including the SMS/outbox worker—cannot validate configuration without an API/auth-only secret. The worker requirement should be scoped without weakening the API's existing KEK requirement or changing device-attestation behavior.

## What Changes

- Add a worker-scoped environment schema that makes `DEVICE_ATTESTATION_KEK` optional for background-worker configuration, while continuing to validate it if supplied.
- Use the worker-scoped schema for outbox/SMS provider configuration and credit-expiry worker configuration.
- Keep the API on the existing full schema, where the KEK remains required.

## Capabilities

### New Capabilities

- `background-worker-configuration`: defines the configuration boundary between background workers and API-only device-attestation secrets.

### Modified Capabilities

## Impact

- Affects `src/config/env.validation.ts`, `src/jobs/outbox-worker.runtime.ts`, `src/jobs/sms.provider.factory.ts`, and `src/jobs/credit-expiry.worker.ts`, plus focused configuration tests.
- The main worker bootstrap will be able to validate worker configuration without the KEK; API startup/auth validation remains unchanged.
- No SMS provider contract, Termii route, database schema, migration, or live SMS behavior changes. No credential or attestation-secret values are added to this change.
