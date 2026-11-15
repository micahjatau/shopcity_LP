## Context

See `proposal.md` for motivation and `specs/background-worker-configuration/spec.md` for the behavior contract. The API uses `envValidationSchema` through Nest configuration; outbox/SMS and credit-expiry worker config loaders currently validate against that same schema. The full worker bootstrap invokes both worker config loaders and the SMS provider factory before starting runtimes.

## Goals / Non-Goals

**Goals:**

- Preserve the full API environment contract and existing KEK fail-closed behavior.
- Make background-worker configuration independent of the KEK only when it is absent.
- Keep all other shared environment validation and deployment safety checks in force.

**Non-Goals:**

- Do not remove or rotate `DEVICE_ATTESTATION_KEK` from API/auth/device-attestation paths.
- Do not modify the Termii provider contract, SMS routes, templates, retry behavior, or credentials.
- Do not alter device-secret storage, backfill, migrations, or any live provider behavior.

## Decisions

1. **Derive a narrowly relaxed worker schema.** Export `workerEnvValidationSchema` from the existing schema module by forking only the `DEVICE_ATTESTATION_KEK` field to optional. Keep `envValidationSchema` as the API/full schema with its required field unchanged. The root cross-field validation will enforce KEK length and secret separation when a value is supplied, while allowing it to be absent for the worker variant. This is safer than making the global schema optional, which could allow API startup without a required auth secret.

2. **Use the worker schema at background config boundaries.** `loadWorkerConfig`, `createSmsProvider`, and `loadCreditExpiryWorkerConfig` will validate with the worker schema. `src/worker.ts` composes these loaders, so this removes the irrelevant KEK startup gate from the SMS/outbox worker and the credit-expiry portion of that process. The API `ConfigModule` remains bound to `envValidationSchema`.

3. **Keep other validation shared.** The worker schema is derived from the full schema rather than a hand-copied subset, preserving existing provider, deployment identity, secret-separation, and numeric-bound checks. When a KEK is present in a worker environment, its current minimum-strength and distinct-secret checks still apply.

4. **Keep the Termii change separate.** This is a distinct OpenSpec change for worker configuration. Do not add a KEK requirement or a KEK exception to the Termii provider behavior/spec; the provider factory simply uses the worker-scoped validator.

## Risks / Trade-offs

- **Schema derivation could accidentally weaken another field or skip root validation** → fork only the KEK field, keep the same root custom validation, and test worker/API behavior separately.
- **A future worker may actually consume the KEK** → it must declare that dependency explicitly and use an appropriate scoped validator rather than silently adding the KEK to all worker config.
- **The main worker starts multiple background runtimes** → switch every current full-schema worker config loader used by that bootstrap, not only the SMS provider factory.

## Migration Plan

1. Add the worker-scoped validator and update the current background-worker consumers.
2. Run schema, provider-factory, outbox-worker, and credit-expiry config tests with the KEK omitted; verify API validation remains on the full schema.
3. Deploy as a code-only configuration change. No database migration or KEK rotation is required.
4. Roll back by restoring the previous validators; this restores the shared KEK requirement for worker startup without affecting data.

## Open Questions

None. The boundary is limited to background configuration; API/auth remains unchanged.
