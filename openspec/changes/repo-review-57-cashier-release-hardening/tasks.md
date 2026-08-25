## 1. Contracts and policy

- [x] 1.1 Inventory cashier lookup/customer DTOs, domain error codes, session roles, device states, retry-sensitive mutations, and release evidence inputs.
- [x] 1.2 Update card/customer lookup contracts with masked phone, staff/earning eligibility, and eligibility reason; regenerate OpenAPI/Orval artifacts.
- [x] 1.3 Decide and document idempotency coverage for retry-sensitive mutations.
- [x] 1.5 Enforce the idempotency contract for card creation, including required-key validation, replay storage, and request-hash scoping.
- [ ] 1.6 Extend the idempotency contract to card replacement/status, device lifecycle, approval, and remaining retry-sensitive mutations; add validation/replay/conflict tests.
- [x] 1.4 Define role-specific inactivity windows, configuration names, session-expiry error contract, and provisioning migration policy.

## 2. Cashier workflow compliance

- [x] 2.1 Add scanner/search-first quick lookup to `/cashier` without embedding Earn or Redeem forms.
- [x] 2.2 Render masked phone, card status, staff flag, earning eligibility, reason, and available balance in cashier verification views.
- [x] 2.3 Require receipt number and positive purchase amount before Earn submission.
- [x] 2.4 Align the frontend Earn preview with backend ceiling rounding and label it advisory.
- [x] 2.5 Map duplicate, inactive, staff, approval, insufficient-balance, and offline/network outcomes to actionable cashier messages.
- [x] 2.6 Add role-safe masked projections to cashier customer detail and regression coverage for PII minimization.

## 3. Session and POS security

- [x] 3.1 Enforce role-aware inactivity rejection/revocation during backend session resolution while retaining absolute expiry.
- [x] 3.2 Add frontend idle-expiry handling that returns users to a session-required state without becoming the enforcement boundary.
- [x] 3.3 Implement administrator-controlled POS enrollment, activation, branch binding, revocation, and audit visibility.
- [x] 3.4 Remove cashier-managed raw attestation-secret persistence and provide an explicit migration path for existing devices.
- [x] 3.5 Add auth, device-attestation, branch-ownership, and protected-route regression tests.

## 4. Configuration and browser security

- [x] 4.1 Resolve authenticated operational configuration from validated session tenant/branch context through the protected operational config endpoint and authenticated frontend bootstrap.
- [x] 4.2 Add bounded server/HTTP public-configuration caching with stale behavior that cannot override authorization scope.
- [x] 4.3 Add the documented strict frontend CSP and build-time security-header configuration.
- [x] 4.4 Verify CSP and required security headers through browser/deployment checks.

## 5. Release evidence and performance

- [x] 5.1 Harden release verification to independently compare candidate, workflow head, successful conclusions, deployment artifact, and required gate SHAs.
- [ ] 5.2 Add exact-head evidence for protected-branch status, Frankfurt topology, and the intentional/unintentional status of the duplicate `shopcity` Vercel project.
- [ ] 5.3 Replace infrastructure-only probes with authenticated lookup, Earn-confirmed, Earn-pending, Redeem-confirmed, and supervisor report benchmarks.
- [ ] 5.4 Correct the performance harness to measure real client navigation/RSC behavior and retain raw reproducible artifacts.
- [ ] 5.5 Refresh stale topology and release documentation and reconcile OpenSpec status with the implemented candidate.

## 6. Verification and rollout

- [ ] 6.1 Run focused unit, contract, integration, frontend, accessibility, visual, and Playwright tests for affected workflows.
- [ ] 6.2 Run lint, typecheck, build, Semgrep, Prisma/schema validation, and applicable integration suites.
- [ ] 6.3 Verify migration/backup evidence for any schema changes and update `docs/database/migration-tracker.md`.
- [ ] 6.4 Provision or migrate pilot devices, verify protected branch settings, and execute the authenticated production benchmark.
- [ ] 6.5 Run GitNexus `detect_changes()` and review the final diff, residual risks, and release evidence before closure.
