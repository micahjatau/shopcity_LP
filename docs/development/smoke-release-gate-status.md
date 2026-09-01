# Smoke Release-Gate Status

## Automated gates

The following gates have passed in the current working tree:

- Source and test lint
- Typecheck and production builds
- Unit, E2E, integration, and critical-coverage suites
- OpenAPI lint/diff and Prisma validation
- Architecture and validation-scope checks
- Client typecheck
- Smoke evidence tests and Playwright smoke discovery
- Docker `actionlint` for staging and production workflows

## Explicit exceptions

The repository-wide format check reports four pre-existing dirty files:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/pr_review_1.md`
- `apps/web/test-results/.last-run.json`

These files were not reformatted because the smoke implementation must preserve unrelated working-tree changes. The smoke-owned files pass targeted formatting checks.

GitNexus incremental analysis currently reports a corrupted existing FTS index (`file_fts`). A maintainer must rebuild the local index before relying on a complete final blast-radius report. `detect_changes` currently reports no mapped changes.

## Current staging failure snapshot

Latest completed staging run: [33439382153](https://github.com/micahjatau/shopcity_LP/actions/runs/33439382153), candidate `a9a063a5fca7b25f87d6a94d04b9516d3ef82e90`.

The run failed with eight tests and the following observed symptoms:

- Reconciliation failed for `balance` and `outbox backlog`.
- Smoke fixture baseline capture could not find `fraud.openCount` / `outbox.backlogCount` in the returned report summary.
- Offline Earn observed zero queued/processed records where a record was expected.
- Earn/approval and redeem workflows still had failed content assertions and click timeouts.
- Some role-page visibility assertions still found no matching UI element.

These failures are not yet classified as test-only: fixture response shape and seeded state require API verification, while offline queue behavior and workflow failures require product-path investigation before changing assertions.

## Latest staging failure snapshot

Latest completed staging run: [33537488997](https://github.com/micahjatau/shopcity_LP/actions/runs/33537488997), candidate `19e385ea0227831799da2b16ca33ed6b02f01931`. All 41 Playwright tests passed; teardown failed closed with `balance (expected 2252820, received 2202820)` and `outbox backlog (expected 287, received 312)`.

The balance drift was traced to the cross-role Redeem scenario not registering its confirmed transaction for canonical reversal. The backlog was traced to terminal SMS outbox rows remaining `PUBLISHED` instead of becoming `COMPLETED`, compounded by the staging smoke workflow not running the worker. These are addressed in the smoke reconciliation, outbox runtime, and staging workflow changes on the current branch. The staging backlog was drained through the existing worker path during diagnosis; no financial or audit rows were deleted.

## Remediation priority

1. **P0 — Establish trustworthy diagnostics:** verify the staging fixture/report response shape, seeded customer/card balance, fraud state, and outbox baseline through the API. Fix the backend contract or fixture parser as appropriate.
2. **P0 — Verify financial invariants:** resolve balance drift and outbox residue using canonical setup/reversal flows; do not weaken reconciliation or delete immutable history.
3. **P1 — Trace Offline Earn end to end:** confirm IndexedDB persistence while offline, queue rendering, batch submission, and server response mapping. Fix application behavior if the record is genuinely lost.
4. **P1 — Stabilize prerequisite sequencing:** run targeted earn/approval/redeem tests with explicit prerequisite IDs and verify each state transition through the API.
5. **P2 — Review remaining UI failures:** only update selectors or expected copy after confirming the corresponding role route and product behavior are correct.
6. **P0 release gate — Redeploy and rerun staging:** update exact SHA provenance variables, run the complete suite, review evidence, and keep production certification blocked until staging is fully green.

## Operational gates still required

- Provision and validate the deterministic staging/production smoke tenant, fraud flag, device, users, cards, and spare cards.
- Set deployed frontend/backend provenance variables to the exact candidate SHA.
- Execute staging smoke and retain the evidence artifact.
- Review staging evidence, then execute the manually approved production workflow.
- Resolve any reconciliation failure before rerun; never bypass the production safety lock.
