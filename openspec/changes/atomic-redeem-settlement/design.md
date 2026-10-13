## Context

See `proposal.md` and the delta specs for product requirements. Today `RedemptionsService` and the REDEEM branch of `LoyaltyService.decideRedemptionApproval` independently create the debit and notification; both run in serializable transactions. `LoyaltyService` owns the configured integer-kobo Earn formula and approval policy checks. Receipt uniqueness remains enforced by `Receipt`; `LoyaltyLedgerEntry.receiptId` is currently globally unique. Cashier activity is receipt-bounded and currently chooses one effect for each receipt.

## Goals / Non-Goals

**Goals:**

- Make immediate and approved redemptions call one settlement implementation so debit, FIFO allocations, Earn, credit lot, closing balance, and notification have the same transaction order.
- Preserve existing Earn calculation, redemption authorization, FIFO, receipt scope, approval, idempotency, and append-only ledger invariants.
- Make old pending approvals and queued SMS records safe across rollout.

**Non-Goals:**

- Backfill Earn entries for historic confirmed redemptions.
- Change the standalone Earn endpoint or offline Earn behavior.
- Implement grouped settlement reversal; single-leg reversal will fail closed until that contract exists.
- Push or apply a migration to a shared or remote database.

## Decisions

1. **Use one redemption settlement service for both confirmation paths.** Add a provider in the Redemptions module that accepts the current Prisma transaction client and validated settlement context. `RedemptionsService.redeem` calls it for immediate confirmation; `LoyaltyService.decideRedemptionApproval` calls it only after an authorized approval has passed current-policy checks. The Loyalty module may import the Redemptions module because the Redemptions module does not depend on Loyalty, keeping the module graph acyclic. This avoids two independent implementations of the accounting order.

2. **Allocate old credit before creating the new Earn lot.** Inside the existing serializable transaction, create/link the redemption debit, allocate it using the current FIFO allocator, calculate `netPaidAmountKobo = basketAmountKobo - confirmedRedemptionKobo`, then create one EARN ledger entry and lot when the integer formula produces a positive amount. Calculate the closing balance only after both effects. Zero Earn is represented as `earnedKobo: 0` with no zero-value ledger or lot.

3. **Share the exact integer Earn arithmetic, not the Earn workflow.** Extract the pure `ceil(paidKobo * rateBps / 10_000)` arithmetic into a small shared helper used by the existing Earn wrapper and settlement. Keep Earn's validation, approval, response, and offline callers unchanged. Settlement policy evaluation uses the same branch/default rate and Earn approval/flag thresholds. A pending settlement is required if either redemption policy or the existing basket-level Earn purchase policy requires approval.

4. **Version the combined settlement policy without stranding existing pending requests.** New pending redemptions persist a version that covers redemption policy plus the Earn policy values used for the net-paid amount. Approval recomputes and checks that version before any financial write. Pre-deployment pending redemptions retain their legacy redemption-policy version format; the approval path accepts that legacy format using its existing redemption-policy recheck, then applies the current Earn policy at execution. Any existing idempotency replay returns its stored response and never retroactively adds an Earn.

5. **Replace global ledger receipt uniqueness with precise typed uniqueness.** Remove Prisma's unique annotation from ledger `receiptId`, add a normal tenant/receipt index for lookups, and create SQL partial unique indexes for one EARN and one REDEEM entry per non-null `(tenantId, receiptId)`. Keep the physical Receipt composite unique constraint and all other ledger constraints. Update code that currently uses `findUnique(receiptId)` to query the correct typed ledger entry.

6. **Keep cashier activity one row per bounded receipt.** Extend each receipt projection with separate redeemed and earned integer amounts, and include all receipt ledger effects in transaction detail. Continue enforcing the existing maximum of ten cashier receipts; do not split a settlement into duplicate receipt rows or broaden cashier scope.

7. **Extend the existing redemption notification compatibly.** New confirmation paths build one redemption-settlement payload with redeemed, net-paid, earned, and closing-balance amounts. The renderer accepts legacy payloads already queued before deployment and retains the prior message for those records. Do not enqueue the separate Earn-confirmed template for a settlement.

8. **Guard individual reversal of paired settlement effects.** Before creating any reversal rows, detect another EARN/REDEEM effect on the same receipt. Return `REVERSAL_REVIEW_REQUIRED` and roll back the request rather than reversing one leg and leaving the other silently active. Ordinary single-effect Earn and Redeem reversals keep their existing behavior.

## Risks / Trade-offs

- **[Risk] Concurrent redemptions contend for old credit lots or the receipt key** → keep the existing serializable isolation and bounded retry/replay path; integration-test same-key and conflicting-key cases.
- **[Risk] A branch policy changes while approval is pending** → include the Earn and redemption policy versions in new settlement approvals and reject stale policy before execution; preserve legacy pending policy handling.
- **[Risk] Old code assumes one ledger row per receipt** → regenerate Prisma/OpenAPI clients, update all `findUnique(receiptId)` lookups and read models, and document that rollback after paired settlements requires a forward fix rather than restoring the old global index.
- **[Risk] Pending or retried legacy records have no settlement Earn fields** → do not backfill or infer financial effects; replay stored responses, render legacy SMS, and show unavailable fields for old records.
- **[Risk] Reversal remains unavailable for paired settlements** → fail closed with manual-review error until an append-only grouped reversal design is approved.

## Migration Plan

1. Add a forward-only Prisma migration that drops the old ledger receipt unique index, creates the non-unique lookup index and typed partial unique indexes, and preserves the Receipt composite unique constraint. Include a preflight duplicate check and record the migration in `docs/database/migration-tracker.md`.
2. Verify schema generation and the migration on a clean Testcontainers database, including a database test proving same-receipt EARN+REDEEM succeeds while duplicate same-type entries fail. Do not apply it to the linked/remote Supabase project.
3. Deploy the migration and backend/API/frontend as one coordinated release. Existing pending approvals, stored idempotency responses, and queued SMS payloads remain compatible.
4. If the new code must be rolled back before any paired settlement is written, the prior app may be redeployed without reversing the migration. After paired effects exist, do not restore the global unique index or roll back the old application; use a forward fix because the old app assumes one ledger effect per receipt.

## Open Questions

None. Grouped reversal is intentionally deferred and the fail-closed behavior is specified.
