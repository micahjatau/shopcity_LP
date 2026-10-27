# ShopCity LP Session Handoff — Customer Profile Credit Movements

Updated: 2026-10-21

## Repository state

- Repository: `/root/github-repos/micahjatau/shopcity_LP`
- Branch: `workflow-states-implementation`
- Latest commit: `4ee9dd2` — `fix(customer-profile): show credit movements`
- Commit was pushed to `origin/workflow-states-implementation`; local branch was synced with origin.
- Numerous unrelated worktree changes remain. Preserve them; do not reset, clean, or stage them without reviewing their scope.

## Completed

- Connected the shared customer-profile Transactions Credit cell to per-transaction credit movement for Supervisor and Cashier profiles.
- Supervisor profile projection returns transaction operation/status and confirmed earned/redeemed ledger amounts. Cashier profile uses the existing cashier-authorized `cashier-today` movement fields.
- Earned and redeemed movements display separately; combined settlements show both. Pending requests show “Awaiting approval” and are not represented as confirmed amounts. Current available balance is not substituted.
- Updated the relevant OpenSpec requirements/tasks and regenerated `docs/api/openapi.json` and `client/shopcity-client.ts`.
- No schema changes, ledger writes, deployments, or unrelated commits were made.

## Verification

- Focused customer service/controller Jest tests and customer-profile web tests passed.
- Root and web typechecks, targeted ESLint, OpenAPI lint, root and web builds, strict OpenSpec validation, Prettier, and `git diff --check` passed.
- The commit hook's ESLint and Prettier tasks passed.
- GitNexus staged change detection reported LOW risk and no affected processes.

## Useful context

- Local cashier email: `local.cashier@shopcity.test`. Use “Start local cashier test session”; no password/Auth identity is configured.
- `GET /loyalty/transactions/:id` `availableBalanceKobo` is recalculated from current active lots, not a historical balance after that transaction. The profile Credit column intentionally shows earned/redeemed movements instead.
- Existing unrelated dirty changes remain uncommitted. Stage narrowly for any follow-up work.
