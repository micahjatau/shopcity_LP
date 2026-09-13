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

## Environment-gated evidence

| Gate                         | Required safe evidence                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Secret store                 | Boolean/key-presence check for required SMS/worker secrets; no secret values.                     |
| Staging duplicate regression | Certified candidate URL, request ID, 409 outcome, durable duplicate audit/outbox IDs.             |
| Worker terminal SMS smoke    | API SHA, worker SHA, worker deployment ID, outbox ID, SMS ID, terminal state, timestamps.         |
| k6 report isolation          | Redacted branch fixture ID, setup success, no invalid-fixture 404 burst, latency summary.         |
| Card lifecycle smoke         | Assignment/replacement/block/unblock outcomes, concurrency result, no raw card/customer PII.      |
| Vercel inventory             | Project name, owner, aliases, last deployment, classification, and owner approval for retirement. |

## Current residual risk

Vercel and Sentry credentials were not available in the local engineering
session, so remote project inventory, secret-store verification, production
runtime logs, and Sentry release inspection remain operator-gated.
