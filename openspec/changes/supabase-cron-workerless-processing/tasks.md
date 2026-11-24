## Phase 1 — Specify and inventory

- [x] 1.1 Record current scheduler owners and existing workerless risks.
- [x] 1.2 Define F0–F10, protected dispatch, durable evidence, safety invariants, and explicit Production stop gate.
- [ ] 1.3 Reconcile the proposed F0–F10 mapping with the authoritative operations brief and obtain owner/cadence approval. A source-default-based UTC proposal and the read-only Preview Cron inventory (zero jobs) are recorded in the runbook; timezone and operational owner sign-off remain pending.

## Phase 2 — Local additive implementation

- [x] 2.1 Add durable scheduled-job invocation records and lease/idempotency support with non-destructive Prisma/Supabase migrations. The additive migration and RLS/no-policy assertion pass on disposable Testcontainers PostgreSQL; shared upgrade/backup validation remains gated.
- [x] 2.2 Add a guarded POST internal scheduler controller using an environment-specific scheduler secret; test missing, malformed, invalid, and wrong-environment credentials.
- [x] 2.3 Add bounded handlers for approval expiry, credit expiry, and reminder enqueue using existing services and domain safeguards.
- [x] 2.4 Extend PostgreSQL outbox claims for SMS, fraud, and report refresh with `FOR UPDATE SKIP LOCKED`, bounded retries, idempotent completion, per-event batch caps, and legacy status compatibility. Local F3/F4/F5 and composite F10 domain runs passed; no overlapping Cron owner was enabled, and the temporary Cron job was removed.
- [x] 2.5 Add SMS DLR polling without sending messages; prove SMS intent processing cannot bypass existing consent/suppression/CAS/provider behavior locally. Preview non-sending proof remains pending.
- [x] 2.6 Add bounded/fair report materialization with a persisted cursor and failure-safe advancement; retain tenant-level lock and current transaction limits. Testcontainers verifies cursor serialization, failed-tenant evidence, and no cursor advancement. F7 now uses a 420-second token-fenced cursor lease; its tenant rebuild transaction has a 10-second max wait and 30-second timeout.
- [x] 2.9 Implement and test configurable F7 per-request execution deadline (default 240 seconds, maximum 240 seconds), with safe early stop, unchanged cursor on incomplete work, and later cursor continuation. Preserve the 420-second lease, 600-second stale-run recovery, and 30-second transaction timeout. Focused tests cover preflight stop, deadline expiry without cursor advancement, and retrying the same tenant; runtime-plan verification remains a Preview gate.
- [x] 2.7 Add pilot operations snapshot and retention handlers with existing cadence/retention semantics and explicit bounded progress. Local F8 captured one snapshot and F9 pruned one stale snapshot.
- [ ] 2.8 Add Supabase Cron/Vault setup and rollback scripts that require explicit Preview project identity and are never automatically applied remotely.

## Phase 3 — Validation and documentation

- [ ] 3.1 Complete isolated unit tests per handler, including claims, replay, retries, timeout ambiguity, and batch caps. The F0–F10 controller/service dispatch matrix, terminal idempotency, retry exhaustion, and 30-second report-transaction bound pass; remaining per-flow domain invariants and provider-timeout ambiguity coverage are still required.
- [ ] 3.2 Complete Testcontainers coverage for per-tenant fairness, event-type isolation, financial idempotency, and SMS isolation. The 2026-11-23 rerun passes duplicate invocation, stale RUNNING recovery, expired cursor-lease recovery, persisted retry exhaustion, and two-tenant event-to-handler isolation.
- [ ] 3.3 Update architecture/ADR, migration tracker, schedule inventory, Preview validation report, alerting, deployment, and rollback runbooks. The proposed UTC owner/cadence matrix and Preview stop gate are documented; Operations approval, cadence approval, and Preview legacy-owner verification remain pending.
- [x] 3.4 Run build, lint, typecheck, focused and full integration tests, formatting/lint, migration validation, OpenSpec validation, and GitNexus change detection. GitNexus reported a HIGH aggregate scope; affected flows were reviewed and are recorded in the impact tracker.
- [ ] 3.5 Certify F0–F10 locally with isolated controlled fixtures and real domain-state checks, including financial reconciliation, outbox processing, report materialization/history/retention, fraud evaluation, and SMS cutoff/disabled-provider non-sending. F0–F10 domain effects and reconciliation passed on 2026-11-24; Admin `/admin/operations` and Supervisor `/supervisor/reports` browser workflows passed. Cashier login and page-context `/auth/me` succeeded; the separate Playwright `page.request` 401 was traced to omission of the required domain-scoped `__Host-shopcity_pos_device` cookie for the active `DEVICE_TOKEN`-bound session. No auth code was weakened or login throttling bypassed. Cashier lookup, earn, redemption, and financial reconciliation remain unverified, so local browser certification stays incomplete.
- [x] 3.6 Configure and exercise local Supabase pg_cron → pg_net → authenticated API dispatch; record local Cron inventory/results, API and frontend URLs, invocation/duration evidence, and whether asynchronous pg_net completion can be proven. A temporary local F6 dispatch returned HTTP 201 with a completed API result. A single test-owned F8 Cron job (`workerless-local-cert-once`, job ID 3) ran once, returned HTTP 201, and produced a completed F8 run that captured one tenant snapshot. The exact job ID/name and its matching temporary Vault secret were removed; active local Cron and matching secret counts returned to zero. This was a one-off local certification schedule, not a persistent approved cadence. F10 remains the sole tested composite outbox owner; no SMS provider call or SMS schedule ran.

## Phase 4 — Preview-only gate (not executable until access is restored)

- [ ] 4.1 Verify Preview-only Supabase project ref and Vercel project/environment/tier without exposing credentials. Read-only metadata identified the exact Preview ref, Hobby plan, Fluid Compute, and active Production Vercel Cron; a later pg_dump parser error exposed a credential fragment, so rotate that credential before further Preview DB access.
- [ ] 4.2 Apply additive migration and schedules to Preview only after environment assertion and explicit approval.
- [ ] 4.3 Keep SMS provider non-sending; verify no message is sent and no historical SMS becomes eligible.
- [ ] 4.4 Collect at least one complete schedule cycle, duplicate/concurrency/recovery evidence, report freshness/cursor progress, and `pg_net` vs Nest completion evidence.
- [ ] 4.5 Publish a detailed Preview validation report with unverified checks and unresolved risks.

## Production stop gate

- [ ] 5.1 Obtain a separately approved Production cutover plan, owner sign-off, schedule inventory, rollback/drain procedure, and SMS provider idempotency/reconciliation proof.
- [ ] 5.2 Stop here. No Production config/schema/job execution changes are authorized in this change.
