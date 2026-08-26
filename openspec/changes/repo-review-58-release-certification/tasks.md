# Tasks: Repo review 58 release certification closure

## 1. Scope and contracts

- [ ] 1.1 Inventory the existing cashier lookup, transaction/activity, report, benchmark, release-evidence, device, migration, and branch-protection surfaces.
- [ ] 1.2 Confirm whether an existing scoped activity endpoint can support today’s transactions; define an additive contract if it cannot.
- [ ] 1.3 Define the evidence schema for candidate SHA, workflow/deployment/security hashes, topology, branch settings, benchmark results, device proof, and restore proof.
- [ ] 1.4 Define benchmark fixtures, authentication/device setup, sample sizes, business-day timezone, isolation, cleanup, and pending-approval outcome policy.

## 2. Cashier overview compliance

- [x] 2.1 Add a focused scanner/card-number input directly to `/cashier` with keyboard-wedge compatibility, manual entry, validation, loading, cancellation, and focus behavior.
- [x] 2.2 Connect the input to the authoritative lookup contract and render the existing role-safe customer projection.
- [x] 2.3 Carry verified card context to dedicated Earn and Redeem routes without trusting client balances, status, roles, or eligibility.
- [x] 2.4 Add the bounded backend-backed today-transaction summary, scoped by authenticated tenant/branch and configured business day.
- [ ] 2.5 Add responsive, accessible, offline, empty, loading, unauthorized, and error states.
- [ ] 2.6 Add unit, contract, integration, Playwright, accessibility, and visual coverage for scanner lookup and activity states.
- [x] 2.8 Scope cashier-today to the authenticated cashier, remove the stale activity placeholder, and add mobile activity layout coverage from Review 59.
- [x] 2.9 Add explicit cashier-today tests for scanner Enter/focus, successful activity rendering, redeem mapping, branch scope, cross-tenant mismatch, and timezone boundaries.
- [x] 2.10 Replace overloaded cashier-today `amountKobo` with operation-specific DTO fields; prohibit Earn fallback from loyalty credit to receipt purchase amount and represent unknown pending credit explicitly.
- [x] 2.11 Render unambiguous Earn (`+`) and Redeem (`−`) activity semantics, including accessible text and mobile/visual regression coverage.
- [x] 2.12 Regenerate OpenAPI/client artifacts and replace handwritten cashier-today fetch/shape validation with the generated reporting method and typed DTO.
- [x] 2.13 Add backend, contract, and frontend tests for confirmed Earn, pending Earn with an authoritative projection, pending Earn with no credit amount, Redeem, scope, and timezone boundaries.
- [x] 2.7 Regenerate OpenAPI and frontend client artifacts if the activity contract changes.

## 3. Authenticated benchmark implementation

- [ ] 3.1 Update the harness to provision/load authenticated cashier, supervisor, and device state safely.
- [ ] 3.2 Implement real client-navigation/RSC measurements for lookup, Earn confirmed, Earn pending approval, Redeem confirmed, and supervisor dashboard/report.
- [ ] 3.3 Record raw samples, P50/P90, optional P95, sample size, exact SHA, environment, topology, route/proxy, and outcome.
- [ ] 3.4 Validate thresholds: lookup <2s, Earn <3s, Redeem <3s, dashboard <5s; document the pending-approval threshold/outcome.
- [ ] 3.5 Add benchmark artifact schema validation and a reproducible local/staging dry run.

## 4. Exact-head release and security evidence

- [ ] 4.1 Freeze and record the release-candidate SHA.
- [ ] 4.2 Verify workflow head SHA, successful required conclusions, deployment artifact SHA, and verifier version match the candidate.
- [ ] 4.3 Run exact-SHA Gitleaks, CodeQL, Trivy, and ZAP evidence through a protected-master PR or explicit dispatch.
- [ ] 4.4 Query protected-master settings and verify the required `ci` context is a real merge-time gate.
- [ ] 4.5 Record Frankfurt frontend/backend/database topology and investigate/document all Vercel projects, including duplicate `shopcity` ownership and disposition.
- [ ] 4.6 Refresh stale release/topology documents and reconcile OpenSpec status with implementation.
- [ ] 4.7 Update PR #8 and/or the immutable evidence bundle with the exact current candidate SHA and exact-head CI/security/Vercel run identities; stale manually maintained run IDs are invalid evidence.

## 5. Pilot, migration, and recovery proof

- [ ] 5.1 Inventory pilot POS devices and provision or migrate them through the administrative lifecycle.
- [ ] 5.2 Verify branch binding, activation, attestation, rotation/revocation, and session invalidation without retaining raw secrets in artifacts.
- [ ] 5.3 Identify schema/migration impact and update `docs/database/migration-tracker.md`.
- [ ] 5.4 Execute and retain backup/restore or restore-drill evidence for affected data and operational configuration.
- [ ] 5.5 Execute the authenticated business benchmark using the provisioned pilot setup and reconcile test effects.

## 6. Final verification and release gate

- [ ] 6.1 Run format, lint, typecheck, build, unit/integration, frontend, accessibility, visual, OpenAPI/client, and applicable security checks.
- [ ] 6.2 Run OpenSpec validation and verify each acceptance criterion individually.
- [ ] 6.3 Run GitNexus `detect_changes()` and review affected symbols, flows, and residual risk.
- [ ] 6.4 Review the complete diff and working-tree status; preserve unrelated existing changes.
- [ ] 6.5 Assemble the exact-head evidence bundle and run its verifier.
- [ ] 6.6 Open/update the protected-master PR and confirm merge gates before pilot approval.
- [ ] 6.7 Do not certify release while any required financial-display, benchmark, security, topology, branch, device, migration, restore, or final-review artifact remains missing.
