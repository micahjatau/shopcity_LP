## Why

Preview's single authorized credit-expiry run failed because enabled `CreditLot` lifecycle triggers call the absent `public.derive_credit_lot_expires_at(timestamp without time zone)` helper. A forward-only migration has restored the canonical helper. Preserve the existing POS device-token HMAC secret by deploying through the original configured release branch rather than retrieving or rotating that secret.

## What Changes

- Apply and verify only the forward-only helper migration; preserve applied migration history and all financial rows.
- Preserve all original Preview branch variables except updating `DATABASE_URL` with the protected rotated credential.
- Fast-forward the original release branch to the reviewed corrective commit only after confirming deployment isolation; deploy only the `shopcity-api` project, then perform exactly one authorized post-repair F1 invocation.
- Verify expiry financial invariants and earn/redemption regressions before guarded Cron restoration.

## Guardrails

- Preview only; no Production access, PR merge, secret retrieval/rotation, force-push, or stable-alias retarget until the accepted deployment is verified.
- Do not update the original branch or deploy while a push could trigger unrelated Vercel projects.
- Never retry a failed F1 request. Keep job 2 inactive until the single post-repair invocation and all financial/regression checks pass.
- Keep SMS disabled and preserve all 28 pending events. Preserve active F0/F2/F7/F8/F9/F10 schedules, keep F6 absent and F10 the exclusive composite outbox owner, and do not independently schedule F3/F4/F5.
- Do not manually alter unrelated balances or financial history; only the one authorized F1 expiry may post its expected debit. Do not edit applied migrations, use `supabase db push`, start BullMQ, or rotate credentials again.
- Operations waived backup, restore-rehearsal, and PITR gates for this Preview-only remediation; no such evidence is claimed.

## Current Status

Both forward-only migrations are applied once and verified on Preview; Prisma migration status is up to date. Only the original API branch's `DATABASE_URL` was updated from the protected rotated candidate; its existing POS HMAC and scheduler secrets were not retrieved or changed. Four authorized non-target Vercel projects have the exact original-branch exclusion; the reviewed release deployed through `shopcity-api`. The one authorized F1 request completed, financial and regression checks passed, and only Cron job 2 was restored after the gates. The final seven-job inventory, 28-event SMS preservation, waived recovery gates, and unavailable Supabase Management API diagnostics are recorded in the closeout evidence. **Scheduler certification is PREVIEW GO; cashier/POS application acceptance remains OPEN and was not performed.** PR #54 remains open and unmerged; Production is unchanged.

## Impact

- Prisma: `prisma/migrations/20261126130000_restore_credit_lot_expiry_derivation_helper/migration.sql`.
- Runtime: reviewed diagnostics in `src/modules/credit-expiry/credit-expiry.service.ts`.
- Original Preview release branch environment and guarded scheduled-job execution; only `shopcity-api` may deploy after Vercel isolation is established.
- No Production, SMS, or unrelated application scope.
