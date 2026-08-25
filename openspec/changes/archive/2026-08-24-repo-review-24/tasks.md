## 1. Hardening Gate And Tracker Truth

- [ ] 1.1 Reopen the remaining repo-review-24 tracker items and record the Sprint 3B exit gates that must pass before reversal or manual-adjustment work resumes.
- [ ] 1.2 Confirm the current-head evidence checklist covers runtime HTTP status, SMS payload rendering, migration deploy history, backup/restore evidence, and release-gate verification.

## 2. Redemption Response Truthfulness

- [ ] 2.1 Restore runtime HTTP `202` for pending redemption responses and keep HTTP `201` for immediate confirmations.
- [ ] 2.2 Add an HTTP integration test that exercises both pending and immediate redemption flows and asserts the returned status codes.

## 3. SMS Payload Hardening

- [ ] 3.1 Add one shared typed builder for `redemption-confirmed` SMS payloads used by immediate redemption and approval execution.
- [ ] 3.2 Validate the built payload before provider selection so deterministic, sandbox, and real providers enforce the same schema.
- [ ] 3.3 Add an integration test that renders a real committed redemption payload and verifies `redeemedKobo` and `remainingBalanceKobo` are present.

## 4. API Contract And Read Truth

- [ ] 4.1 Tighten transaction-read responses so redemption approval outcomes are represented truthfully instead of being flattened into earn-shaped data.
- [ ] 4.2 Keep the public reversal boundary truthful until real reversal execution exists, including OpenAPI and runtime parity.

## 5. Migration Safety And Evidence

- [ ] 5.1 Reconcile shared-environment migration history with deployable Prisma migration evidence instead of relying on schema shape alone.
- [ ] 5.2 Record backup/restore or forward-fix rehearsal evidence in `docs/database/migration-tracker.md` for the remaining shared migration risk.

## 6. Verification And Release Evidence

- [ ] 6.1 Run the targeted build, lint, OpenAPI, unit, e2e, integration, client, and Bruno checks affected by the change.
- [ ] 6.2 Record current-head release evidence for the Sprint 3B hardening gate once the runtime, SMS, and migration blockers are cleared.
