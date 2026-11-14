## 1. Contract and navigation

- [x] 1.1 Add an Admin-only tenant-scoped active virtual-card metric endpoint and service tests.
- [x] 1.2 Regenerate OpenAPI and generated client; add controller authorization/delegation coverage.
- [x] 1.3 Use context-appropriate Admin sidebar glyphs and add navigation mapping tests; keep route aliases and role visibility unchanged.

## 2. Overview integration

- [x] 2.1 Add independently validated active-card request/state and render the real count or unavailable state.
- [x] 2.2 Add focused tests for envelope parsing, valid zero, loading/error/cooldown/retry, and no fabricated fallback.
- [x] 2.3 Preserve report chart gaps, materialization freshness, and cumulative registration semantics; document data population verification.

## 3. Verification

- [x] 3.1 Run focused backend and web tests, typechecks, OpenAPI/client checks, formatting, and strict OpenSpec validation.
- [x] 3.2 Review the final diff and GitNexus changes for tenant authorization, role navigation, and unrelated dirty-worktree changes.
- [ ] 3.3 Verify current tenant report rows/materialization timestamps without changing cron-job.org configuration or credentials. Recent Vercel logs show 12 scheduled HTTP 200 responses and one 401 from this session's manual probe; direct aggregate Prisma access could not initialize in this environment, so row-level production data remains unverified.
