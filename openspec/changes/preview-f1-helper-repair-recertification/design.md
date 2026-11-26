## Context

The post-reconciliation F1 failure was traced to enabled `CreditLot` triggers calling a missing date-derivation helper. The canonical implementation already exists in applied migration `20260725_sprint_2_financial_integrity_lifecycle_closure`; the repair restores that implementation in a new forward-only migration. The diagnostic code records sanitized failure-only transaction stages and rethrows the original error unchanged.

## Decisions

1. **Restore only the missing helper.** Use `CREATE OR REPLACE FUNCTION` with the canonical immutable year-plus-one/month-clamp formula. Do not modify or replay applied migrations, change expiry posting semantics, or alter balances.
2. **Use the established Prisma migration chain.** Apply only the pending helper migration with `prisma migrate deploy` to the verified Preview target. Do not use `supabase db push`.
3. **Verify through the actual runtime URL and role.** Direct psql and `PrismaService` connectivity have passed with the refreshed protected credential. Verify function existence/immutability/`EXECUTE`, migration checksum, and unchanged financial/SMS baselines.
4. **Keep scheduling guarded.** Job 2 remains inactive while the original release branch deployment is isolated, updated, deployed, and checked. Do not invoke F1 until deployment identity, readiness, SMS-disabled state, and financial baseline are confirmed.
5. **Preserve shared configuration.** Use the local Preview database URL and protected Preview/Vault values; keep global Preview Redis/KV configuration unchanged. Sensitive Vercel values are not printed or copied from redacted `[SENSITIVE]` placeholders.
6. **Reuse the original branch's existing POS key without retrieving it.** Confirm the variable exists by metadata only; do not pull, print, copy, rotate, or overwrite its value. Preserve every original branch variable except the authorized `DATABASE_URL` refresh.
7. **Use one post-repair F1 request.** If it fails, stop and do not retry. Restore job 2 only after expiry and earn/redemption checks pass.

## Residual status at closeout

- **Deployment-isolation gate: closed for the original release.** The four authorized non-target projects have the exact-branch Ignored Build Step; the `shopcity-api` deployment succeeded. The exclusions preserve other branches and Production. Do not reopen or alter these settings for the documentation follow-up.
- **Cashier/POS application acceptance: open.** No signed cashier session or transaction was attempted. A bounded, non-mutating device-bound login/read-only card-lookup plan is recorded in `docs/release-evidence/preview-cashier-pos-nonmutating-acceptance-plan-2026-11-26.md`; it is not executed by scheduler certification.
- Supabase Management API logs/network-restriction queries returned HTTP 401 with the available CLI token. No hosted auth-log or allowlist evidence is claimed.
- Backup/restore/PITR evidence is not available; the Operations owner waived those gates for this Preview-only change. No recovery evidence is claimed.
- The broader Semgrep cleanup, production logging review, and scanner production-load exercise remain in the separate `docs/release-evidence/review-68-residual-risks.md` tracker; scheduler GO does not close them.

## Rollback and Recovery

The helper migration is forward-only and preserves financial rows. If the application deployment is unhealthy, leave job 2 inactive and keep the stable alias on the prior deployment. Do not revert the migration by editing history or deleting the helper; correct the deployment/configuration in a forward-only change. Keep SMS disabled and preserve the 28 pending events.
