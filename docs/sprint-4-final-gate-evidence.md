# Sprint 4 Final Gate Evidence

Release candidate SHA: _pending final commit and CI run_

Validation date: 2026-08-11

## Review 43 closure local validation

- `npx jest src/modules/offline-sync/offline-sync.service.spec.ts src/modules/reports/report-snapshot.spec.ts src/modules/reports/report-materializer.service.spec.ts src/jobs/outbox-worker.runtime.spec.ts --runInBand`
- `npx jest test/report-materialization.int-spec.ts test/offline-earn-sync.int-spec.ts test/outbox-worker-recovery.int-spec.ts --config ./test/jest-int.json --runInBand`
- `npm run format:check`
- `npm run lint:src`
- `npm run lint:test`
- `npm run typecheck`
- `npm run build`
- `npm run architecture:check`
- `npm run test -- --runInBand`
- `npm run test:coverage:critical`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run openapi:lint`
- `npm run openapi:diff`
- `npm run client:generate`
- `npm run client:typecheck`
- `npm run openspec:validate`
- `npm run verify:release-artifacts`
- `npm run validate:scope`
- `DATABASE_URL='postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity?schema=public' npx prisma migrate deploy`
- `BRUNO_BASE_URL='http://127.0.0.1:3000' npm run bruno:test`

## Prior final-gate validation retained

- `npx jest src/jobs/branch-day-window.spec.ts src/jobs/outbox-worker.runtime.spec.ts src/modules/reports/report-materializer.service.spec.ts src/modules/reports/report-snapshot.spec.ts --runInBand`
- `npx jest test/offline-earn-sync.int-spec.ts --runInBand`
- `npx jest test/fraud-behavior.int-spec.ts --runInBand`
- `npx jest test/openapi.int-spec.ts --runInBand`
- `npm run openapi:lint`
- `npm run client:typecheck`
- `npm run client:generate`
- `npm run lint:src`
- `npm run lint:test`
- `npm run build`
- `npm run format:check`
- `npm run typecheck`
- `npm run architecture:check`
- `docker compose up -d`

## Notes

- Review 43 closure supersedes the earlier pending historical reporting, SMS, offline replay, online/offline receipt-race, and report-refresh evidence gaps.
- Local `detect_changes` before final commit reported HIGH risk across reporting and offline execution flows.
- The runtime validation for Bruno required starting the app in production mode with docs disabled.
- Capture the final immutable SHA and GitHub Actions run URL after commit and push.
