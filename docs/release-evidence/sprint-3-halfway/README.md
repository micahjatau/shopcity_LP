# Sprint 3 Halfway Release Evidence

Final release candidate SHA: `3563492bef654d4fad4eb51efadb3e48e0ade631`

Reviewer: OpenCode
Review date: 2026-08-04

Workflow run URL: `TBD`
Workflow run ID: `TBD`

## Available Evidence

- Current release SHA: `3563492bef654d4fad4eb51efadb3e48e0ade631`
- OpenAPI contract validation: `npx jest test/openapi.int-spec.ts --config ./test/jest-int.json --runInBand`
- Reversal runtime validation: `npx jest src/modules/reversals/reversals.controller.spec.ts src/modules/reversals/reversals.service.spec.ts --runInBand`
- TypeScript validation: `npm run typecheck`
- App build: `npm run build`
- Generated client validation: `npm run client:typecheck`
- Client regeneration: `npm run openapi:export && npm run client:generate`
- Quarantine SQL integration: `npx jest test/receipt-quarantine-sql.int-spec.ts --config ./test/jest-int.json --runInBand`
- Validation-scope check: `node scripts/validation-scope.cjs`

## Pending External Evidence

- Protected shared-backup restore workflow run
- Migration reconciliation report
- Object inventory report
- Financial-row probes
- Device-secret backfill counts
- SMS smoke evidence
- Quarantine dry-run evidence
- Deployment checklist evidence
- Rollback checklist evidence

## Deferred Capabilities

- Transaction reversal execution
- Manual balance adjustment execution
- Receiptless transaction-detail reads
- Receiptless customer-ledger reads
