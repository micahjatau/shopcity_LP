## 1. Auth and Session Hardening

- [ ] 1.1 Add replay-resistant attestation tracking for device login.
- [ ] 1.2 Re-check device and branch eligibility during session refresh and auth-context resolution.
- [ ] 1.3 Add tests covering device revocation, refresh rejection, and attestation replay.

## 2. Loyalty Read Model

- [ ] 2.1 Update scoped loyalty ledger queries so authorized receiptless adjustment and reversal rows are visible.
- [ ] 2.2 Keep tenant and branch authorization explicit while broadening the read model.
- [ ] 2.3 Add tests for branch-scoped reads that include receiptless rows.

## 3. Migration Evidence And Docs

- [ ] 3.1 Fix the migration tracker so it records each applied migration once and includes the missing follow-up migration.
- [ ] 3.2 Refresh the OpenAPI error examples so they match the runtime response envelope and codes.
- [ ] 3.3 Expand formatting coverage to tracked nested docs and contract artifacts.

## 4. SMS Payload Validation

- [ ] 4.1 Validate earn-confirmed payloads before rendering.
- [ ] 4.2 Keep redemption-confirmed payload validation strict and shared across worker paths.
- [ ] 4.3 Add tests for malformed outbox payloads and validation failures.

## 5. Verification

- [ ] 5.1 Run the targeted unit/integration tests for auth, loyalty, SMS, and docs changes.
- [ ] 5.2 Run the repo contract checks affected by the change.
- [ ] 5.3 Confirm the change is apply-ready and the artifact status is complete.
