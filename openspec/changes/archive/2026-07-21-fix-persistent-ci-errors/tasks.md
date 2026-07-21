## 1. Stabilize Integration Harnesses

- [x] 1.1 Replace unsafe `any` and `require()` usage in `test/redis-throttle-fail-closed.int-spec.ts` with typed imports and typed app references.
- [x] 1.2 Align the auth and receipt integration specs with the static bootstrap pattern and consistent Supabase auth mock shapes.
- [x] 1.3 Remove obsolete lint-disable directives that are no longer needed after the harness cleanup.

## 2. Fix Suite Teardown

- [x] 2.1 Ensure each integration spec closes the Nest app, Prisma client, Redis test environment, and Postgres container in `afterAll`.
- [x] 2.2 Verify the integration suite exits cleanly without open-handle warnings or timeouts.

## 3. Validate CI Baseline

- [x] 3.1 Run `npm run typecheck` and confirm it passes.
- [x] 3.2 Run `npm run lint` and confirm the integration specs are clean.
- [x] 3.3 Run `npm run test:integration` and confirm the suite completes successfully.
