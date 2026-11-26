## 1. Inventory and forward-only migration

- [x] 1.1 Record the full canonical Prisma versus Preview financial object diff and the separate Supabase migration-history overlap.
- [x] 1.2 Add an idempotent, transaction-safe Prisma reconciliation for the reviewed missing financial functions, triggers, and CHECK constraints; preserve Preview composite FKs, indexes, RLS, and all rows.
- [x] 1.3 Add a read-only preflight report for existing amount, state, lot-balance, ledger/evidence, allocation/restoration, expiry, and audit-actor invariants.
- [x] 1.4 Update the migration tracker with the proposed migration, explicitly marked prepared/not applied and requiring Preview authorization/backup evidence.

## 2. Regression and local verification

- [x] 2.1 Reproduce the captured Preview failure and transaction rollback on disposable PostgreSQL 17.6 using synthetic data only.
- [x] 2.2 Apply the candidate migration to a drifted disposable clone; verify one successful expiry debit/record/audit, exact lot and ledger reconciliation, and duplicate-invocation prevention.
- [x] 2.3 Verify financial checks, immutability, deferred allocation/restoration/expiry invariants, and tenant-composite foreign keys; verify migration reapplication is safe.
- [ ] 2.4 Run focused integration tests, Prisma validation, lint, typecheck, build, Semgrep, OpenSpec validation, GitNexus change detection, and CI.

## 3. Preview-only remediation gates

- [ ] 3.1 Obtain independent review of the migration and a fresh guarded read-only Preview preflight/backup plan; do not apply without separate explicit authorization.
- [ ] 3.2 After authorization only, apply to Preview through the Prisma migration path and independently verify the complete function/trigger/constraint/FK/RLS inventory and unchanged financial baseline.
- [ ] 3.3 Keep F1 inactive until the Preview schema, external scheduler ownership, and accountable Operations-owner gates pass; then request separate authorization for the single F1 run and final Preview GO/NO-GO.
- [ ] 3.4 Do not change Production, SMS, Cron IDs/cadences, F6, or independently schedule F3/F4/F5.
