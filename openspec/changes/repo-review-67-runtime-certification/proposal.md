# Proposal: Close review 67 runtime certification blockers

## Why

`docs/repo_review_67.md` identifies a reproducible production defect and several release-certification gaps. Duplicate-receipt earn requests can return `500 SYSTEM_ERROR` when Vercel runs Prisma with `connection_limit=1`: `LoyaltyService.earn()` holds the only connection and then starts a nested transaction through `recordDuplicateReceiptAttempt()`.

The same review shows that the deployed Vercel API does not run `src/worker.ts`, so a green API deployment cannot certify SMS dispatch, outbox recovery, report materialization, or expiry workers. The checked-in Vercel configuration also enables deterministic/fake SMS settings in a production deployment. Finally, the k6 report-isolation scenario falls back to a synthetic branch UUID and can produce misleading 404 performance evidence.

These gaps must be closed before certifying the affected release candidate.

## What changes

### Duplicate-receipt transaction safety

- Refactor duplicate-receipt detection and evidence persistence so the earn endpoint never opens a nested Prisma transaction while the outer earn transaction holds a single pooled connection.
- Preserve the required behavior: duplicate financial work is rejected with `409 RECEIPT_ALREADY_USED`, while duplicate-attempt audit and fraud-evaluation outbox evidence survives the rejected financial transaction.
- Add a regression test that runs the duplicate path with a one-connection Prisma configuration and verifies no transaction-start timeout or `500` response.

### Performance fixture validity

- Remove the silent fake report branch fallback from the k6 pilot or require an explicit `K6_REPORT_BRANCH_ID`.
- Validate during setup that the configured report branch exists and fail the run before measuring report latency when it does not.
- Preserve valid executive-summary latency and isolation assertions.

### Worker deployment and release evidence

- Define a separately deployable long-lived worker runtime for environments where Vercel only deploys `api/index.ts`.
- Require worker startup evidence (`SHOPCITY_WORKER_READY`) and exact candidate-SHA provenance for the worker and API before release certification.
- Add an end-to-end staging certification path proving earn creates an outbox event and the worker delivers it to the terminal SMS-provider state.
- Record worker deployment identity, runtime SHA, readiness, and terminal outbox/SMS state in release evidence.

### Production SMS safety

- Remove checked-in production settings that enable deterministic/fake SMS.
- Require production worker configuration to use the real SMS provider and explicitly reject fake SMS in production.
- Add configuration and deployment validation so a future worker cannot start with the unsafe combination.
- Close the remaining SMS correctness gaps: queued/terminal counts must reflect actual outbox/provider state, and delivery evidence must distinguish API enqueue success from worker/provider completion.

### Card and report correctness

- Send the required SMS notification on card replacement and test the replacement workflow.
- Normalize card serials server-side consistently across assignment, lookup, replacement, and transaction operations; never trust client formatting or client-only normalization.
- Review executive-summary read-model semantics for stock-versus-flow metrics, SMS queued counts, redemption metrics, and cashier metrics; add contract and integration coverage for the corrected definitions.
- Add runtime evidence for card assignment, replacement, block/unblock, and replacement concurrency rather than treating an absence of Vercel errors as health proof.

### Infrastructure and dependency hygiene

- Identify and retire or disconnect obsolete duplicate Vercel projects after explicit ownership approval, without deleting active deployments.
- Resolve or document the `vercel.json` build-configuration override warning and review deprecated dependency/allow-scripts warnings as a separate release-hygiene gate.

## Capabilities

### New capabilities

- `duplicate-receipt-single-connection-safety`: Duplicate earn attempts persist security evidence without nested transactions or false 500 responses.
- `worker-runtime-release-provenance`: API and worker runtimes are independently deployed, ready, and proven to run the same candidate SHA.
- `valid-report-performance-fixtures`: Performance tests fail early on invalid report fixtures instead of producing misleading latency evidence.

### Modified capabilities

- `sms-outbox-delivery-certification`: Release evidence covers the worker path from outbox creation through terminal provider state.
- `production-sms-configuration`: Production deployments cannot enable deterministic or fake SMS behavior.
- `card-lifecycle-integrity`: Card serial identity and replacement notification behavior are server-owned and tested.
- `report-read-model-correctness`: Executive-summary metrics use documented stock/flow and operational-state semantics.
- `release-certification-evidence`: Worker identity, readiness, SHA, and outbox delivery results are required evidence.
- `deployment-topology-governance`: Active and obsolete Vercel projects are explicitly identified and governed.

## Impact

- `src/modules/loyalty/loyalty.service.ts` and duplicate-receipt unit/integration tests.
- `scripts/performance/k6-pilot.js` and performance-run setup/configuration.
- `src/worker.ts`, worker deployment scripts/workflows, and runtime provenance endpoints/evidence.
- `vercel.json`, environment validation, and SMS provider configuration tests.
- Card module services/controllers and card lifecycle tests.
- Reports read models/controllers and report contract/integration tests.
- Release certification workflows, runbooks, and evidence schemas.
- Vercel project inventory and dependency/build configuration documentation.
- No change to ledger arithmetic, confirmed financial history, authorization boundaries, or customer-facing route contracts beyond the corrected duplicate-receipt error behavior.

## Acceptance criteria

- Duplicate receipt earn requests return `409 RECEIPT_ALREADY_USED`, never `500`, with Prisma `connection_limit=1`.
- Duplicate-attempt audit and `fraud.evaluate` outbox evidence remain durable after the rejected financial transaction.
- The k6 report-isolation scenario refuses to run without an existing configured branch and no longer treats a synthetic fallback as valid evidence.
- A separately deployed worker reports `SHOPCITY_WORKER_READY` and the same exact candidate SHA as the certified API.
- Staging evidence proves an earn-created outbox event reaches terminal SMS-provider state through the worker.
- Production configuration uses real SMS delivery and does not enable fake SMS.
- SMS metrics and evidence distinguish queued, attempted, delivered, suppressed, and failed states.
- Card replacement emits the required notification and serial identity is canonicalized server-side across lifecycle operations.
- Executive-summary report metrics have documented and tested stock/flow, redemption, cashier, and SMS-state semantics.
- Every Vercel project is classified as active or obsolete, with obsolete projects retired only through explicit approval.
- Release evidence includes API/worker deployment IDs, candidate/runtime SHAs, readiness, terminal outbox state, and verifier results.

## Non-goals

- Do not increase Prisma pool size as a workaround for the nested transaction defect.
- Do not change report controller semantics to hide invalid-branch 404 responses.
- Do not certify SMS delivery from API health checks alone.
- Do not introduce GraphQL, microservices, or a new deployment platform.
- Do not rewrite ledger, balance, approval, fraud, or reconciliation rules unrelated to duplicate-attempt evidence.
