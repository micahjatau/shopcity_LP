# Local report demo data

Use this one-shot seed only for the running local API database, `shopcity_profiles_local_20260929` on `127.0.0.1:55422`:

```sh
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55422/shopcity_profiles_local_20260929' npm run seed:local-reports-demo
```

The script refuses to run without the explicit opt-in and exact local host, port, and database name. It also refuses to seed if any report summary or materialization-state rows already exist. It writes 30 days of deterministic-shaped, synthetic, branch-scoped read-model rows referencing the existing local cashier and customers. It does **not** create or alter customers, cards, receipts, ledger entries, redemptions, or other source-of-truth financial records. This fixture is not evidence of real branch activity and must not be copied to a shared environment.

The supervisor report read models are now populated independently of source transactions. Do not run report rematerialization for this demo: a refresh from the currently empty receipt/ledger sources will replace the synthetic summaries with empty/zero-valued results. The script is intentionally not a cleanup/reset command and will refuse a second run rather than overwrite report data.
