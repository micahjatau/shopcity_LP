## 1. Verify authentication and migration preconditions

- [x] 1.1 Confirm the protected replacement DB credential with direct `psql -W` using the specified host, port, username, database, and `sslmode=require`; do not print or pass the credential in argv.
- [x] 1.2 Confirm read-only PrismaService connectivity using the Preview runtime URL and `VERCEL=1`; record the actual runtime role and required trigger-function privileges.
- [x] 1.3 Verify `prisma migrate status` has only the helper migration pending, and capture the guarded financial, scheduler, and pending-SMS baseline.

## 2. Apply the forward-only helper migration

- [x] 2.1 Apply only `20261126130000_restore_credit_lot_expiry_derivation_helper` via Prisma `migrate deploy` to Preview; do not modify applied history or use `supabase db push`.
- [x] 2.2 Verify migration checksum/status, helper existence/immutability/`EXECUTE`, and leap-day/month-clamp behavior.
- [x] 2.3 Confirm the due lot remains 10,000 kobo, expiry evidence/debits remain zero, 28 pending SMS events are unchanged, job 2 stays inactive, and the existing six schedules remain active.
- [x] 2.4 Record the Operations backup/restore/PITR waiver accurately; do not claim backup or restore evidence.

## 3. Use the original configured Preview branch and isolate deployment

- [x] 3.1 Confirm remote `release/preview-workerless-2026-11-24` at `944976546e67c71366091929859541c03950550b` is an ancestor of reviewed release `a6b1a3ff1ffb5bd1162274e40991a06bf6bba879`; verify that target is the current PR #54 head with successful CI/security workflows.
- [x] 3.2 Confirm the original branch has 14 Preview variables, including POS HMAC and scheduler secret names, using metadata only; do not retrieve or alter their values.
- [x] 3.3 Establish a Preview-only Vercel deployment exclusion for the four non-API projects. The project-specific ignored-build command skips only the original release branch; system environment variables are exposed, and the reviewed repository config does not override the setting.
- [x] 3.4 Recheck original branch metadata, then update only its sensitive `DATABASE_URL` from the protected rotated candidate with `sslmode=require`; preserve the other 13 variables exactly. Post-update metadata confirms the same 14 variable names.
- [x] 3.5 Fast-forward the original branch with a normal non-force push only after 3.3–3.4 pass; verify only `shopcity-api` receives the Preview deployment.
- [x] 3.6 Verify deployment identity, database/Redis readiness, POS authentication, scheduler endpoint, disabled SMS, stable alias, and no unintended project deployments.

## 4. Run one authorized F1 recertification and regressions

- [x] 4.1 Keep Cron job 2 inactive and perform exactly one authorized F1 invocation after deployment verification; do not retry on failure.
- [x] 4.2 Verify exactly one 10,000-kobo expiry debit, expiry record, and audit record; lot balance zero; ledger net and remaining lots reconciled; no duplicate evidence.
- [x] 4.3 Run the authorized earn and redemption regression checks without sending/replaying SMS or changing unrelated balances.
- [x] 4.4 Confirm the 28 pending SMS events remain untouched and all financial/scheduler invariants pass.

## 5. Guardedly restore Cron

- [x] 5.1 Only after 4.1–4.4 pass, reactivate only Preview Cron job 2 at its certified schedule.
- [x] 5.2 Verify the complete job inventory: six existing schedules preserved, job 2 active only after gates, F6 absent, F10 remains the exclusive composite outbox owner, and no independent F3/F4/F5 schedules.
- [x] 5.3 Publish a Preview closeout with the seven-job inventory and scheduler GO, separate still-open cashier/POS acceptance, and accurate Production, PR-merge, SMS, security-backlog, and backup/restore boundaries.
