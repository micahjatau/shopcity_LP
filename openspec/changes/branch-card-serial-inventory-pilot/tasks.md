## 1. Confirm one-branch pilot inputs

- [ ] 1.1 Confirm the actual pilot branch and trusted branch-resolution rule for registration and replacement.
- [ ] 1.2 Approve version-1 serial profile fields and exact barcode/printer/scanner contract before generating real serials.
- [ ] 1.3 Confirm initial batch quantity, print/encoding manifest procedure, receipt verification, and reservation timeout policy.

## 2. Add versioned format and branch stock

- [ ] 2.1 Preflight existing serials and cross-branch/tenant collisions; document compatibility with `normalizeCardSerial` and its existing migration assumptions.
- [ ] 2.2 Add additive Prisma profile, batch, sequence, and branch-stock models with tenant uniqueness, allocation ordering, lifecycle constraints, and audit provenance.
- [ ] 2.3 Add authorized profile/batch generation and physical receipt verification for the pilot branch; generated-but-unverified items cannot be issued.

## 3. Allocate serials automatically

- [ ] 3.1 Update customer registration to claim branch stock atomically; remove client-supplied initial serial and return the assigned barcode payload.
- [ ] 3.2 Update card assignment/replacement to consume branch stock, preserve old Card history, and keep idempotency/audit/outbox behavior.
- [ ] 3.3 Add safe reservation expiry for unissued items only; block/quarantine uncertain or reported physical stock and never recycle issued serials.
- [ ] 3.4 Update Supervisor registration/replacement UI to show server-assigned serials only after success and report no-stock/verification errors clearly.

## 4. Verify and pilot

- [ ] 4.1 Add concurrency, rollback, idempotency, profile-version, branch-isolation, FIFO, no-stock, replacement-history, reservation-expiry, and serial-validation regression tests.
- [ ] 4.2 Run relevant backend/web suites, lint, typecheck, Semgrep, OpenAPI/client generation, migration checks, and affected Playwright workflows.
- [ ] 4.3 Apply the additive migration only after backup/restore verification; generate and physically reconcile a small batch for the selected branch before enabling registration.
- [ ] 4.4 Verify serial stock reconciliation and rollback procedure; do not enable other branches until pilot evidence is accepted.
