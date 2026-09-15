# Review 67 runtime certification evidence

## Repository evidence

- Duplicate receipt evidence failure handling is covered by unit tests.
- k6 report fixture validation is covered for valid, missing, and inaccessible
  branch configuration.
- The supported worker target is documented as the long-lived
  `node dist/src/worker.js` runtime built from the same candidate SHA as the API.
- Evidence redaction rules are documented for worker/SMS/provider state.
- `scripts/smoke/runtime-certification-evidence.mjs` builds safe worker SMS,
  card lifecycle, and k6 fixture evidence payloads and rejects secret-bearing
  keys/raw phone values.
- `scripts/smoke/verify-smoke-evidence.mjs --require-runtime-certification`
  requires PASS evidence for duplicate receipt regression, worker SMS terminal
  state, card lifecycle, report isolation performance, and provider terminal
  state before final Review 67 signoff.
- `scripts/smoke/review67-runtime-certification.mjs` implements the remaining
  authenticated runtime gates: duplicate-receipt 409/no-500 regression, card
  assignment/block/unblock/replacement concurrency, report p95 timing, and
  SMS/provider terminal-state aggregation.

## Environment-gated evidence

| Gate                         | Required safe evidence                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Secret store                 | Boolean/key-presence check for required SMS/worker secrets; no secret values.                     |
| Staging duplicate regression | Certified candidate URL, request ID, 409 outcome, durable duplicate audit/outbox IDs.             |
| Worker terminal SMS smoke    | API SHA, worker SHA, worker deployment ID, outbox ID, SMS ID, terminal state, timestamps.         |
| k6 report isolation          | Redacted branch fixture ID, setup success, no invalid-fixture 404 burst, latency summary.         |
| Card lifecycle smoke         | Assignment/replacement/block/unblock outcomes, concurrency result, no raw card/customer PII.      |
| Vercel inventory             | Project name, owner, aliases, last deployment, classification, and owner approval for retirement. |

## Local verification

- Full Semgrep scan completed with 0 findings after workflow, Docker, runtime,
  and test/tooling hardening.
- Local lint, build, unit, integration, smoke-helper, and OpenSpec gates passed
  during Review 67 follow-up.
- Corrected k6 report-isolation execution could not run locally because
  `K6_SESSION_TOKEN`, `K6_CSRF_TOKEN`, and `K6_REPORT_BRANCH_ID` were not
  available.
- Direct staging/provider smoke execution could not run from this shell because
  `SMOKE_BACKEND_URL`, `SMOKE_FRONTEND_URL`, `K6_CARD_SERIAL`,
  `K6_CUSTOMER_ID`, `EBULKSMS_USERNAME`, `EBULKSMS_API_KEY`, and
  `SMS_PROVIDER_MODE` were not available.

## GitHub follow-up issues

- Certified staging duplicate-receipt regression: https://github.com/micahjatau/shopcity_LP/issues/39
- Authenticated k6 report-isolation performance gate: https://github.com/micahjatau/shopcity_LP/issues/40
- SMS/provider terminal-state smoke evidence: https://github.com/micahjatau/shopcity_LP/issues/41
- Final runtime certification validation bundle: https://github.com/micahjatau/shopcity_LP/issues/42

## Current residual risk

Vercel and Sentry credentials were not available in the local engineering
session, so remote project inventory, secret-store verification, production
runtime logs, Sentry release inspection, authenticated k6 execution, and
staging/provider smoke evidence remain operator-gated.
