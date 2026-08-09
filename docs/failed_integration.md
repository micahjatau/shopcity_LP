Run npm run test:integration

> shopcity-lp@0.0.1 test:integration
> jest --config ./test/jest-int.json --runInBand

FAIL test/receipts.int-spec.ts (28.124 s)
● receipt capture flows (int) › captures and replays the same receipt for the same idempotency key

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › rejects the same receipt when idempotency keys differ

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › rejects the same receipt when a different cashier submits it

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › serializes concurrent captures of the same physical receipt

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › rejects the same receipt when a different card is used

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › accepts the same receipt on a week boundary

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › accepts a zero-based receipt week start day

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › rejects invalid stored receipt week start values

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › binds the device to the session and rejects spoofed receipt device fields

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › derives the receipt branch from the transaction snapshot when a device is reassigned after login

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › rejects future and stale cashier timestamps

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › allows a privileged timestamp override with audit evidence

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › marks purchases beyond the approval threshold as pending approval

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › enforces the hard purchase ceiling

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › approves a pending receipt from a different reviewer

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › rejects self-approval on a pending receipt

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › rejects a pending receipt through the approval workflow

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › allows an expired completed idempotency record to be ignored

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● receipt capture flows (int) › allows an expired pending idempotency record to be ignored

    Redis at redis://127.0.0.1:45245 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (receipts.int-spec.ts:49:16)

● Test suite failed to run

    spawn redis-server ENOENT

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32770"

13 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`

┌─────────────────────────────────────────────────────────┐
The following migration(s) have been applied:
│ Update available 6.19.3 -> 7.9.0 │
│ │
│ This is a major update - please follow the guide at │
│ https://pris.ly/d/major-version-upgrade │
│ │
│ Run the following to update │
│ npm i --save-dev prisma@latest │
│ npm i @prisma/client@latest │

└─────────────────────────────────────────────────────────┘
migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql

All migrations have been successfully applied.
FAIL test/outbox-worker-recovery.int-spec.ts (96.739 s)
● outbox worker recovery (int) › keeps Redis empty until the worker publishes committed outbox rows

    spawn redis-server ENOENT

● outbox worker recovery (int) › keeps Redis empty until the worker publishes committed outbox rows

    Redis at redis://127.0.0.1:34209 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (outbox-worker-recovery.int-spec.ts:66:22)

● outbox worker recovery (int) › publishes pending outbox rows and delivers sms after worker recovery

    spawn redis-server ENOENT

● outbox worker recovery (int) › publishes pending outbox rows and delivers sms after worker recovery

    Redis at redis://127.0.0.1:43333 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (outbox-worker-recovery.int-spec.ts:106:22)

● outbox worker recovery (int) › recovers queued deliveries after a Redis outage and restart

    spawn redis-server ENOENT

● outbox worker recovery (int) › recovers queued deliveries after a Redis outage and restart

    Redis at redis://127.0.0.1:33971 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (outbox-worker-recovery.int-spec.ts:180:22)

● outbox worker recovery (int) › backfills missing sms rows for published outbox events

    spawn redis-server ENOENT

● outbox worker recovery (int) › backfills missing sms rows for published outbox events

    Redis at redis://127.0.0.1:33461 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (outbox-worker-recovery.int-spec.ts:285:22)

● outbox worker recovery (int) › keeps multi-worker recovery to one sms delivery per outbox event

    spawn redis-server ENOENT

● outbox worker recovery (int) › keeps multi-worker recovery to one sms delivery per outbox event

    Redis at redis://127.0.0.1:39625 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (outbox-worker-recovery.int-spec.ts:361:22)

● outbox worker recovery (int) › records sms delivery failure when the provider rejects a message

    spawn redis-server ENOENT

● outbox worker recovery (int) › records sms delivery failure when the provider rejects a message

    Redis at redis://127.0.0.1:37615 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (outbox-worker-recovery.int-spec.ts:429:22)

FAIL test/auth-http.int-spec.ts (18.607 s)
● auth and readiness flows (int) › logs in, rotates, rejects stale sessions, and logs out over HTTP

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › binds login sessions to attested devices

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › rejects login when the device attestation is missing or invalid

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › allows bearer-authenticated unsafe requests without CSRF

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › writes ip, account, and pair buckets for login throttling

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › rejects protected requests when the tenant or branch is inactive

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › serves branch config from the database

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › rejects public config when the tenant or branch is inactive

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● auth and readiness flows (int) › reports readiness from live postgres and redis dependencies

    Redis at redis://127.0.0.1:43867 did not become ready in time

      136 |   }
      137 |
    > 138 |   throw new Error(`Redis at ${redisUrl} did not become ready in time`);
          |         ^
      139 | }
      140 |
      141 | async function waitForTcpPort(

      at waitForRedisToBeReady (support/redis-testcontainer.ts:138:9)
      at startProcess (support/redis-testcontainer.ts:42:5)
      at createRedisTestEnvironment (support/redis-testcontainer.ts:55:3)
      at Object.<anonymous> (auth-http.int-spec.ts:34:16)

● Test suite failed to run

    spawn redis-server ENOENT

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32772"

13 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql

All migrations have been successfully applied.
PASS test/immutable-earn-ledger.int-spec.ts (6.224 s)
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-Ueab0v/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32773"

6 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql

All migrations have been successfully applied.
Script executed successfully.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-Ueab0v/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32773"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`

The following migration(s) have been applied:

migrations/
└─ 20260720_receipt_integrity_gate/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-WXBEzS/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32774"

6 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql

All migrations have been successfully applied.
Script executed successfully.
Script executed successfully.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-WXBEzS/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32774"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Receipt legacy POS references are missing

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Receipt legacy POS references are missing", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 24 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-tGYiKD/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32775"

6 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql

All migrations have been successfully applied.
Script executed successfully.
Script executed successfully.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-tGYiKD/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32775"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Duplicate legacy POS receipt identities require resolution

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Duplicate legacy POS receipt identities require resolution", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 15 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

PASS test/receipt-migration-upgrade.int-spec.ts (28.224 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32776"

13 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/phase-1.int-spec.ts (6.442 s)
PASS test/openapi.int-spec.ts
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32777"

13 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[18:43:06.685] INFO (2781): request errored {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38129","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46166},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","content-type":"application/json; charset=utf-8","content-length":"319"}},"responseTime":3201}
err: {
"type": "Error",
"message": "failed with status code 503",
"stack":
Error: failed with status code 503
at onResFinished (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:115:39)
at ServerResponse.onResponseComplete (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:178:14)
at ServerResponse.emit (node:events:531:35)
at onFinish (node:_http_outgoing:1084:10)
at callback (node:internal/streams/writable:766:21)
at afterWrite (node:internal/streams/writable:710:5)
at afterWriteTick (node:internal/streams/writable:696:10)
at processTicksAndRejections (node:internal/process/task_queues:88:21)
}
PASS test/redis-throttle-fail-closed.int-spec.ts (9.383 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32778"

13 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql

All migrations have been successfully applied.
PASS test/tenant-ownership.int-spec.ts (5.566 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32779"

13 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/customer-email.int-spec.ts (5.396 s)
PASS test/health.int-spec.ts
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32780"

13 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql

All migrations have been successfully applied.
PASS test/outbox-migration-deploy.int-spec.ts (5.17 s)
PASS test/bootstrap-credential.int-spec.ts
PASS test/prisma.int-spec.ts

Test Suites: 3 failed, 11 passed, 14 total
Tests: 34 failed, 28 passed, 62 total
Snapshots: 0 total
Time: 215.846 s
Ran all test suites.
Error: Process completed with exit code 1.
