# Sprint 4 Final Gate Evidence

Release candidate SHA: _pending final commit_

Validation date: 2026-08-11

## Passed validation

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
- `DATABASE_URL='postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity?schema=public' npx prisma migrate deploy`
- `docker compose up -d`
- `BRUNO_BASE_URL='http://127.0.0.1:3000' npm run bruno:test`

## Notes

- The runtime validation for Bruno required starting the app in production mode with docs disabled.
- The repository currently has no committed release-candidate SHA for this final gate; capture it after the final commit.
