# Repo Review 34 Release Evidence

Final release candidate SHA: `9e04f0c488c9d5d5b630023bab95ff4b2ed5c608`

Issue #1: `https://github.com/micahjatau/shopcity_LP/issues/1` reopened for release-evidence tracking.

## Available Evidence

- Shared backup source: `/tmp/opencode/shared_schema.sql` and `/tmp/opencode/shared_public_data.sql`
- Restore reconciliation report: `migration-reconciliation.json`
- Restore object inventory: `object-probes.json`
- Protected shared-backup restore test: `npx jest test/financial-repair-restore.int-spec.ts --config ./test/jest-int.json --runInBand -t "protected shared-backup"`
- Synthetic upgrade-path test: `npx jest test/financial-repair-restore.int-spec.ts --config ./test/jest-int.json --runInBand -t "synthetic upgrade-path"`
- SQL runbook execution test: `npx jest test/receipt-quarantine-sql.int-spec.ts --config ./test/jest-int.json --runInBand`
- OpenAPI and client validation: `npm run openapi:lint`, `npm run openapi:diff`, `npm run client:generate`, `npm run client:typecheck`
- Validation-scope check: `npm run validate:scope`
- Release-artifact check: `npm run verify:release-artifacts`

## Local Validation

- Passed: `npm run validate:scope`
- Passed: `npm run verify:release-artifacts`
- Passed: `npm test -- --runInBand`
- Passed: `SHOPCITY_SHARED_SCHEMA_DUMP_PATH=/tmp/opencode/shared_schema.sql SHOPCITY_SHARED_DATA_DUMP_PATH=/tmp/opencode/shared_public_data.sql npm run test:integration`
- Passed: `npm run test:e2e`
- Passed: `npm run architecture:check`
- Passed: `npm run openapi:lint`
- Passed: `npm run openapi:diff`
- Passed: `npm run client:generate`
- Passed: `npm run client:typecheck`
- Passed: `npm run prisma:validate`
- Passed: `npm run build`
- Passed: `npm run verify:prod-entrypoints`
- Passed: `npm run gitnexus:smoke`
- Passed: `npm run lint`

## Pending External Evidence

- Green CI workflow URL and run ID
- Real SMS smoke-test evidence
- Exact-head release workflow evidence package from GitHub Actions
- Production deployment checklist completion

## Reference CI Run

- `https://github.com/micahjatau/shopcity_LP/actions/runs/30769260527`
- Branch: `master`
- Head SHA: `e002576de57ee551cc90ae2b972a3cd5d467dfc1`

## Notes

- Halfway production deployment remains no-go until the missing external evidence is attached.
- The receiptless Adjustment/Reversal execution path remains deferred.
