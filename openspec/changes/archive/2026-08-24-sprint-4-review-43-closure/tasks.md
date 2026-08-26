## 1. Proposal and impact evidence

- [x] 1.1 Read `docs/repo_review_43.md` and extract the exact remaining Sprint 4 blockers.
- [x] 1.2 Run proposal-time GitNexus impact analysis for reporting, offline replay, and SMS worker surfaces.
- [x] 1.3 Record impact analysis in `docs/development/gitnexus-impact-tracker.md`, including the HIGH-risk SMS mapper warning.
- [x] 1.4 Validate this OpenSpec change with `npm run openspec:validate` after artifacts are created.

## 2. Historical redemption reporting

- [x] 2.1 Add/adjust failing tests showing `buildDailyFinancialSummaries()` and redemption summaries disagree when a redemption is reversed after the requested `asOf`.
- [x] 2.2 Add/adjust failing tests showing a future `rejectedAt` does not leak backward into an earlier `asOf` snapshot.
- [x] 2.3 Select `rejectedAt` in report materializer redemption source queries and include it in `RedemptionRecord`/snapshot input types.
- [x] 2.4 Change redemption snapshot reconstruction to use lifecycle timestamps only, not current `Redemption.status`.
- [x] 2.5 Ensure every redemption-consuming report builder, including daily financial summaries, uses the normalized snapshot status.
- [x] 2.6 Verify targeted report snapshot and materializer unit tests.

## 3. SMS historical reconstruction

- [x] 3.1 Add failing `smsStatusAt()` tests for `QUEUED → FAILED → SENT → DELIVERED`, including assertions after the failure timestamp and after the retry success timestamp.
- [x] 3.2 Change `smsStatusAt()` to return the latest lifecycle transition at or before `asOf`, not fixed priority order.
- [x] 3.3 Add failing outbox worker tests proving successful or suppressed retry updates do not clear existing `failedAt`.
- [x] 3.4 Change `mapSmsDispatchResult()`/SMS update behavior to preserve failure evidence on later `SENT`, `DELIVERED`, and `SUPPRESSED` results.
- [x] 3.5 Verify report materialization can reconstruct a failed SMS watermark after a later successful retry.

## 4. Offline replay ownership and receipt races

- [x] 4.1 Add a deliberately slow-owner replay test where a follower times out waiting and returns ephemeral `SYNC_RECORD_PROCESSING` without updating the canonical row.
- [x] 4.2 Change follower replay timeout behavior so only the owner request can call `persistResult()` for a canonical `OfflineSyncAttempt`.
- [x] 4.3 Add offline→online same-receipt coverage proving online deterministically loses after offline success and no duplicate financial side effects exist.
- [x] 4.4 Add simultaneous online↔offline same-receipt coverage with different idempotency keys and offline `localId`, asserting exactly one receipt, one earn ledger entry, and one credit lot.
- [x] 4.5 Add simultaneous offline↔offline same-receipt coverage with different `localId` and idempotency keys, asserting exactly one financial effect.
- [x] 4.6 Verify targeted offline integration tests.

## 5. Report-refresh integration evidence

- [x] 5.1 Add an integration test for `report.refresh` `PENDING → recovery → publish → worker → materialize → COMPLETED` using real worker/runtime dependencies.
- [x] 5.2 Extend the integration test for stale `PUBLISHED`/`processedAt=null` recovery.
- [ ] 5.3 Assert completed/dead-lettered report refresh events are excluded from recovery.
- [x] 5.4 Verify no duplicate materialization output is produced by replay/recovery.

## 6. Tracker and release evidence reconciliation

- [x] 6.1 Update older Sprint 4 OpenSpec trackers so completed, superseded, and still-open Review 43 items do not contradict each other.
- [x] 6.2 Update `docs/sprint-4-final-gate-evidence.md` with Review 43 local commands; final immutable SHA and CI URL are captured after commit/push.
- [x] 6.3 Ensure OpenAPI/client/Bruno evidence is only marked complete after it is rerun on the final implementation SHA.
- [x] 6.4 Record `detect_changes` output before final commit and call out any HIGH/CRITICAL risk.

## 7. Final validation gate

- [x] 7.1 Run targeted Jest suites for reporting snapshots/materialization, SMS outbox worker behavior, offline sync races, and report-refresh integration.
- [x] 7.2 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run architecture:check`.
- [x] 7.3 Run `npm run test -- --runInBand`, `npm run test:coverage:critical`, `npm run test:integration`, and `npm run test:e2e`.
- [x] 7.4 Run `npm run openapi:lint`, `npm run openapi:diff`, `npm run client:generate`, and `npm run client:typecheck`.
- [x] 7.5 Run `npm run openspec:validate`, `npm run verify:release-artifacts`, `npm run validate:scope`, and Bruno journeys where applicable.
- [ ] 7.6 Push the final SHA and watch GitHub CI until Static Checks, Integration Tests, End-to-End Tests, and GitNexus are green.
