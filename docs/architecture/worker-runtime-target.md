# Worker runtime target

## Supported target

ShopCity uses one NestJS modular-monolith codebase with two runtime commands built
from the same immutable candidate SHA:

- API runtime: the HTTP API entrypoint.
- Worker runtime: `node dist/src/worker.js`.

The worker must run on a long-lived Node.js/container process with Redis and
Postgres connectivity. Vercel serverless API deployments are not the supported
worker target because they do not keep BullMQ processors, recovery loops, report
materialization sweeps, or expiry workers alive.

## Release contract

A releasable candidate must record:

- API deployment ID and runtime SHA.
- Worker deployment ID and runtime SHA.
- `SHOPCITY_WORKER_READY` evidence from the actual worker entrypoint.
- The same candidate SHA for API and worker before mutating smoke fixtures.
- Terminal outbox/SMS state evidence for provider-facing notification claims.

## Redaction rules

Worker evidence must never include credentials, cookies, session material, raw
SMS provider payloads, message content, or unmasked phone numbers. Evidence may
include opaque internal IDs, timestamps, state names, counts, release SHA, and
masked identifiers.
