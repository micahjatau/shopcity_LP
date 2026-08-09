Run npm run test:integration
npm run test:integration
shell: /usr/bin/bash -e {0}

> shopcity-lp@0.0.1 test:integration
> jest --config ./test/jest-int.json --runInBand

FAIL test/receipts.int-spec.ts (17.099 s)
● receipt capture flows (int) › captures and replays the same receipt for the same idempotency key

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › rejects the same receipt when idempotency keys differ

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › rejects the same receipt when a different cashier submits it

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › serializes concurrent captures of the same physical receipt

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › rejects the same receipt when a different card is used

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › accepts the same receipt on a week boundary

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › accepts a zero-based receipt week start day

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › rejects invalid stored receipt week start values

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › binds the device to the session and rejects spoofed receipt device fields

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › derives the receipt branch from the transaction snapshot when a device is reassigned after login

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › rejects future and stale cashier timestamps

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › allows a privileged timestamp override with audit evidence

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › marks purchases beyond the approval threshold as pending approval

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › enforces the hard purchase ceiling

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › approves a pending receipt from a different reviewer

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › rejects self-approval on a pending receipt

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › rejects a pending receipt through the approval workflow

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › allows an expired completed idempotency record to be ignored

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt capture flows (int) › allows an expired pending idempotency record to be ignored

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/auth-http.int-spec.ts (15.511 s)
● auth and readiness flows (int) › logs in, rotates, rejects stale sessions, and logs out over HTTP

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › binds login sessions to attested devices

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › rejects login when the device attestation is missing or invalid

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › allows bearer-authenticated unsafe requests without CSRF

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › writes ip, account, and pair buckets for login throttling

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › serializes cashier customer reads with active balance and without PII

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › serializes supervisor customer reads without raw bigint or credit lots

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › serializes card lookup with minimized customer active balance

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › returns 201 for confirmed redemption and 202 for pending approval redemption

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › returns RATE_LIMITED when earn throttling is exhausted

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › rejects protected requests when the tenant or branch is inactive

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › serves branch config from the database

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › rejects public config when the tenant or branch is inactive

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● auth and readiness flows (int) › reports readiness from live postgres and redis dependencies

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/immutable-earn-ledger.int-spec.ts (16.104 s)
● immutable earn ledger (int) › records a confirmed earn atomically and replays idempotently

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › clamps leap-day expiry to the last valid day of the target month

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › creates approval records and executes them exactly once

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › persists expired approvals without financial side effects

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › rejects receipt evidence mutation but allows workflow metadata updates

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › rejects credit lot source mismatches and immutable source updates

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › enforces derived credit lot expiry on insert

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › rejects stale approval policies without financial side effects

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › serializes concurrent captures of the same receipt

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● immutable earn ledger (int) › returns the same response for concurrent same-key earn requests

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/redemption-approval.int-spec.ts (15.402 s)
● redemption approval lifecycle (int) › creates, lists, and executes a real high-value redemption approval

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption approval lifecycle (int) › returns the same response for concurrent same-key redemption requests

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption approval lifecycle (int) › returns RECEIPT_ALREADY_USED for concurrent different-key duplicate receipts

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption approval lifecycle (int) › prevents concurrent immediate redemptions from overdrawing lots

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption approval lifecycle (int) › allows only one supervisor to execute a redemption approval

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption approval lifecycle (int) › prevents approval execution racing another redemption from overdrawing balance

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/outbox-worker-recovery.int-spec.ts (15.873 s)
● outbox worker recovery (int) › keeps Redis empty until the worker publishes committed outbox rows

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● outbox worker recovery (int) › publishes pending outbox rows and delivers sms after worker recovery

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● outbox worker recovery (int) › recovers queued deliveries after a Redis outage and restart

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● outbox worker recovery (int) › backfills missing sms rows for published outbox events

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● outbox worker recovery (int) › keeps multi-worker recovery to one sms delivery per outbox event

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● outbox worker recovery (int) › records sms delivery failure when the provider rejects a message

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/lot-allocation-ordering.int-spec.ts (15.235 s)
● lot allocation ordering (int) › allocates FIFO by expiry, earned-at, and id while ignoring ineligible lots

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/redemption-allocation-invariants.int-spec.ts (15.363 s)
● redemption allocation invariants (int) › accepts allocation rows when debit totals and lot balance evidence match

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption allocation invariants (int) › rejects allocation rows that are not reflected in credit lot balance

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption allocation invariants (int) › rejects allocation totals that do not equal the debit ledger amount

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● redemption allocation invariants (int) › rejects restoration rows that are not reflected in credit lot balance

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/sms-reference-backfill.int-spec.ts (15.331 s)
● sms reference backfill (int) › derives historical sms references from outbox payloads where possible

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/receipt-migration-upgrade.int-spec.ts (45.321 s)
● receipt integrity migration upgrade › preserves trimmed legacy identity and drops legacy receipt columns

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt integrity migration upgrade › rejects null and whitespace-only legacy receipt references

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● receipt integrity migration upgrade › rejects duplicate legacy POS receipt identities

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

PASS test/openapi.int-spec.ts
FAIL test/phase-1.int-spec.ts (15.275 s)
● phase 1 service flows › normalizes phones and blocks duplicate active customers

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● phase 1 service flows › preserves card replacement history

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● phase 1 service flows › issues and refreshes backend sessions

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● phase 1 service flows › rejects concurrent session rotation attempts

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● phase 1 service flows › blocks duplicate active card creation and replacement races

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/financial-state-invariants.int-spec.ts (15.184 s)
● financial state invariants (int) › rejects incoherent redemption lifecycle rows

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● financial state invariants (int) › rejects incoherent approval lifecycle rows

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● financial state invariants (int) › rejects ledger rows without required evidence

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● financial state invariants (int) › rejects unsupported ledger type and direction pairs

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● financial state invariants (int) › prevents redemption evidence mutation

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/redis-throttle-fail-closed.int-spec.ts (15.385 s)
● redis throttling fail-closed (int) › returns service unavailable when Redis cannot be reached

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/tenant-ownership.int-spec.ts (15.374 s)
● tenant ownership constraints › rejects cross-tenant actor and audit writes

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

● tenant ownership constraints › persists actorless system audit events

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

FAIL test/customer-email.int-spec.ts (15.43 s)
● customer email identity › stores and searches customers by email and card serial

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": context deadline exceeded

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

PASS test/health.int-spec.ts
FAIL test/outbox-migration-deploy.int-spec.ts (15.191 s)
● outbox migration deploy (int) › applies the outbox schema cleanly and exposes the expected indexes

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

PASS test/bootstrap-credential.int-spec.ts
FAIL test/prisma.int-spec.ts (15.184 s)
● Prisma + PostgreSQL › executes a basic query

    (HTTP code 500) server error - Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

      at ../node_modules/docker-modem/lib/modem.js:389:17
      at handler (../node_modules/docker-modem/lib/modem.js:432:11)
      at IncomingMessage.<anonymous> (../node_modules/docker-modem/lib/modem.js:421:9)

Test Suites: 16 failed, 3 passed, 19 total
Tests: 80 failed, 13 passed, 93 total
Snapshots: 0 total
Time: 282.037 s
Ran all test suites.
Error: Process completed with exit code 1.
