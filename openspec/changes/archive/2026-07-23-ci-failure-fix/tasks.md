## 1. Fast Verification Gate

- [x] 1.1 Add a repo-local fast verification script that runs `format:check`, `lint`, and `typecheck` in sequence.
- [x] 1.2 Update any CI entrypoint or helper usage so the static gate calls the fast verification script instead of duplicating commands inline.

## 2. GitNexus Entry Point

- [x] 2.1 Restore or add the repository-owned `.gitnexus/run.cjs` entrypoint so the existing `gitnexus:analyze` and `proposal:impact` scripts work after `npm ci`.
- [x] 2.2 Add a clean-install smoke check for the GitNexus path so the command fails clearly if the repository-owned entrypoint is missing.

## 3. CI Workflow Hardening

- [x] 3.1 Create or update the main workflow under `.github/workflows/` to split static verification from slower integration work.
- [x] 3.2 Add workflow concurrency so superseded runs for the same branch or PR are canceled.
- [x] 3.3 Wire the static job to run the fast verification gate before any slower job starts.

## 4. Repository Guidance And Verification

- [x] 4.1 Correct `AGENTS.md` and `CLAUDE.md` so they describe `npm run lint` as a check-only command and `npm run lint:fix` as the fixer.
- [x] 4.2 Run the targeted formatting, lint, typecheck, and GitNexus smoke checks to confirm the change is ready for implementation.
