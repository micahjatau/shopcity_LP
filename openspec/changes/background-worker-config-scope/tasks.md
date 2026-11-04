## 1. Scoped validation

- [x] 1.1 Add a worker-scoped environment schema that makes only `DEVICE_ATTESTATION_KEK` optional while preserving the API schema and supplied-key safety checks; verify with environment-schema tests.
- [x] 1.2 Switch outbox/SMS and credit-expiry configuration loaders to the worker schema; verify each loader accepts valid configuration without a KEK and still rejects invalid provider/worker settings.

## 2. Documentation and verification

- [x] 2.1 Update the development handoff to distinguish worker startup from API/auth KEK requirements; verify it no longer claims a missing KEK blocks SMS worker configuration.
- [x] 2.2 Run focused environment, SMS-factory, outbox-worker, and credit-expiry tests; verify all pass without live SMS requests.
- [x] 2.3 Run full Jest, lint, typecheck, build, strict OpenSpec validation, and GitNexus change detection; verify API validation remains on the full schema and preserve pre-existing worktree artifacts.
